import { describe, expect, it, vi } from "vitest";
import { activeCredentialReferenceWhere, readScopedCredentialSecret } from "./credential-reference-scope";

describe("active credential reference scope", () => {
  it("binds a reference to one organization and one connection", () => {
    expect(activeCredentialReferenceWhere("organization-a", "connection-a", "reference-a")).toEqual({
      id: "reference-a",
      organizationId: "organization-a",
      connectionId: "connection-a",
      cleanupStatus: "active",
    });
  });

  it("blocks a wrong-owner or inactive reference before broker access", async () => {
    const read = vi.fn(async () => "secret");
    await expect(readScopedCredentialSecret("reference-a", null, { read })).rejects.toMatchObject({
      code: "SECRET_REFERENCE_INVALID",
      status: 503,
    });
    expect(read).not.toHaveBeenCalled();
  });

  it("reads only the active reference returned by the ownership scope", async () => {
    const read = vi.fn(async () => "synthetic-secret");
    await expect(readScopedCredentialSecret(
      "reference-a",
      { brokerHandle: "opaque-handle" },
      { read },
    )).resolves.toBe("synthetic-secret");
    expect(read).toHaveBeenCalledWith("opaque-handle");
  });
});
