import { z } from "zod";
import { appendAuditEvent } from "../audit";
import { getAssuranceStatus, requireAal2 } from "../auth/assurance";
import { withTenantContext, type OrganizationContext } from "../auth/organization-context";
import { hasPermission } from "../auth/permissions";
import type { SecretBroker } from "../connections/secrets/secret-broker";
import { AI_MODEL_NAME_PATTERN, AI_MODEL_PROVIDER_IDS, type AiModelProviderId } from "../ai-reach/model-providers";
import { OrganizationSettingsError } from "./settings";

// What the Settings page may show. The key itself is never returned.
export type AiModelSettings = { provider: AiModelProviderId; model: string; keyHint: string; updatedAt: string };

// A new key is required when first saving or switching companies; changing
// only the model name keeps the saved key.
export const aiModelSettingsInputSchema = z.object({
  provider: z.enum(AI_MODEL_PROVIDER_IDS),
  model: z.string().trim().regex(AI_MODEL_NAME_PATTERN),
  apiKey: z.string().trim().min(8).max(500).optional(),
}).strict();

function requireManage(context: OrganizationContext) {
  if (!hasPermission(context.permissions, "organization.settings.manage")) throw new OrganizationSettingsError("PERMISSION_DENIED", 403);
}

// The last four characters, shown as "key ending in abcd".
function keyHint(apiKey: string) {
  return apiKey.slice(-4);
}

// Serializes AI model changes per organization, so a key replaced by one
// save is never left behind by another.
async function lockAiModelSettings(tx: Parameters<Parameters<typeof withTenantContext>[1]>[0], organizationId: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`organization_ai_credentials:${organizationId}`}::text, 0::bigint))`;
}

export async function readAiModelSettings(context: OrganizationContext): Promise<AiModelSettings | null> {
  const row = await withTenantContext(context, (tx) => tx.organizationAiCredential.findUnique({
    where: { organizationId: context.organizationId },
    select: { provider: true, model: true, keyHint: true, updatedAt: true },
  }));
  return row ? { provider: row.provider as AiModelProviderId, model: row.model, keyHint: row.keyHint, updatedAt: row.updatedAt.toISOString() } : null;
}

// Saves the chosen company, model, and (when given) a new key. The key goes
// to Supabase Vault first; the old key is destroyed only after the new one is
// saved. Callers must have consumed an "ai_model_manage" step-up grant.
export async function saveAiModelSettings(context: OrganizationContext, input: unknown, correlationId: string, broker: SecretBroker): Promise<AiModelSettings> {
  requireManage(context);
  requireAal2(await getAssuranceStatus(context));
  const parsed = aiModelSettingsInputSchema.parse(input);

  const stored = parsed.apiKey ? await broker.put({ value: parsed.apiKey, kind: "provider_api_key" }) : null;
  let saved;
  try {
    saved = await withTenantContext(context, async (tx) => {
      await lockAiModelSettings(tx, context.organizationId);
      const existing = await tx.organizationAiCredential.findUnique({ where: { organizationId: context.organizationId }, select: { provider: true, model: true, brokerHandle: true } });
      // A key belongs to one company, so switching companies needs a new key.
      if (!stored && (!existing || existing.provider !== parsed.provider)) throw new OrganizationSettingsError("AI_MODEL_KEY_REQUIRED", 422);
      const keyFields = stored
        ? { brokerHandle: stored.handle, backend: broker.backend, keyVersion: broker.keyVersion, keyHint: keyHint(parsed.apiKey!), fingerprint: stored.fingerprint }
        : {};
      const row = await tx.organizationAiCredential.upsert({
        where: { organizationId: context.organizationId },
        create: { organizationId: context.organizationId, provider: parsed.provider, model: parsed.model, updatedBy: context.userId, ...(keyFields as Required<typeof keyFields>) },
        update: { provider: parsed.provider, model: parsed.model, updatedBy: context.userId, updatedAt: new Date(), ...keyFields },
        select: { provider: true, model: true, keyHint: true, updatedAt: true },
      });
      await appendAuditEvent(tx, context, {
        action: "organization.ai_model_saved",
        resourceType: "organization",
        resourceId: context.organizationId,
        outcomeCode: "saved",
        correlationId,
        // Names only; the key and its fingerprint never enter the audit log.
        metadata: { provider: parsed.provider, model: parsed.model, keyReplaced: Boolean(stored), previousProvider: existing?.provider ?? null, previousModel: existing?.model ?? null },
      });
      return { row, replacedHandle: stored && existing ? existing.brokerHandle : null };
    });
  } catch (error) {
    // The row was not saved, so the new key must not stay in the Vault.
    if (stored) await broker.destroy(stored.handle).catch(() => undefined);
    throw error;
  }
  // Only after the save has committed is the replaced key unreferenced, so
  // only then is it removed from the Vault.
  if (saved.replacedHandle) await broker.destroy(saved.replacedHandle).catch(() => console.warn("AI Reach replaced model key could not be destroyed; it is unreferenced."));
  const row = saved.row;
  return { provider: row.provider as AiModelProviderId, model: row.model, keyHint: row.keyHint, updatedAt: row.updatedAt.toISOString() };
}

// Removes the organization's model choice and destroys its key. AI Reach
// then uses rule-based answers (or the platform default, if one is set).
// With failClosed (used by offboarding), a key that cannot be destroyed
// stops the operation instead of being left behind.
export async function removeAiModelSettings(context: OrganizationContext, correlationId: string, broker: SecretBroker, options: { failClosed?: boolean } = {}) {
  requireManage(context);
  requireAal2(await getAssuranceStatus(context));
  const removed = await withTenantContext(context, async (tx) => {
    await lockAiModelSettings(tx, context.organizationId);
    const existing = await tx.organizationAiCredential.findUnique({ where: { organizationId: context.organizationId }, select: { provider: true, model: true, brokerHandle: true } });
    if (!existing) return null;
    await tx.organizationAiCredential.delete({ where: { organizationId: context.organizationId } });
    await appendAuditEvent(tx, context, {
      action: "organization.ai_model_removed",
      resourceType: "organization",
      resourceId: context.organizationId,
      outcomeCode: "removed",
      correlationId,
      metadata: { provider: existing.provider, model: existing.model },
    });
    return existing.brokerHandle;
  });
  if (removed && options.failClosed) await broker.destroy(removed);
  else if (removed) await broker.destroy(removed).catch(() => console.warn("AI Reach removed model key could not be destroyed; it is unreferenced."));
  return { removed: Boolean(removed) };
}

// The saved choice with its key, for answering questions. Returns null when
// the organization has not chosen a model. The broker is only created when a
// choice exists, so organizations without one never touch the Vault.
export async function readAiModelCredential(context: OrganizationContext, getBroker: () => SecretBroker) {
  const row = await withTenantContext(context, (tx) => tx.organizationAiCredential.findUnique({
    where: { organizationId: context.organizationId },
    select: { provider: true, model: true, brokerHandle: true },
  }));
  if (!row) return null;
  const apiKey = await getBroker().read(row.brokerHandle);
  if (!apiKey) throw Object.assign(new Error("AI_MODEL_KEY_UNREADABLE"), { name: "AiModelKeyUnreadable" });
  return { provider: row.provider as AiModelProviderId, model: row.model, apiKey };
}
