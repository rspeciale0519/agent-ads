import { describe, expect, it, vi } from "vitest";
import { assertInvitationRecipient, assertInvitationUsable, deliverInvitationWithCompensation, InvitationError } from "./invitations";

const usable = (overrides: Partial<{ status: string; expires_at: Date }> = {}) => ({ status: "pending", expires_at: new Date("2030-01-02T00:00:00.000Z"), ...overrides });

describe("organization invitation acceptance guards", () => {
  it("accepts a pending invitation before expiry", () => {
    expect(() => assertInvitationUsable(usable(), new Date("2030-01-01T00:00:00.000Z"))).not.toThrow();
  });

  it.each(["expired", "revoked", "accepted"]) ("rejects a %s or replayed invitation", (status) => {
    expect(() => assertInvitationUsable(usable({ status }), new Date("2030-01-01T00:00:00.000Z"))).toThrowError(new InvitationError("INVITATION_INVALID", 409));
  });

  it("rejects an invitation after its expiry time", () => {
    expect(() => assertInvitationUsable(usable(), new Date("2030-01-02T00:00:00.000Z"))).toThrowError(new InvitationError("INVITATION_INVALID", 409));
  });

  it("requires both the attributed auth subject and matching email", () => {
    const invitation = { recipient_auth_subject: "auth-todd", recipient_email: "Todd@Example.com" };
    expect(() => assertInvitationRecipient(invitation, { authSubject: "auth-todd", email: "todd@example.com" })).not.toThrow();
    expect(() => assertInvitationRecipient(invitation, { authSubject: "other-auth", email: "todd@example.com" })).toThrowError(new InvitationError("INVITATION_RECIPIENT_MISMATCH", 403));
    expect(() => assertInvitationRecipient(invitation, { authSubject: "auth-todd", email: "other@example.com" })).toThrowError(new InvitationError("INVITATION_RECIPIENT_MISMATCH", 403));
  });

  it("revokes a newly created invitation when delivery fails", async () => {
    const compensate = vi.fn(async () => undefined);
    await expect(deliverInvitationWithCompensation(
      async () => { throw new Error("delivery failed"); },
      compensate,
    )).rejects.toThrowError(new InvitationError("INVITATION_EMAIL_FAILED", 502));
    expect(compensate).toHaveBeenCalledOnce();
  });

  it("surfaces a fail-closed error when delivery compensation also fails", async () => {
    await expect(deliverInvitationWithCompensation(
      async () => { throw new Error("delivery failed"); },
      async () => { throw new Error("database unavailable"); },
    )).rejects.toThrowError(new InvitationError("INVITATION_DELIVERY_COMPENSATION_FAILED", 503));
  });
});
