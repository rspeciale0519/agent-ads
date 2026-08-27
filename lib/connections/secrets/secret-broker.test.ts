import { beforeEach, describe, expect, it } from "vitest";
import { InMemorySecretBroker } from "./secret-broker";
import { SupabaseVaultSecretBroker } from "./supabase-vault";

describe("secret broker contract", () => {
  beforeEach(() => { process.env.SECRET_FINGERPRINT_KEY = "test-fingerprint-key"; });

  it("stores, rotates, and destroys through opaque handles", async () => {
    const broker = new InMemorySecretBroker();
    const original = await broker.put({ value: "synthetic-token", kind: "oauth_refresh_token" });
    expect(original.handle).not.toContain("synthetic");
    expect(await broker.read(original.handle)).toBe("synthetic-token");
    const rotated = await broker.rotate(original.handle, { value: "rotated-token", kind: "oauth_refresh_token" });
    expect(rotated.fingerprint).not.toBe(original.fingerprint);
    await broker.destroy(rotated.handle);
    expect(await broker.read(rotated.handle)).toBeNull();
  });

  it("destroys a replacement when old-handle rotation cleanup fails", async () => {
    const broker = Object.create(SupabaseVaultSecretBroker.prototype) as SupabaseVaultSecretBroker;
    const destroyed: string[] = [];
    broker.read = async (handle) => handle === "old-handle" ? "old-secret" : "replacement-secret";
    broker.put = async () => ({ handle: "replacement-handle", fingerprint: "replacement-fingerprint" });
    broker.destroy = async (handle) => {
      destroyed.push(handle);
      if (handle === "old-handle") throw new Error("old destroy failed");
    };

    await expect(broker.rotate("old-handle", { value: "replacement-secret", kind: "oauth_refresh_token" })).rejects.toMatchObject({ code: "SECRET_ROTATION_FAILED" });
    expect(destroyed).toEqual(["old-handle", "replacement-handle"]);
  });
});
