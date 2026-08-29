import { z } from "zod";
import { appendAuditEvent } from "../audit";
import { requireAal2, getAssuranceStatus } from "../auth/assurance";
import { withTenantContext, type OrganizationContext } from "../auth/organization-context";
import { connectionWorkspaceEnabled, findSecretPattern, providerAuthorizationEnabled, type ConnectionProvider } from "./contracts";
import { ConnectionServiceError, requireConnectionPermission } from "./service";
import { assertConnectionTransition } from "./state-machine";

const manualProviders = ["dubsado", "wordpress", "videoask", "organic_social", "asset_source"] as const;
const manualProviderSchema = z.enum(manualProviders);
const manualMethodSchema = z.enum(["provider_invitation", "approved_export", "manual_inventory", "client_owned_integration"]);
const verificationSourceSchema = z.enum(["provider_console", "operator_observation", "approved_export", "client_owned_integration"]);
type ManualMethod = z.infer<typeof manualMethodSchema>;
type VerificationSource = z.infer<typeof verificationSourceSchema>;

const verificationSourcesByMethod: Record<ManualMethod, readonly VerificationSource[]> = {
  provider_invitation: ["provider_console", "operator_observation"],
  approved_export: ["approved_export"],
  manual_inventory: ["provider_console", "operator_observation"],
  client_owned_integration: ["client_owned_integration"],
};

export function verificationSourceAllowed(method: string | null, source: VerificationSource) {
  if (!method) return false;
  const parsedMethod = manualMethodSchema.safeParse(method);
  return parsedMethod.success && verificationSourcesByMethod[parsedMethod.data].includes(source);
}

export const manualInvitationInputSchema = z.object({
  provider: manualProviderSchema,
  connectionId: z.string().uuid().optional(),
  expectedPrincipal: z.string().trim().min(1).max(200),
  externalAccountId: z.string().trim().max(200).optional(),
  instructions: z.string().trim().min(1).max(1200),
  method: manualMethodSchema,
  expiresAt: z.coerce.date().optional(),
}).superRefine((value, ctx) => {
  if (value.provider === "dubsado" && value.method !== "approved_export" && value.method !== "client_owned_integration") ctx.addIssue({ code: "custom", path: ["method"], message: "Dubsado requires an approved export or client-owned integration." });
  const finding = findSecretPattern([value.expectedPrincipal, value.externalAccountId, value.instructions].filter(Boolean).join("\n"));
  if (finding) ctx.addIssue({ code: "custom", path: ["instructions"], message: `Do not submit ${finding} or other platform credentials.` });
});

export const manualVerificationSchema = z.object({
  verificationSource: verificationSourceSchema,
  sourceDate: z.coerce.date(),
}).strict().superRefine((value, ctx) => {
  if (value.sourceDate.getTime() > Date.now()) ctx.addIssue({ code: "custom", path: ["sourceDate"], message: "Verification date cannot be in the future." });
});

function safeInvitation(invitation: { id: string; provider: string; expectedPrincipal: string; externalAccountId: string | null; instructions: string; status: string; sentAt: Date | null; acceptedAt: Date | null; verifiedAt: Date | null; expiresAt: Date | null; revokedAt: Date | null; verificationSource: string | null; sourceDate: Date | null; connectionId: string | null; }, method?: string | null) {
  return { id: invitation.id, provider: invitation.provider, method: method ?? null, expectedPrincipal: invitation.expectedPrincipal, externalAccountId: invitation.externalAccountId, instructions: invitation.instructions, status: invitation.status, sentAt: invitation.sentAt?.toISOString() ?? null, acceptedAt: invitation.acceptedAt?.toISOString() ?? null, verifiedAt: invitation.verifiedAt?.toISOString() ?? null, expiresAt: invitation.expiresAt?.toISOString() ?? null, revokedAt: invitation.revokedAt?.toISOString() ?? null, verificationSource: invitation.verificationSource, sourceDate: invitation.sourceDate?.toISOString() ?? null, connectionId: invitation.connectionId, expired: Boolean(invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now() && !invitation.verifiedAt && !invitation.revokedAt) };
}

export async function listManualInvitations(context: OrganizationContext) {
  requireConnectionPermission(context, "connections.view");
  const rows = await withTenantContext(context, (tx) => tx.accessInvitation.findMany({ where: { organizationId: context.organizationId, provider: { in: [...manualProviders] } }, orderBy: { expiresAt: "asc" }, take: 100, include: { connection: { select: { authorizationMethod: true } } } }));
  return rows.map((row) => safeInvitation(row, row.connection?.authorizationMethod));
}

export async function createManualInvitation(context: OrganizationContext, input: unknown, correlationId: string) {
  requireConnectionPermission(context, "connections.inventory.manage");
  const parsed = manualInvitationInputSchema.parse(input);
  if (!connectionWorkspaceEnabled()) throw new ConnectionServiceError("CONNECTIONS_DISABLED", 503);
  const expiresAt = parsed.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (expiresAt.getTime() <= Date.now()) throw new ConnectionServiceError("INVITATION_EXPIRY_INVALID", 400);
  return withTenantContext(context, async (tx) => {
    let connectionId = parsed.connectionId;
    if (connectionId) {
      const existing = await tx.connection.findFirst({ where: { id: connectionId, organizationId: context.organizationId, archivedAt: null }, select: { id: true, provider: true, authorizationMethod: true } });
      if (!existing) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
      if (existing.provider !== parsed.provider) throw new ConnectionServiceError("PROVIDER_MISMATCH", 409);
      if (existing.authorizationMethod !== parsed.method) throw new ConnectionServiceError("AUTHORIZATION_METHOD_MISMATCH", 409);
    } else {
      const created = await tx.connection.create({ data: { organizationId: context.organizationId, createdByUserId: context.userId, provider: parsed.provider, purpose: "inventory", authorizationMethod: parsed.method, accessMode: "read_only_pending", status: "pending", grantedScopes: [] }, select: { id: true } });
      connectionId = created.id;
    }
    const invitation = await tx.accessInvitation.create({ data: { organizationId: context.organizationId, connectionId, createdByUserId: context.userId, provider: parsed.provider, expectedPrincipal: parsed.expectedPrincipal, externalAccountId: parsed.externalAccountId, instructions: parsed.instructions, status: "draft", expiresAt } });
    await appendAuditEvent(tx, context, { action: "access_invitation.created", resourceType: "access_invitation", resourceId: invitation.id, outcomeCode: "created", correlationId, metadata: { provider: parsed.provider, method: parsed.method } });
    return safeInvitation(invitation, parsed.method);
  });
}

export async function sendManualInvitation(context: OrganizationContext, id: string, correlationId: string) {
  requireConnectionPermission(context, "connections.inventory.manage");
  requireAal2(await getAssuranceStatus(context));
  return withTenantContext(context, async (tx) => {
    const current = await tx.accessInvitation.findFirst({ where: { id, organizationId: context.organizationId }, include: { connection: { select: { authorizationMethod: true } } } });
    if (!current) throw new ConnectionServiceError("INVITATION_NOT_FOUND", 404);
    if (current.expiresAt && current.expiresAt.getTime() <= Date.now()) throw new ConnectionServiceError("INVITATION_EXPIRED", 409);
    if (!providerAuthorizationEnabled(current.provider as ConnectionProvider, context.organizationId)) throw new ConnectionServiceError("CONNECTIONS_DISABLED", 503);
    if (current.connection?.authorizationMethod !== "provider_invitation") throw new ConnectionServiceError("INVITATION_METHOD_INVALID", 409);
    if (!["draft", "attention_required"].includes(current.status)) throw new ConnectionServiceError("INVITATION_STATE_INVALID", 409);
    const updated = await tx.accessInvitation.update({ where: { id: current.id }, data: { status: "sent", sentAt: new Date() } });
    await appendAuditEvent(tx, context, { action: "access_invitation.sent", resourceType: "access_invitation", resourceId: id, outcomeCode: "sent", correlationId, metadata: { provider: current.provider } });
    return safeInvitation(updated, current.connection?.authorizationMethod);
  });
}

export async function verifyManualInvitation(context: OrganizationContext, id: string, input: unknown, correlationId: string) {
  requireConnectionPermission(context, "connections.verify");
  const assurance = await getAssuranceStatus(context);
  requireAal2(assurance);
    const parsed = manualVerificationSchema.parse(input);
    return withTenantContext(context, async (tx) => {
    const current = await tx.accessInvitation.findFirst({ where: { id, organizationId: context.organizationId }, select: { id: true, provider: true, status: true, expiresAt: true, connectionId: true, connection: { select: { status: true, archivedAt: true, authorizationMethod: true } } } });
    if (!current) throw new ConnectionServiceError("INVITATION_NOT_FOUND", 404);
    if (["revoked", "verified", "expired"].includes(current.status)) throw new ConnectionServiceError("INVITATION_STATE_INVALID", 409);
    if (current.expiresAt && current.expiresAt.getTime() <= Date.now()) throw new ConnectionServiceError("INVITATION_EXPIRED", 409);
    if (!providerAuthorizationEnabled(current.provider as ConnectionProvider, context.organizationId)) throw new ConnectionServiceError("CONNECTIONS_DISABLED", 503);
    if (!verificationSourceAllowed(current.connection?.authorizationMethod ?? null, parsed.verificationSource)) throw new ConnectionServiceError("VERIFICATION_SOURCE_INVALID", 400);
    const updated = await tx.accessInvitation.update({ where: { id }, data: { status: "verified", acceptedAt: new Date(), verifiedAt: new Date(), verificationSource: parsed.verificationSource, sourceDate: parsed.sourceDate } });
    if (current.connectionId) {
      if (!current.connection || current.connection.archivedAt) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
      assertConnectionTransition(current.connection.status, "verifying");
      assertConnectionTransition("verifying", "active_read_only");
      await tx.connection.update({ where: { id: current.connectionId }, data: { status: "verifying" } });
      await tx.connection.update({ where: { id: current.connectionId }, data: { status: "active_read_only", accessMode: "read_only", effectiveRole: "manual_verified", lastVerifiedAt: new Date() } });
    }
    await appendAuditEvent(tx, context, { action: "access_invitation.verified", resourceType: "access_invitation", resourceId: id, outcomeCode: "verified", correlationId, metadata: { provider: current.provider, verificationSource: parsed.verificationSource, sourceDate: parsed.sourceDate.toISOString() } });
    return safeInvitation(updated, current.connection?.authorizationMethod);
  });
}

export async function revokeManualInvitation(context: OrganizationContext, id: string, correlationId: string) {
  requireConnectionPermission(context, "connections.revoke");
  const assurance = await getAssuranceStatus(context);
  requireAal2(assurance);
  return withTenantContext(context, async (tx) => {
    const current = await tx.accessInvitation.findFirst({ where: { id, organizationId: context.organizationId }, select: { id: true, provider: true, connectionId: true, status: true, connection: { select: { status: true, archivedAt: true, authorizationMethod: true } } } });
    if (!current) throw new ConnectionServiceError("INVITATION_NOT_FOUND", 404);
    if (current.status === "revoked") return { state: "revoked" as const };
    await tx.accessInvitation.update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } });
    if (current.connectionId && current.connection && !current.connection.archivedAt) {
      assertConnectionTransition(current.connection.status, "revoked");
      await tx.connection.update({ where: { id: current.connectionId }, data: { status: "revoked" } });
    }
    await appendAuditEvent(tx, context, { action: "access_invitation.revoked", resourceType: "access_invitation", resourceId: id, outcomeCode: "revoked", correlationId, metadata: { provider: current.provider } });
    return { state: "revoked" as const };
  });
}
