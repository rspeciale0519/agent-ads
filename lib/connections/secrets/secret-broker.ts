import { createHmac, randomBytes, randomUUID } from "node:crypto";

export type SecretKind = "oauth_refresh_token" | "oauth_access_token" | "provider_api_key" | "pkce_verifier";

export type SecretBroker = {
  readonly backend: string;
  readonly keyVersion: string;
  put(input: { value: string; kind: SecretKind; expiresAt?: Date; opaqueName?: string }): Promise<{ handle: string; fingerprint: string }>;
  read(handle: string): Promise<string | null>;
  rotate(handle: string, input: { value: string; kind: SecretKind; expiresAt?: Date }): Promise<{ handle: string; fingerprint: string }>;
  destroy(handle: string): Promise<void>;
};

export function secretFingerprint(value: string) {
  const key = process.env.SECRET_FINGERPRINT_KEY;
  if (!key) throw new SecretBrokerError("SECRET_FINGERPRINT_KEY_MISSING");
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

export function randomOpaqueName() {
  return `secret-${randomBytes(24).toString("base64url")}`;
}

export class InMemorySecretBroker implements SecretBroker {
  readonly backend = "test-memory";
  readonly keyVersion = "test-v1";
  private readonly values = new Map<string, string>();

  async put(input: { value: string; kind: SecretKind }) {
    const handle = randomUUID();
    this.values.set(handle, input.value);
    return { handle, fingerprint: secretFingerprint(input.value) };
  }

  async read(handle: string) {
    return this.values.get(handle) ?? null;
  }

  async rotate(handle: string, input: { value: string; kind: SecretKind }) {
    if (!this.values.has(handle)) throw new SecretBrokerError("SECRET_NOT_FOUND");
    this.values.set(handle, input.value);
    return { handle, fingerprint: secretFingerprint(input.value) };
  }

  async destroy(handle: string) {
    this.values.delete(handle);
  }
}

export class SecretBrokerError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "SecretBrokerError";
    this.code = code;
  }
}
