import { describe, expect, it } from "vitest";
import { maintenanceRequestAuthorized, summarizeCleanupOutcomes } from "./maintenance";

describe("Account Connections maintenance", () => {
  const token = "maintenance-token-with-at-least-32-characters";

  it("requires an exact bearer token and rejects missing or short configuration", () => {
    expect(maintenanceRequestAuthorized(`Bearer ${token}`, token)).toBe(true);
    expect(maintenanceRequestAuthorized("Bearer wrong-token", token)).toBe(false);
    expect(maintenanceRequestAuthorized(null, token)).toBe(false);
    expect(maintenanceRequestAuthorized("Bearer short", "short")).toBe(false);
  });

  it("returns safe aggregate cleanup outcomes only", () => {
    expect(summarizeCleanupOutcomes([
      { cleanup_outcome: "destroyed" },
      { cleanup_outcome: "already_absent" },
      { cleanup_outcome: "invalid_reference" },
    ])).toEqual({ processed: 3, destroyed: 1, alreadyAbsent: 1, invalidReferences: 1 });
  });
});
