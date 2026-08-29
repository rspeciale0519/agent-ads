import { describe, expect, it } from "vitest";
import { hasPermission, permissionsForRole } from "./permissions";

describe("organization permissions", () => {
  it("keeps members read-only and owners fully capable", () => {
    expect(permissionsForRole("member")).toEqual(["connections.view"]);
    expect(permissionsForRole("owner")).toContain("connections.revoke");
    expect(permissionsForRole("owner")).toContain("membership.manage");
    expect(hasPermission(permissionsForRole("member"), "membership.manage")).toBe(false);
    expect(hasPermission(permissionsForRole("operator"), "connections.secrets.rotate")).toBe(false);
  });
});
