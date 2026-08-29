import { describe, expect, it } from "vitest";
import { parseVerifiedSessionClaims } from "./session-claims";

describe("verified session claims", () => {
  it("accepts the required verified claims", () => {
    expect(parseVerifiedSessionClaims({
      sub: "user-1",
      session_id: "session-1",
      aal: "aal2",
      user_metadata: { role: "owner" },
    })).toMatchObject({ sub: "user-1", session_id: "session-1", aal: "aal2" });
  });

  it("rejects missing session binding", () => {
    expect(parseVerifiedSessionClaims({ sub: "user-1", aal: "aal2" })).toBeNull();
  });

  it("rejects unsupported assurance values", () => {
    expect(parseVerifiedSessionClaims({ sub: "user-1", session_id: "session-1", aal: "aal3" })).toBeNull();
  });
});
