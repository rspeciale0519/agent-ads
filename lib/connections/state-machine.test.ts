import { describe, expect, it } from "vitest";
import { assertConnectionArchivable, assertConnectionTransition, assertRequestTransition, canConnectionTransition } from "./state-machine";

describe("connection state machines", () => {
  it("allows the read-only lifecycle and blocks backwards terminal transitions", () => {
    expect(canConnectionTransition("pending", "authorizing")).toBe(true);
    expect(canConnectionTransition("pending", "active_read_only")).toBe(false);
    expect(canConnectionTransition("pending", "verifying")).toBe(true);
    expect(canConnectionTransition("active_read_only", "revoked")).toBe(true);
    expect(() => assertConnectionTransition("revoked", "active_read_only")).toThrow("CONNECTION_STATE_TRANSITION_NOT_ALLOWED");
  });

  it("requires request readiness before authorization", () => {
    expect(() => assertRequestTransition("draft", "awaiting_authorization")).toThrow("REQUEST_STATE_TRANSITION_NOT_ALLOWED");
    expect(() => assertRequestTransition("ready", "awaiting_authorization")).not.toThrow();
  });

  it("requires revocation and completed cleanup before archival", () => {
    expect(() => assertConnectionArchivable("active_read_only", false)).toThrow("CONNECTION_REVOKE_REQUIRED");
    expect(() => assertConnectionArchivable("revoked", true)).toThrow("CONNECTION_CLEANUP_PENDING");
    expect(() => assertConnectionArchivable("revoked", false)).not.toThrow();
  });
});
