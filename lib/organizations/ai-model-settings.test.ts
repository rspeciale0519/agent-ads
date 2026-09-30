import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrganizationContext } from "../auth/organization-context";
import type { SecretBroker } from "../connections/secrets/secret-broker";

// Stand-ins for the database, MFA check, and audit log.
const withTenantContextMock = vi.hoisted(() => vi.fn());
const auditMock = vi.hoisted(() => vi.fn());
vi.mock("../auth/organization-context", () => ({ withTenantContext: withTenantContextMock }));
vi.mock("../auth/assurance", () => ({ getAssuranceStatus: vi.fn().mockResolvedValue({}), requireAal2: () => undefined }));
vi.mock("../audit", () => ({ appendAuditEvent: auditMock }));

import { readAiModelCredential, removeAiModelSettings, saveAiModelSettings } from "./ai-model-settings";

const organizationId = "00000000-0000-4000-8000-000000000001";
const owner: OrganizationContext = { organizationId, organizationName: "Pilot Org", userId: "00000000-0000-4000-8000-000000000002", authSubject: "00000000-0000-4000-8000-000000000003", email: "owner@example.test", role: "owner", permissions: ["organization.settings.manage"], sessionId: "session", assurance: "aal2" };
const apiKey = "sk-live-abcdefghijklmnop1234";

function fakeBroker(): SecretBroker & { put: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn>; read: ReturnType<typeof vi.fn> } {
  return {
    backend: "test-memory",
    keyVersion: "test-v1",
    put: vi.fn().mockResolvedValue({ handle: "new-handle", fingerprint: "fp" }),
    read: vi.fn().mockResolvedValue(apiKey),
    rotate: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

type Row = { provider: string; model: string; brokerHandle: string } | null;
function mockDatabase(existing: Row, options: { failUpsert?: boolean } = {}) {
  const table = {
    findUnique: vi.fn().mockResolvedValue(existing),
    upsert: vi.fn().mockImplementation(async ({ create, update }) => {
      if (options.failUpsert) throw new Error("DB_DOWN");
      const values = existing ? update : create;
      return { provider: values.provider, model: values.model, keyHint: values.keyHint ?? "wxyz", updatedAt: new Date("2026-09-30T00:00:00.000Z") };
    }),
    delete: vi.fn().mockResolvedValue({}),
  };
  const $queryRaw = vi.fn().mockResolvedValue([{ locked: 1 }]);
  withTenantContextMock.mockImplementation(async (_context, callback) => callback({ organizationAiCredential: table, $queryRaw }));
  return table;
}

afterEach(() => vi.clearAllMocks());

describe("AI model settings", () => {
  it("stores a new key in the Vault and saves only its handle, hint, and fingerprint", async () => {
    const broker = fakeBroker();
    const table = mockDatabase(null);
    const saved = await saveAiModelSettings(owner, { provider: "openai", model: "gpt-test", apiKey }, "c", broker);
    expect(broker.put).toHaveBeenCalledWith({ value: apiKey, kind: "provider_api_key" });
    expect(table.upsert.mock.calls[0][0].create).toMatchObject({ provider: "openai", model: "gpt-test", brokerHandle: "new-handle", keyHint: "1234", fingerprint: "fp", updatedBy: owner.userId });
    expect(saved).toMatchObject({ provider: "openai", model: "gpt-test", keyHint: "1234" });
    // The key never reaches the audit log or the returned settings.
    expect(JSON.stringify(auditMock.mock.calls)).not.toContain(apiKey);
    expect(JSON.stringify(saved)).not.toContain(apiKey);
  });

  it("destroys the replaced key only after the new one is saved", async () => {
    const broker = fakeBroker();
    mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    await saveAiModelSettings(owner, { provider: "openai", model: "gpt-new", apiKey }, "c", broker);
    expect(broker.destroy).toHaveBeenCalledWith("old-handle");
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

  it("removes the new key from the Vault when the save fails, and keeps the old one", async () => {
    const broker = fakeBroker();
    mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" }, { failUpsert: true });
    await expect(saveAiModelSettings(owner, { provider: "openai", model: "gpt-new", apiKey }, "c", broker)).rejects.toThrow("DB_DOWN");
    expect(broker.destroy.mock.calls).toEqual([["new-handle"]]);
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
    await expect(removeAiModelSettings({ ...owner, role: "member", permissions: ["connections.view"] }, "c", broker)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("removes the choice and destroys its key", async () => {
    const broker = fakeBroker();
    const table = mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    expect(await removeAiModelSettings(owner, "c", broker)).toEqual({ removed: true });
    expect(table.delete).toHaveBeenCalled();
    expect(broker.destroy).toHaveBeenCalledWith("old-handle");
  });

  it("stops offboarding when the key cannot be destroyed", async () => {
    const broker = fakeBroker();
    broker.destroy.mockRejectedValue(new Error("VAULT_DOWN"));
    mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    await expect(removeAiModelSettings(owner, "c", broker, { failClosed: true })).rejects.toThrow("VAULT_DOWN");
    // Outside offboarding the failure is logged and the removal still succeeds.
    mockDatabase({ provider: "openai", model: "gpt-old", brokerHandle: "old-handle" });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await removeAiModelSettings(owner, "c", broker)).toEqual({ removed: true });
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
