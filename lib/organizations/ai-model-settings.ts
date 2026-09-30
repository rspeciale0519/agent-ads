import { z } from "zod";
import { appendAuditEvent } from "../audit";
import { getAssuranceStatus, requireAal2 } from "../auth/assurance";
import { withTenantContext, type OrganizationContext } from "../auth/organization-context";
import { hasPermission } from "../auth/permissions";
import { randomOpaqueName, type SecretBroker } from "../connections/secrets/secret-broker";
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

// Only people who may change the model see which one is saved and its key hint.
export async function readAiModelSettings(context: OrganizationContext): Promise<AiModelSettings | null> {
  requireManage(context);
  const row = await withTenantContext(context, (tx) => tx.organizationAiCredential.findUnique({
    where: { organizationId: context.organizationId },
    select: { provider: true, model: true, keyHint: true, updatedAt: true },
  }));
  return row ? { provider: row.provider as AiModelProviderId, model: row.model, keyHint: row.keyHint, updatedAt: row.updatedAt.toISOString() } : null;
}

// How long a key may take to be written and saved before a leftover
// "pending" record is treated as abandoned and its Vault secret deleted.
const PENDING_KEY_GRACE_MS = 10 * 60_000;

// Saves the chosen company, model, and (when given) a new key. The new key's
// Vault name is recorded first, while holding the organization's shared lock
// (so offboarding cannot finish in between); then the key goes to the Vault;
// then the choice is saved. A key is therefore always tracked, even if the
// save or the process fails midway. The old key is deleted only after the new
// one is saved. Callers must have consumed an "ai_model_manage" step-up grant.
export async function saveAiModelSettings(context: OrganizationContext, input: unknown, correlationId: string, broker: SecretBroker): Promise<AiModelSettings> {
  requireManage(context);
  requireAal2(await getAssuranceStatus(context));
  const parsed = aiModelSettingsInputSchema.parse(input);

  // Step 1: record the name the new key will be stored under.
  const vaultName = parsed.apiKey ? randomOpaqueName() : null;
  if (vaultName) await withTenantContext(context, (tx) => tx.organizationAiCredentialPendingKey.create({ data: { vaultName, organizationId: context.organizationId } }));
  let saved;
  try {
    // Step 2: write the key to the Vault under that name.
    const stored = parsed.apiKey && vaultName ? await broker.put({ value: parsed.apiKey, kind: "provider_api_key", opaqueName: vaultName }) : null;
    // Step 3: save the choice; the pending record is cleared in the same
    // transaction because the saved row now tracks the key.
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
      if (vaultName) await tx.organizationAiCredentialPendingKey.deleteMany({ where: { vaultName, organizationId: context.organizationId } });
      return row;
    });
  } catch (error) {
    // The choice was not saved, so the new key (if written) must not stay in
    // the Vault. If this cleanup fails, the pending record stays and a later
    // cleanup (or offboarding, which waits for it) retries.
    if (vaultName) await discardPendingKey(context, broker, vaultName).catch(() => console.warn("AI Reach model key could not be deleted yet; it stays pending for cleanup."));
    throw error;
  }
  await drainAiCredentialCleanups(context, broker);
  const row = saved;
  return { provider: row.provider as AiModelProviderId, model: row.model, keyHint: row.keyHint, updatedAt: row.updatedAt.toISOString() };
}

// Deletes a key that was never saved (by its Vault name), then its pending record.
async function discardPendingKey(context: OrganizationContext, broker: SecretBroker, vaultName: string) {
  await broker.destroyByName(vaultName);
  await withTenantContext(context, (tx) => tx.organizationAiCredentialPendingKey.deleteMany({ where: { vaultName, organizationId: context.organizationId } }));
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

// Deletes every queued key from the Vault, removing each queue row only after
// its delete succeeds, plus any abandoned pending key (one whose save never
// finished within the grace period; newer ones may still be mid-save).
// Failures stay queued for the next save, removal, or offboarding attempt;
// with failClosed the first failure is thrown.
export async function drainAiCredentialCleanups(context: OrganizationContext, broker: SecretBroker, options: { failClosed?: boolean } = {}) {
  const abandoned = await withTenantContext(context, (tx) => tx.organizationAiCredentialPendingKey.findMany({
    where: { organizationId: context.organizationId, queuedAt: { lt: new Date(Date.now() - PENDING_KEY_GRACE_MS) } },
    orderBy: { queuedAt: "asc" },
    select: { vaultName: true },
  }));
  for (const { vaultName } of abandoned) {
    try {
      await discardPendingKey(context, broker, vaultName);
    } catch (error) {
      if (options.failClosed) throw error;
      console.warn("AI Reach model key could not be deleted yet; it stays pending for cleanup.");
    }
  }
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
