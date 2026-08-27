import { createHash, createHmac, randomBytes } from "node:crypto";

const OAUTH_TTL_MS = 10 * 60 * 1000;
export const OAUTH_BROWSER_COOKIE = "miodio_oauth_transaction";

export function createPkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function hashOAuthState(state: string) {
  const key = process.env.OAUTH_STATE_HMAC_KEY;
  if (!key) throw new OAuthError("OAUTH_STATE_KEY_MISSING");
  return createHmac("sha256", key).update(state, "utf8").digest("hex");
}

export function expiresAt() {
  return new Date(Date.now() + OAUTH_TTL_MS);
}

export function isBrowserTransactionId(value: string | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function safeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\n") || value.includes("\r")) return "/connections";
  const allowed = ["/connections", "/dashboard"];
  return allowed.includes(value) || value.startsWith("/connections/") ? value : "/connections";
}

export function assertProviderCallback(provider: string, expectedProvider: string) {
  if (provider !== expectedProvider) throw new OAuthError("OAUTH_PROVIDER_MISMATCH");
}

export class OAuthError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "OAuthError";
    this.code = code;
  }
}
