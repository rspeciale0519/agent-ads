import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { prisma } from "../db/client";

const resultSchema = z.array(z.object({
  allowed: z.boolean(),
  retry_after_seconds: z.coerce.number().int().positive(),
})).length(1);

export async function enforceRateLimit(key: string, limit: number, windowMs: number, organizationId?: string) {
  const keyHash = hashRateLimitKey(key);
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const rows: unknown = await prisma.$queryRaw`
    SELECT * FROM private.consume_rate_limit(${keyHash}, ${limit}, ${windowSeconds}, ${organizationId ?? null}::uuid)
  `;
  const parsed = resultSchema.safeParse(rows);
  if (!parsed.success) throw new RateLimitConfigurationError("RATE_LIMIT_STORE_INVALID");
  const result = parsed.data[0];
  if (!result.allowed) throw new RateLimitError(result.retry_after_seconds);
}

export function requestRateLimitKey(request: Request, action: string) {
  const candidates = [
    request.headers.get("x-real-ip"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];
  const address = candidates.find((candidate) => candidate && isIP(candidate)) ?? "unknown";
  return `${action}:${address}`;
}

export function hashRateLimitKey(key: string) {
  const secret = rateLimitSecret();
  return createHmac("sha256", secret).update(key.slice(0, 500), "utf8").digest("hex");
}

function rateLimitSecret() {
  const configured = process.env.RATE_LIMIT_HMAC_KEY;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") throw new RateLimitConfigurationError("RATE_LIMIT_KEY_NOT_CONFIGURED");
  return "local-synthetic-rate-limit-key-not-for-production";
}

export class RateLimitError extends Error {
  readonly code = "RATE_LIMITED";
  readonly status = 429;
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("RATE_LIMITED");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class RateLimitConfigurationError extends Error {
  readonly code: string;
  readonly status = 503;

  constructor(code: string) {
    super(code);
    this.name = "RateLimitConfigurationError";
    this.code = code;
  }
}
