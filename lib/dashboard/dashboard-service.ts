import { Prisma } from "@prisma/client";
import { withTenantContext, type OrganizationContext, type TenantTransaction } from "../auth/organization-context";

export type DashboardConnectionSummary = {
  id: string;
  provider: string;
  product: string | null;
  status: string;
  accessMode: string;
  principal: string | null;
  selectedResourceCount: number;
  resourceCount: number;
  lastVerifiedAt: string | null;
  expiresAt: string | null;
  nextAction: string;
};

export type DashboardData = {
  organization: { id: string; name: string; role: string };
  onboarding: { status: "not_started" | "in_progress" | "submitted"; businessName: string | null; submittedAt: string | null };
  connections: DashboardConnectionSummary[];
  manualInvitations: Array<{ id: string; provider: string; status: string; expectedPrincipal: string; expiresAt: string | null; connectionId: string | null; verificationSource: string | null }>;
  verifiedResourceCount: number;
  nextActions: Array<{ title: string; owner: "you" | "MioDio"; href: string; priority: "high" | "normal" }>;
  security: { mfaRequired: boolean; aal: "aal1" | "aal2"; stepUpAvailable: boolean };
  recentActivity: Array<{ action: string; outcomeCode: string; createdAt: string }>;
};

export async function getDashboardData(context: OrganizationContext): Promise<DashboardData> {
  return withTenantContext(context, async (tx) => {
    const [connections, activity, onboarding, invitations] = await Promise.all([
      tx.connection.findMany({
        where: { organizationId: context.organizationId, archivedAt: null },
        include: { resources: { where: { archivedAt: null }, select: { selected: true, eligibility: true } }, healthChecks: { orderBy: { checkedAt: "desc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      tx.auditEvent.findMany({
        where: { organizationId: context.organizationId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { action: true, outcomeCode: true, createdAt: true },
      }),
      readOnboarding(tx, context.authSubject),
      tx.accessInvitation.findMany({ where: { organizationId: context.organizationId }, orderBy: { expiresAt: "asc" }, take: 20 }),
    ]);
    const summaries = connections.map((connection) => toSummary(connection));
    const verifiedResourceCount = connections.reduce((count, connection) => count + connection.resources.filter((resource) => resource.selected && resource.eligibility === "eligible").length, 0);
    return {
      organization: { id: context.organizationId, name: context.organizationName, role: context.role },
      onboarding,
      connections: summaries,
      manualInvitations: invitations.map((invitation) => ({ id: invitation.id, provider: invitation.provider, status: invitation.status, expectedPrincipal: invitation.expectedPrincipal, expiresAt: invitation.expiresAt?.toISOString() ?? null, connectionId: invitation.connectionId, verificationSource: invitation.verificationSource })),
      verifiedResourceCount,
      nextActions: buildNextActions(onboarding, summaries, invitations, context),
      security: { mfaRequired: context.assurance !== "aal2" && (context.role === "owner" || context.role === "administrator"), aal: context.assurance, stepUpAvailable: context.assurance === "aal2" },
      recentActivity: activity.map((event) => ({ action: event.action, outcomeCode: event.outcomeCode, createdAt: event.createdAt.toISOString() })),
    };
  });
}

async function readOnboarding(tx: TenantTransaction, authSubject: string): Promise<DashboardData["onboarding"]> {
  try {
    const submission = await tx.onboardingSubmission.findFirst({ where: { applicantId: authSubject }, orderBy: { submittedAt: "desc" }, select: { businessName: true, submittedAt: true, notificationStatus: true } });
    if (!submission) return { status: "not_started", businessName: null, submittedAt: null };
    return { status: submission.notificationStatus === "sent" ? "submitted" : "in_progress", businessName: submission.businessName, submittedAt: submission.submittedAt.toISOString() };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") return { status: "not_started", businessName: null, submittedAt: null };
    throw error;
  }
}

function toSummary(connection: {
  id: string;
  provider: string;
  product: string | null;
  status: string;
  accessMode: string;
  principal: string | null;
  lastVerifiedAt: Date | null;
  expiresAt: Date | null;
  resources: Array<{ selected: boolean; eligibility: string }>;
  healthChecks: Array<{ outcomeCode: string; remediationCode: string | null; checkedAt: Date }>;
}): DashboardConnectionSummary {
  const health = connection.healthChecks[0];
  const stale = health ? health.checkedAt.getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000 : false;
  const expired = Boolean(connection.expiresAt && connection.expiresAt.getTime() <= Date.now());
  return {
    id: connection.id,
    provider: connection.provider,
    product: connection.product,
    status: connection.status,
    accessMode: connection.accessMode,
    principal: connection.principal,
    selectedResourceCount: connection.resources.filter((resource) => resource.selected).length,
    resourceCount: connection.resources.length,
    lastVerifiedAt: connection.lastVerifiedAt?.toISOString() ?? null,
    expiresAt: connection.expiresAt?.toISOString() ?? null,
    nextAction: expired ? "Reconnect access" : health?.remediationCode ?? (stale ? "Run a fresh health check" : statusAction(connection.status)),
  };
}

function statusAction(status: string) {
  if (status === "active_read_only") return "No action needed";
  if (status === "expired") return "Reconnect access";
  if (status === "degraded") return "Review connection health";
  if (status === "revoked" || status === "archived") return "Connection inactive";
  return "Continue setup";
}

function buildNextActions(onboarding: DashboardData["onboarding"], connections: DashboardConnectionSummary[], invitations: Array<{ status: string }>, context: OrganizationContext) {
  const actions: DashboardData["nextActions"] = [];
  if (onboarding.status !== "submitted") actions.push({ title: "Finish your onboarding context", owner: "you", href: "/onboarding", priority: "high" });
  if (context.assurance !== "aal2" && (context.role === "owner" || context.role === "administrator")) actions.push({ title: "Set up MFA for connection actions", owner: "you", href: "/security/mfa", priority: "high" });
  const incomplete = connections.find((connection) => connection.status !== "active_read_only");
  if (incomplete) actions.push({ title: incomplete.nextAction, owner: "you", href: `/connections/${incomplete.id}`, priority: "normal" });
  const pendingInvitation = invitations.find((invitation) => !["verified", "revoked", "expired"].includes(invitation.status));
  if (pendingInvitation) actions.push({ title: "Track an access invitation or approved export", owner: "you", href: "/connections/manual", priority: "normal" });
  if (actions.length === 0) actions.push({ title: "Review your connected systems", owner: "you", href: "/connections", priority: "normal" });
  return actions.slice(0, 3);
}
