import { z } from "zod";
import { appendAuditEvent } from "../audit";
import { getAssuranceStatus, requireAal2 } from "../auth/assurance";
import { withTenantContext, type OrganizationContext } from "../auth/organization-context";
import { hasPermission } from "../auth/permissions";

// Days an uploaded export stays current before AI Reach asks for a new one,
// used until an owner or administrator picks a different number.
export const DEFAULT_STALE_UPLOAD_DAYS = 7;
export const MIN_STALE_UPLOAD_DAYS = 1;
export const MAX_STALE_UPLOAD_DAYS = 90;

export type OrganizationSettings = { staleUploadDays: number };

export const organizationSettingsInputSchema = z.object({
  staleUploadDays: z.number().int().min(MIN_STALE_UPLOAD_DAYS).max(MAX_STALE_UPLOAD_DAYS),
}).strict();

export class OrganizationSettingsError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

// The organization's settings, with defaults for anything never saved.
export async function readOrganizationSettings(context: OrganizationContext): Promise<OrganizationSettings> {
  const row = await withTenantContext(context, (tx) => tx.organizationSettings.findUnique({
    where: { organizationId: context.organizationId },
    select: { staleUploadDays: true },
  }));
  return { staleUploadDays: row?.staleUploadDays ?? DEFAULT_STALE_UPLOAD_DAYS };
}

// Saves new settings. Only owners and administrators with current MFA may
// change them, and every change is recorded in the audit log.
export async function updateOrganizationSettings(context: OrganizationContext, input: unknown, correlationId: string): Promise<OrganizationSettings> {
  if (!hasPermission(context.permissions, "organization.settings.manage")) throw new OrganizationSettingsError("PERMISSION_DENIED", 403);
  requireAal2(await getAssuranceStatus(context));
  const parsed = organizationSettingsInputSchema.parse(input);

  return withTenantContext(context, async (tx) => {
    const previous = await tx.organizationSettings.findUnique({ where: { organizationId: context.organizationId }, select: { staleUploadDays: true } });
    const saved = await tx.organizationSettings.upsert({
      where: { organizationId: context.organizationId },
      create: { organizationId: context.organizationId, staleUploadDays: parsed.staleUploadDays, updatedBy: context.userId },
      update: { staleUploadDays: parsed.staleUploadDays, updatedBy: context.userId, updatedAt: new Date() },
      select: { staleUploadDays: true },
    });
    await appendAuditEvent(tx, context, {
      action: "organization.settings_updated",
      resourceType: "organization",
      resourceId: context.organizationId,
      outcomeCode: "saved",
      correlationId,
      metadata: { staleUploadDays: saved.staleUploadDays, previousStaleUploadDays: previous?.staleUploadDays ?? DEFAULT_STALE_UPLOAD_DAYS },
    });
    return { staleUploadDays: saved.staleUploadDays };
  });
}
