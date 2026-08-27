import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { appendAuditEvent } from "../audit";
import { getAssuranceStatus, requireAal2 } from "../auth/assurance";
import { getAuthenticatedUser, withApplicantContext, withTenantContext, type OrganizationContext } from "../auth/organization-context";
import { hasPermission, normalizeRole, permissionsForRole, type OrganizationRole } from "../auth/permissions";
import { runIdempotentMutation, type MutationMetadata } from "../api/idempotency";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const allowedRoles: OrganizationRole[] = ["member", "operator", "administrator"];

export function assertInvitationUsable(invitation: { status: string; expires_at: Date }, now = new Date()) {
  if (invitation.status !== "pending" || invitation.expires_at.getTime() <= now.getTime()) throw new InvitationError("INVITATION_INVALID", 409);
}

export function assertInvitationRecipient(invitation: { recipient_auth_subject: string | null; recipient_email: string }, recipient: { authSubject: string; email: string | null }) {
  if (invitation.recipient_auth_subject && invitation.recipient_auth_subject !== recipient.authSubject) throw new InvitationError("INVITATION_RECIPIENT_MISMATCH", 403);
  if ((recipient.email ?? "").trim().toLowerCase() !== invitation.recipient_email.trim().toLowerCase()) throw new InvitationError("INVITATION_RECIPIENT_MISMATCH", 403);
}

export async function createOrganizationInvitation(context: OrganizationContext, input: { email: string; role: OrganizationRole }, correlationId: string) {
  if (!hasPermission(context.permissions, "membership.manage")) throw new InvitationError("PERMISSION_DENIED", 403);
  if (!allowedRoles.includes(input.role)) throw new InvitationError("INVITATION_ROLE_NOT_ALLOWED", 400);
  requireAal2(await getAssuranceStatus(context));
  const recipientEmail = input.email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  const invitation = await withTenantContext(context, async (tx) => {
    await tx.organizationInvitation.updateMany({ where: { organizationId: context.organizationId, recipientEmail, status: "pending", expiresAt: { lte: new Date() } }, data: { status: "expired" } });
    const existing = await tx.organizationInvitation.findFirst({ where: { organizationId: context.organizationId, recipientEmail, status: "pending", expiresAt: { gt: new Date() } }, select: { id: true } });
    if (existing) throw new InvitationError("INVITATION_ALREADY_PENDING", 409);
    const created = await tx.organizationInvitation.create({ data: { organizationId: context.organizationId, inviterUserId: context.userId, recipientEmail, tokenHash, role: input.role, permissions: permissionsForRole(input.role), expiresAt, status: "pending" } });
    await appendAuditEvent(tx, context, { action: "organization.invitation.created", resourceType: "organization_invitation", resourceId: created.id, outcomeCode: "created", correlationId, metadata: { recipientEmail: "redacted", role: input.role } });
    return created;
  });
  await deliverInvitationWithCompensation(
    () => sendInvitationEmail(recipientEmail, context.organizationName, token, invitation.id),
    () => withTenantContext(context, async (tx) => {
      await tx.organizationInvitation.updateMany({ where: { id: invitation.id, organizationId: context.organizationId, status: "pending" }, data: { status: "revoked", revokedAt: new Date() } });
      await appendAuditEvent(tx, context, { action: "organization.invitation.delivery_failed", resourceType: "organization_invitation", resourceId: invitation.id, outcomeCode: "delivery_failed_compensated", correlationId, metadata: { recipientEmail: "redacted", role: input.role } });
    }),
  );
  return { id: invitation.id, expiresAt };
}

export async function deliverInvitationWithCompensation(deliver: () => Promise<void>, compensate: () => Promise<void>) {
  try {
    await deliver();
  } catch {
    try {
      await compensate();
    } catch {
      throw new InvitationError("INVITATION_DELIVERY_COMPENSATION_FAILED", 503);
    }
    throw new InvitationError("INVITATION_EMAIL_FAILED", 502);
  }
}

export async function acceptOrganizationInvitation(code: string, mutation: MutationMetadata) {
  const authenticated = await getAuthenticatedUser();
  if (!authenticated) throw new InvitationError("AUTHENTICATION_REQUIRED", 401);
  if (!authenticated.supabaseUser.email_confirmed_at) throw new InvitationError("EMAIL_CONFIRMATION_REQUIRED", 403);
  if (!code || code.length < 20) throw new InvitationError("INVITATION_INVALID", 409);
  const tokenHash = createHash("sha256").update(code, "utf8").digest("hex");
  const rows = await withApplicantContext(authenticated.supabaseUser.id, (tx) => tx.$queryRaw<InvitationLookup[]>`SELECT * FROM private.lookup_organization_invitation(${tokenHash})`);
  const invitation = rows[0];
  if (!invitation) throw new InvitationError("INVITATION_INVALID", 409);
  assertInvitationRecipient(invitation, { authSubject: authenticated.supabaseUser.id, email: authenticated.supabaseUser.email ?? null });
  const role = normalizeRole(invitation.role);
  const context: OrganizationContext = { organizationId: invitation.organization_id, organizationName: invitation.organization_name, userId: authenticated.appUser.id, authSubject: authenticated.supabaseUser.id, email: authenticated.supabaseUser.email ?? "", role, permissions: invitation.permissions.length ? invitation.permissions : permissionsForRole(role), sessionId: authenticated.sessionId, assurance: authenticated.assurance };
  return runIdempotentMutation(context, mutation, "organization.invitation.accept", { invitationId: invitation.invitation_id }, async () => {
    await withTenantContext(context, async (tx) => {
      const locked = await tx.$queryRaw<Array<{ status: string; expires_at: Date }>>`
        SELECT status, expires_at
          FROM public.organization_invitations
         WHERE id = ${invitation.invitation_id}::uuid
           AND organization_id = ${context.organizationId}::uuid
         FOR UPDATE
      `;
      if (!locked[0]) throw new InvitationError("INVITATION_INVALID", 409);
      assertInvitationUsable(locked[0]);
      const existing = await tx.membership.findFirst({ where: { organizationId: context.organizationId, userId: context.userId } });
      if (existing?.status === "active") throw new InvitationError("ALREADY_A_MEMBER", 409);
      if (existing) await tx.membership.update({ where: { id: existing.id }, data: { status: "active", role, permissions: context.permissions, acceptedAt: new Date() } });
      else await tx.membership.create({ data: { organizationId: context.organizationId, userId: context.userId, role, permissions: context.permissions, status: "active", invitedAt: new Date(), acceptedAt: new Date() } });
      await tx.organizationInvitation.update({ where: { id: invitation.invitation_id }, data: { status: "accepted", acceptedAt: new Date(), acceptedByUserId: context.userId } });
      await appendAuditEvent(tx, context, { action: "organization.invitation.accepted", resourceType: "organization_invitation", resourceId: invitation.invitation_id, outcomeCode: "accepted", correlationId: mutation.correlationId, metadata: { recipient: "redacted" } });
    });
    return { organizationId: invitation.organization_id, organizationName: invitation.organization_name };
  });
}

export async function listOrganizationInvitations(context: OrganizationContext) {
  if (!hasPermission(context.permissions, "membership.manage")) throw new InvitationError("PERMISSION_DENIED", 403);
  return withTenantContext(context, (tx) => tx.organizationInvitation.findMany({ where: { organizationId: context.organizationId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, recipientEmail: true, role: true, status: true, expiresAt: true, acceptedAt: true, revokedAt: true, createdAt: true } }));
}

export async function revokeOrganizationInvitation(context: OrganizationContext, invitationId: string, correlationId: string) {
  if (!hasPermission(context.permissions, "membership.manage")) throw new InvitationError("PERMISSION_DENIED", 403);
  requireAal2(await getAssuranceStatus(context));
  return withTenantContext(context, async (tx) => {
    const invitation = await tx.organizationInvitation.findFirst({ where: { id: invitationId, organizationId: context.organizationId, status: "pending" } });
    if (!invitation) throw new InvitationError("INVITATION_NOT_FOUND", 404);
    const updated = await tx.organizationInvitation.update({ where: { id: invitation.id }, data: { status: "revoked", revokedAt: new Date() } });
    await appendAuditEvent(tx, context, { action: "organization.invitation.revoked", resourceType: "organization_invitation", resourceId: invitation.id, outcomeCode: "revoked", correlationId, metadata: {} });
    return { id: updated.id, status: updated.status };
  });
}

async function sendInvitationEmail(email: string, organizationName: string, code: string, invitationId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new InvitationError("INVITATION_EMAIL_NOT_CONFIGURED", 503);
  const result = await new Resend(apiKey).emails.send(
    { from, to: [email], subject: `Your ${organizationName} MioDio workspace invitation`, text: `Use this one-time invitation code in the MioDio workspace:\n\n${code}\n\nThe code expires in seven days.` },
    { idempotencyKey: `organization-invitation-${invitationId}` },
  );
  if (result.error) throw new InvitationError("INVITATION_EMAIL_FAILED", 502);
}

type InvitationLookup = { invitation_id: string; organization_id: string; organization_name: string; recipient_email: string; recipient_auth_subject: string | null; role: string; permissions: string[]; status: string; expires_at: Date };

export class InvitationError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.name = "InvitationError";
    this.code = code;
    this.status = status;
  }
}
