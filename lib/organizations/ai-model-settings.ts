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
      // The replaced key is queued for deletion in the same transaction that
      // stops using it, so it stays tracked until the Vault delete succeeds.
      if (stored && existing) await tx.organizationAiCredentialCleanup.create({ data: { brokerHandle: existing.brokerHandle, organizationId: context.organizationId } });
      return row;
    });
  } catch (error) {
    // The row was not saved, so the new key must not stay in the Vault. If
    // it cannot be deleted now, queue it so a later cleanup retries.
    if (stored) await broker.destroy(stored.handle).catch(() => queueAiCredentialCleanup(context, stored.handle));
    throw error;
  }
  await drainAiCredentialCleanups(context, broker);
  const row = saved;
  return { provider: row.provider as AiModelProviderId, model: row.model, keyHint: row.keyHint, updatedAt: row.updatedAt.toISOString() };
}

// Removes the organization's model choice and deletes its key. AI Reach
// then uses rule-based answers (or the platform default, if one is set).
// With failClosed (used by offboarding), any key still waiting to be deleted
// stops the operation, now and on every retry, until the delete succeeds.
export async function removeAiModelSettings(context: OrganizationContext, correlationId: string, broker: SecretBroker, options: { failClosed?: boolean } = {}) {
  requireManage(context);
  requireAal2(await getAssuranceStatus(context));
  const removed = await withTenantContext(context, async (tx) => {
    await lockAiModelSettings(tx, context.organizationId);
    const existing = await tx.organizationAiCredential.findUnique({ where: { organizationId: context.organizationId }, select: { provider: true, model: true, brokerHandle: true } });
    if (!existing) return false;
    await tx.organizationAiCredential.delete({ where: { organizationId: context.organizationId } });
    await tx.organizationAiCredentialCleanup.create({ data: { brokerHandle: existing.brokerHandle, organizationId: context.organizationId } });
    await appendAuditEvent(tx, context, {
      action: "organization.ai_model_removed",
      resourceType: "organization",
      resourceId: context.organizationId,
      outcomeCode: "removed",
      correlationId,
      metadata: { provider: existing.provider, model: existing.model },
    });
    return true;
  });
  await drainAiCredentialCleanups(context, broker, options);
  return { removed };
}

// Records a key that must still be deleted from the Vault, retrying a few
// times. If the database stays unavailable, the Vault handle (an id, not the
// key) is logged as an error so the orphaned secret can be removed by hand;
// it is never silently forgotten.
async function queueAiCredentialCleanup(context: OrganizationContext, brokerHandle: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await withTenantContext(context, (tx) => tx.organizationAiCredentialCleanup.create({ data: { brokerHandle, organizationId: context.organizationId } }));
      return;
    } catch {
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
  console.error(`AI_MODEL_KEY_CLEANUP_UNTRACKED organization=${context.organizationId} vaultHandle=${brokerHandle}: delete this Vault secret manually.`);
}

// Deletes every queued key from the Vault, removing each queue row only after
// its delete succeeds. Failures stay queued for the next save, removal, or
// offboarding attempt; with failClosed the first failure is thrown.
export async function drainAiCredentialCleanups(context: OrganizationContext, broker: SecretBroker, options: { failClosed?: boolean } = {}) {
  const queued = await withTenantContext(context, (tx) => tx.organizationAiCredentialCleanup.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { queuedAt: "asc" },
    select: { brokerHandle: true },
  }));
  for (const { brokerHandle } of queued) {
    try {
      await broker.destroy(brokerHandle);
      await withTenantContext(context, (tx) => tx.organizationAiCredentialCleanup.deleteMany({ where: { brokerHandle, organizationId: context.organizationId } }));
    } catch (error) {
      if (options.failClosed) throw error;
      console.warn("AI Reach model key could not be deleted yet; it stays queued for cleanup.");
    }
  }
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
