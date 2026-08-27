import { createHmac, randomUUID } from "node:crypto";
import { z } from "zod";
import { withTenantContext, withTenantFinalizationContext, type OrganizationContext } from "../auth/organization-context";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const actionSchema = z.string().regex(/^[a-z0-9._:-]{1,120}$/);
const keySchema = z.string().regex(/^[A-Za-z0-9._:-]{16,200}$/);
const correlationSchema = z.string().regex(/^[A-Za-z0-9._:-]{1,120}$/);
const mutationMetadataSchema = z.object({
  idempotencyKey: keySchema,
  correlationId: correlationSchema,
}).strict();
const claimSchema = z.array(z.object({
  id: z.string().uuid(),
  request_hash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["pending", "completed", "failed"]),
  claimed: z.boolean(),
})).length(1);

export type MutationMetadata = z.infer<typeof mutationMetadataSchema>;

export function mutationMetadata(request: Request): MutationMetadata {
  const idempotencyKey = keySchema.safeParse(request.headers.get("idempotency-key"));
  if (!idempotencyKey.success) throw new IdempotencyError("IDEMPOTENCY_KEY_REQUIRED", 400);
  const correlationId = correlationSchema.safeParse(request.headers.get("x-correlation-id"));
  if (!correlationId.success) throw new IdempotencyError("CORRELATION_ID_REQUIRED", 400);
  return { idempotencyKey: idempotencyKey.data, correlationId: correlationId.data };
}

export async function runIdempotentMutation<T>(
  context: OrganizationContext,
  identity: Request | MutationMetadata,
  action: string,
  fingerprintInput: unknown,
  execute: () => Promise<T>,
): Promise<T> {
  const validatedAction = actionSchema.parse(action);
  const parsedMetadata = identity instanceof Request
    ? { success: true as const, data: mutationMetadata(identity) }
    : mutationMetadataSchema.safeParse(identity);
  if (!parsedMetadata.success) throw new IdempotencyError("IDEMPOTENCY_METADATA_INVALID", 400);
  const metadata = parsedMetadata.data;
  const keyHash = secureHash(`key:${metadata.idempotencyKey}`);
  const requestHash = secureHash(`request:${validatedAction}:${canonicalJson(fingerprintInput)}`);
  const expiresAt = new Date(Date.now() + RETENTION_MS);
  const claim = await claimMutation(context, validatedAction, keyHash, requestHash, expiresAt);

  if (claim.request_hash !== requestHash) throw new IdempotencyError("IDEMPOTENCY_KEY_REUSED", 409);
  if (!claim.claimed) {
    if (claim.status === "completed") throw new IdempotencyError("IDEMPOTENCY_ALREADY_COMPLETED", 409);
    if (claim.status === "failed") throw new IdempotencyError("IDEMPOTENCY_RECONCILIATION_REQUIRED", 409);
    throw new IdempotencyError("IDEMPOTENCY_IN_PROGRESS", 409);
  }

  try {
    const result = await execute();
    await setMutationStatus(context, claim.id, "completed");
    return result;
  } catch (error) {
    try {
      await setMutationStatus(context, claim.id, "failed");
    } catch {
      throw new IdempotencyError("IDEMPOTENCY_STORE_UNAVAILABLE", 503);
    }
    throw error;
  }
}

async function claimMutation(context: OrganizationContext, action: string, keyHash: string, requestHash: string, expiresAt: Date) {
  const attemptedId = randomUUID();
  const rows = await withTenantContext(context, (tx) => tx.$queryRaw<unknown>`
    INSERT INTO private.idempotency_records (
      id, organization_id, user_id, action, key_hash, request_hash, expires_at
    ) VALUES (
      ${attemptedId}::uuid, ${context.organizationId}::uuid, ${context.userId}::uuid,
      ${action}, ${keyHash}, ${requestHash}, ${expiresAt}
    )
    ON CONFLICT (organization_id, user_id, action, key_hash)
    DO UPDATE SET key_hash = EXCLUDED.key_hash
    RETURNING id, request_hash, status, id = ${attemptedId}::uuid AS claimed
  `);
  const parsed = claimSchema.safeParse(rows);
  if (!parsed.success) throw new IdempotencyError("IDEMPOTENCY_STORE_INVALID", 503);
  return parsed.data[0];
}

async function setMutationStatus(context: OrganizationContext, id: string, status: "completed" | "failed") {
  const completedAt = status === "completed" ? new Date() : null;
  const failedAt = status === "failed" ? new Date() : null;
  const count = await withTenantFinalizationContext(context, (tx) => tx.$executeRaw`
    UPDATE private.idempotency_records
       SET status = ${status},
           completed_at = ${completedAt},
           failed_at = ${failedAt},
           updated_at = statement_timestamp()
     WHERE id = ${id}::uuid
       AND organization_id = ${context.organizationId}::uuid
       AND user_id = ${context.userId}::uuid
       AND status = 'pending'
  `);
  if (count !== 1) throw new IdempotencyError("IDEMPOTENCY_STORE_INVALID", 503);
}

export function hashIdempotencyValue(value: string) {
  return secureHash(value);
}

export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new IdempotencyError("IDEMPOTENCY_INPUT_INVALID", 400);
    return JSON.stringify(value);
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item ?? null)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record).sort().filter((key) => record[key] !== undefined);
    return `{${entries.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  throw new IdempotencyError("IDEMPOTENCY_INPUT_INVALID", 400);
}

function secureHash(value: string) {
  return createHmac("sha256", idempotencySecret()).update(value, "utf8").digest("hex");
}

function idempotencySecret() {
  const configured = process.env.IDEMPOTENCY_HMAC_KEY;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") throw new IdempotencyError("IDEMPOTENCY_KEY_NOT_CONFIGURED", 503);
  return "local-synthetic-idempotency-key-not-for-production";
}

export class IdempotencyError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "IdempotencyError";
    this.code = code;
    this.status = status;
  }
}
