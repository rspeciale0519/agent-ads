import { afterEach, describe, expect, it, vi } from "vitest";

const withTenantContextMock = vi.hoisted(() => vi.fn());
const withTenantFinalizationContextMock = vi.hoisted(() => vi.fn());
vi.mock("../auth/organization-context", () => ({
  withTenantContext: withTenantContextMock,
  withTenantFinalizationContext: withTenantFinalizationContextMock,
}));

import { canonicalJson, hashIdempotencyValue, mutationMetadata, runIdempotentMutation } from "./idempotency";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

const context = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  organizationName: "Test organization",
  userId: "22222222-2222-4222-8222-222222222222",
  authSubject: "33333333-3333-4333-8333-333333333333",
  email: "test@example.test",
  role: "owner" as const,
  permissions: ["connections.read"],
  sessionId: "session-1",
  assurance: "aal2" as const,
};

function mutationRequest() {
  return new Request("https://app.example.test/api/action", { method: "POST", headers: {
    "Idempotency-Key": "01J123456789ABCDEFGHJKMNPQ",
    "X-Correlation-Id": "browser.01J123456789ABCDEFGHJKMNPQ",
  } });
}

function mockStore(claimed: boolean, status: "pending" | "completed" | "failed", requestHash: string) {
  withTenantContextMock.mockReset();
  withTenantFinalizationContextMock.mockReset();
  const query = vi.fn().mockResolvedValue([{ id: "44444444-4444-4444-8444-444444444444", request_hash: requestHash, status, claimed }]);
  const update = vi.fn().mockResolvedValue(1);
  withTenantContextMock.mockImplementationOnce(async (_context, callback) => callback({ $queryRaw: query }));
  withTenantFinalizationContextMock.mockImplementationOnce(async (_context, callback) => callback({ $executeRaw: update }));
  return { query, update };
}

describe("mutation identity boundary", () => {
  it("requires validated idempotency and correlation headers", () => {
    const request = new Request("https://app.example.test/api/action", { headers: {
      "Idempotency-Key": "01J123456789ABCDEFGHJKMNPQ",
      "X-Correlation-Id": "browser.01J123456789ABCDEFGHJKMNPQ",
    } });
    expect(mutationMetadata(request)).toEqual({
      idempotencyKey: "01J123456789ABCDEFGHJKMNPQ",
      correlationId: "browser.01J123456789ABCDEFGHJKMNPQ",
    });
    expect(() => mutationMetadata(new Request("https://app.example.test"))).toThrow("IDEMPOTENCY_KEY_REQUIRED");
  });

  it("canonicalizes object keys before fingerprinting", () => {
    expect(canonicalJson({ z: 1, nested: { b: true, a: "x" } })).toBe(canonicalJson({ nested: { a: "x", b: true }, z: 1 }));
  });

  it("HMACs values and fails closed in production", () => {
    vi.stubEnv("IDEMPOTENCY_HMAC_KEY", "a-distinct-idempotency-test-key-at-least-32-bytes");
    const hashed = hashIdempotencyValue("sensitive-input");
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed).not.toContain("sensitive-input");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IDEMPOTENCY_HMAC_KEY", "");
    expect(() => hashIdempotencyValue("input")).toThrow("IDEMPOTENCY_KEY_NOT_CONFIGURED");
  });

  it("claims, executes, and completes a new mutation", async () => {
    vi.stubEnv("IDEMPOTENCY_HMAC_KEY", "a-distinct-idempotency-test-key-at-least-32-bytes");
    const requestHash = hashIdempotencyValue("request:connection.verify:{\"id\":\"connection-1\"}");
    const store = mockStore(true, "pending", requestHash);
    const execute = vi.fn().mockResolvedValue("complete");
    await expect(runIdempotentMutation(context, mutationRequest(), "connection.verify", { id: "connection-1" }, execute)).resolves.toBe("complete");
    expect(execute).toHaveBeenCalledOnce();
    expect(store.update).toHaveBeenCalledOnce();
  });

  it("blocks completed replay without executing the operation", async () => {
    vi.stubEnv("IDEMPOTENCY_HMAC_KEY", "a-distinct-idempotency-test-key-at-least-32-bytes");
    const requestHash = hashIdempotencyValue("request:connection.verify:{\"id\":\"connection-1\"}");
    mockStore(false, "completed", requestHash);
    const execute = vi.fn();
    await expect(runIdempotentMutation(context, mutationRequest(), "connection.verify", { id: "connection-1" }, execute)).rejects.toThrow("IDEMPOTENCY_ALREADY_COMPLETED");
    expect(execute).not.toHaveBeenCalled();
    expect(withTenantContextMock).toHaveBeenCalledOnce();
  });

  it("rejects reuse of a key for a different request fingerprint", async () => {
    vi.stubEnv("IDEMPOTENCY_HMAC_KEY", "a-distinct-idempotency-test-key-at-least-32-bytes");
    mockStore(false, "pending", hashIdempotencyValue("request:connection.verify:{\"id\":\"different\"}"));
    await expect(runIdempotentMutation(context, mutationRequest(), "connection.verify", { id: "connection-1" }, vi.fn())).rejects.toThrow("IDEMPOTENCY_KEY_REUSED");
  });

  it("marks a failed operation terminal before returning its error", async () => {
    vi.stubEnv("IDEMPOTENCY_HMAC_KEY", "a-distinct-idempotency-test-key-at-least-32-bytes");
    const requestHash = hashIdempotencyValue("request:connection.verify:{\"id\":\"connection-1\"}");
    const store = mockStore(true, "pending", requestHash);
    const execute = vi.fn().mockRejectedValue(new Error("provider failed"));
    await expect(runIdempotentMutation(context, mutationRequest(), "connection.verify", { id: "connection-1" }, execute)).rejects.toThrow("provider failed");
    expect(store.update).toHaveBeenCalledOnce();
  });
});
