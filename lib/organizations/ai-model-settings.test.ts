import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrganizationContext } from "../auth/organization-context";
import type { SecretBroker } from "../connections/secrets/secret-broker";

// Stand-ins for the database, MFA check, and audit log.
const withTenantContextMock = vi.hoisted(() => vi.fn());
const auditMock = vi.hoisted(() => vi.fn());
vi.mock("../auth/organization-context", () => ({ withTenantContext: withTenantContextMock }));
vi.mock("../auth/assurance", () => ({ getAssuranceStatus: vi.fn().mockResolvedValue({}), requireAal2: () => undefined }));
vi.mock("../audit", () => ({ appendAuditEvent: auditMock }));

import { readAiModelCredential, readAiModelSettings, removeAiModelSettings, saveAiModelSettings } from "./ai-model-settings";

const organizationId = "00000000-0000-4000-8000-000000000001";
const owner: OrganizationContext = { organizationId, organizationName: "Pilot Org", userId: "00000000-0000-4000-8000-000000000002", authSubject: "00000000-0000-4000-8000-000000000003", email: "owner@example.test", role: "owner", permissions: ["organization.settings.manage"], sessionId: "session", assurance: "aal2" };
const apiKey = "sk-live-abcdefghijklmnop1234";

function fakeBroker(): SecretBroker & { put: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn>; destroyByName: ReturnType<typeof vi.fn>; read: ReturnType<typeof vi.fn> } {
  return {
    backend: "test-memory",
    keyVersion: "test-v1",
    put: vi.fn().mockResolvedValue({ handle: "new-handle", fingerprint: "fp" }),
    read: vi.fn().mockResolvedValue(apiKey),
    rotate: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
    destroyByName: vi.fn().mockResolvedValue(undefined),
  };
}

type Row = { provider: string; model: string; brokerHandle: string } | null;
// A fake database with the credential table, the key-cleanup queue, and the
// pending-key records (Vault name -> when it was recorded).
function mockDatabase(existing: Row, options: { failUpsert?: boolean; queued?: string[]; pending?: Record<string, Date> } = {}) {
  const queue = new Set(options.queued ?? []);
  const table = {
    findUnique: vi.fn().mockResolvedValue(existing),
    upsert: vi.fn().mockImplementation(async ({ create, update }) => {
      if (options.failUpsert) throw new Error("DB_DOWN");
      const values = existing ? update : create;
      return { provider: values.provider, model: values.model, keyHint: values.keyHint ?? "wxyz", updatedAt: new Date("2026-09-30T00:00:00.000Z") };
    }),
    delete: vi.fn().mockResolvedValue({}),
  };
  const cleanup = {
    queue,
    create: vi.fn().mockImplementation(async ({ data }) => { queue.add(data.brokerHandle); return data; }),
    findMany: vi.fn().mockImplementation(async () => [...queue].map((brokerHandle) => ({ brokerHandle }))),
    deleteMany: vi.fn().mockImplementation(async ({ where }) => { queue.delete(where.brokerHandle); return { count: 1 }; }),
  };
  const pendingRows = new Map(Object.entries(options.pending ?? {}));
  const pending = {
    rows: pendingRows,
    create: vi.fn().mockImplementation(async ({ data }) => { pendingRows.set(data.vaultName, new Date()); return data; }),
    findMany: vi.fn().mockImplementation(async ({ where }) => [...pendingRows].filter(([, queuedAt]) => queuedAt < where.queuedAt.lt).map(([vaultName]) => ({ vaultName }))),
    deleteMany: vi.fn().mockImplementation(async ({ where }) => { pendingRows.delete(where.vaultName); return { count: 1 }; }),
  };
  const $queryRaw = vi.fn().mockResolvedValue([{ locked: 1 }]);
  withTenantContextMock.mockImplementation(async (_context, callback) => callback({ organizationAiCredential: table, organizationAiCredentialCleanup: cleanup, organizationAiCredentialPendingKey: pending, $queryRaw }));
  return Object.assign(table, { cleanup, pending });
}

afterEach(() => vi.clearAllMocks());

describe("AI model settings", () => {
  it("stores a new key in the Vault and saves only its handle, hint, and fingerprint", async () => {
    const broker = fakeBroker();
    const table = mockDatabase(null);
    const saved = await saveAiModelSettings(owner, { provider: "openai", model: "gpt-test", apiKey }, "c", broker);
    // The Vault name is recorded before the key is written, and cleared once saved.
    const vaultName = table.pending.create.mock.calls[0][0].data.vaultName;
    expect(broker.put).toHaveBeenCalledWith({ value: apiKey, kind: "provider_api_key", opaqueName: vaultName });
    expect(table.pending.create.mock.invocationCallOrder[0]).toBeLessThan(broker.put.mock.invocationCallOrder[0]);
    expect(table.pending.rows.size).toBe(0);
    expect(table.upsert.mock.calls[0][0].create).toMatchObject({ provider: "openai", model: "gpt-test", brokerHandle: "new-handle", keyHint: "1234", fingerprint: "fp", updatedBy: owner.userId });
    expect(saved).toMatchObject({ provider: "openai", model: "gpt-test", keyHint: "1234" });
    // The key never reaches the audit log or the returned settings.
    expect(JSON.stringify(auditMock.mock.calls)).not.toContain(apiKey);
    expect(JSON.stringify(saved)).not.toContain(apiKey);
  });

  it("queues the replaced key in the save transaction and deletes it afterwards", async () => {
    const broker = fakeBroker();
    const table = mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    await saveAiModelSettings(owner, { provider: "openai", model: "gpt-new", apiKey }, "c", broker);
    expect(table.cleanup.create).toHaveBeenCalledWith({ data: { brokerHandle: "old-handle", organizationId } });
    expect(broker.destroy).toHaveBeenCalledWith("old-handle");
    expect(table.cleanup.queue.size).toBe(0);
  });

  it("keeps a replaced key queued when the Vault delete fails, and retries it later", async () => {
    const broker = fakeBroker();
    broker.destroy.mockRejectedValueOnce(new Error("VAULT_DOWN"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const table = mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    await saveAiModelSettings(owner, { provider: "openai", model: "gpt-new", apiKey }, "c", broker);
    expect([...table.cleanup.queue]).toEqual(["old-handle"]);
    // The next change retries the queued delete.
    await saveAiModelSettings(owner, { provider: "openai", model: "gpt-newer" }, "c", broker);
    expect(table.cleanup.queue.size).toBe(0);
  });

  it("keeps the saved key when only the model name changes", async () => {
    const broker = fakeBroker();
    const table = mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    await saveAiModelSettings(owner, { provider: "openai", model: "gpt-new" }, "c", broker);
    expect(broker.put).not.toHaveBeenCalled();
    expect(broker.destroy).not.toHaveBeenCalled();
    expect(table.upsert.mock.calls[0][0].update).not.toHaveProperty("brokerHandle");
  });

  it("requires a new key when first saving or switching companies", async () => {
    const broker = fakeBroker();
    mockDatabase(null);
    await expect(saveAiModelSettings(owner, { provider: "openai", model: "gpt-test" }, "c", broker)).rejects.toMatchObject({ code: "AI_MODEL_KEY_REQUIRED" });
    mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    await expect(saveAiModelSettings(owner, { provider: "anthropic", model: "claude-opus-5-5" }, "c", broker)).rejects.toMatchObject({ code: "AI_MODEL_KEY_REQUIRED" });
    expect(broker.destroy).not.toHaveBeenCalled();
  });

  it("removes the new key from the Vault by name when the save fails, and keeps the old one", async () => {
    const broker = fakeBroker();
    const table = mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" }, { failUpsert: true });
    await expect(saveAiModelSettings(owner, { provider: "openai", model: "gpt-new", apiKey }, "c", broker)).rejects.toThrow("DB_DOWN");
    const vaultName = table.pending.create.mock.calls[0][0].data.vaultName;
    expect(broker.destroyByName.mock.calls).toEqual([[vaultName]]);
    expect(broker.destroy).not.toHaveBeenCalled();
    expect(table.pending.rows.size).toBe(0);
    expect(table.cleanup.queue.size).toBe(0);
  });

  it("keeps the new key's pending record when it cannot be deleted right away", async () => {
    const broker = fakeBroker();
    broker.destroyByName.mockRejectedValue(new Error("VAULT_DOWN"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const table = mockDatabase(null, { failUpsert: true });
    await expect(saveAiModelSettings(owner, { provider: "openai", model: "gpt-new", apiKey }, "c", broker)).rejects.toThrow("DB_DOWN");
    expect(table.pending.rows.size).toBe(1);
  });

  it("records the pending key before writing to the Vault, so a closed workspace gets no key", async () => {
    const broker = fakeBroker();
    const table = mockDatabase(null);
    table.pending.create.mockRejectedValue(new Error("ORGANIZATION_ACCESS_PENDING"));
    await expect(saveAiModelSettings(owner, { provider: "openai", model: "gpt-new", apiKey }, "c", broker)).rejects.toThrow("ORGANIZATION_ACCESS_PENDING");
    expect(broker.put).not.toHaveBeenCalled();
  });

  it("deletes abandoned pending keys, but leaves ones that may still be saving", async () => {
    const broker = fakeBroker();
    const table = mockDatabase(null, { pending: { "secret-old": new Date(Date.now() - 60 * 60_000), "secret-new": new Date() } });
    expect(await removeAiModelSettings(owner, "c", broker, { failClosed: true })).toEqual({ removed: false });
    expect(broker.destroyByName.mock.calls).toEqual([["secret-old"]]);
    expect([...table.pending.rows.keys()]).toEqual(["secret-new"]);
  });

  it.each([
    { provider: "custom", model: "x", apiKey },
    { provider: "openai", model: "gpt test; drop", apiKey },
    { provider: "openai", model: "gpt-test", apiKey: "short" },
    { provider: "openai", model: "gpt-test", apiKey, baseUrl: "https://evil.example" },
  ])("rejects invalid input %#", async (input) => {
    const broker = fakeBroker();
    mockDatabase(null);
    await expect(saveAiModelSettings(owner, input, "c", broker)).rejects.toThrow();
    expect(broker.put).not.toHaveBeenCalled();
  });

  it("refuses people without the settings permission", async () => {
    const broker = fakeBroker();
    await expect(saveAiModelSettings({ ...owner, role: "member", permissions: ["connections.view"] }, { provider: "openai", model: "gpt-test", apiKey }, "c", broker)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    // Even the saved model and key hint are hidden from them.
    await expect(readAiModelSettings({ ...owner, role: "member", permissions: ["connections.view"] })).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(removeAiModelSettings({ ...owner, role: "member", permissions: ["connections.view"] }, "c", broker)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("removes the choice and destroys its key", async () => {
    const broker = fakeBroker();
    const table = mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    expect(await removeAiModelSettings(owner, "c", broker)).toEqual({ removed: true });
    expect(table.delete).toHaveBeenCalled();
    expect(broker.destroy).toHaveBeenCalledWith("old-handle");
  });

  it("keeps offboarding stopped on every retry until the key is deleted", async () => {
    const broker = fakeBroker();
    broker.destroy.mockRejectedValue(new Error("VAULT_DOWN"));
    const table = mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    await expect(removeAiModelSettings(owner, "c", broker, { failClosed: true })).rejects.toThrow("VAULT_DOWN");
    expect([...table.cleanup.queue]).toEqual(["old-handle"]);
    // A retry no longer finds the credential row, but the queued key still blocks it.
    table.findUnique.mockResolvedValue(null);
    await expect(removeAiModelSettings(owner, "c", broker, { failClosed: true })).rejects.toThrow("VAULT_DOWN");
    // Once the Vault works again, the retry completes and the queue is empty.
    broker.destroy.mockResolvedValue(undefined);
    expect(await removeAiModelSettings(owner, "c", broker, { failClosed: true })).toEqual({ removed: false });
    expect(table.cleanup.queue.size).toBe(0);
  });

  it("outside offboarding, a failed delete is logged and stays queued", async () => {
    const broker = fakeBroker();
    broker.destroy.mockRejectedValue(new Error("VAULT_DOWN"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const table = mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    expect(await removeAiModelSettings(owner, "c", broker)).toEqual({ removed: true });
    expect([...table.cleanup.queue]).toEqual(["old-handle"]);
  });

  it("reads the key only when a model is saved", async () => {
    const broker = fakeBroker();
    const getBroker = vi.fn(() => broker);
    mockDatabase(null);
    expect(await readAiModelCredential(owner, getBroker)).toBeNull();
    expect(getBroker).not.toHaveBeenCalled();
    mockDatabase({ provider: "openai", model: "gpt-test", brokerHandle: "handle" });
    expect(await readAiModelCredential(owner, getBroker)).toEqual({ provider: "openai", model: "gpt-test", apiKey });
    broker.read.mockResolvedValue(null);
    await expect(readAiModelCredential(owner, getBroker)).rejects.toThrow("AI_MODEL_KEY_UNREADABLE");
  });
});
