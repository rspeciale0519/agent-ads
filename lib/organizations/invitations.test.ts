import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { resendSendMock } = vi.hoisted(() => ({
  resendSendMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSendMock };
  },
}));

import { assertInvitationRecipient, assertInvitationUsable, deliverInvitationWithCompensation, InvitationError, sendInvitationEmail } from "./invitations";

const originalEmailEnvironment = {
  EMAIL_DELIVERY_MODE: process.env.EMAIL_DELIVERY_MODE,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
};

beforeEach(() => {
  resendSendMock.mockReset();
  resendSendMock.mockResolvedValue({ data: { id: "synthetic-message" }, error: null });
  process.env.RESEND_API_KEY = "synthetic-resend-key";
  process.env.RESEND_FROM_EMAIL = "Agent Ads <test@example.invalid>";
});

afterAll(() => {
  for (const [name, value] of Object.entries(originalEmailEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

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

  it("preserves a delivery configuration error after compensation", async () => {
    const error = new InvitationError("INVITATION_EMAIL_NOT_CONFIGURED", 503);
    await expect(deliverInvitationWithCompensation(
      async () => { throw error; },
      async () => undefined,
    )).rejects.toThrowError(error);
  });
});

describe("organization invitation email delivery", () => {
  it("fails closed when delivery is disabled", async () => {
    process.env.EMAIL_DELIVERY_MODE = "disabled";
    await expect(sendInvitationEmail(
      "delivered@resend.dev",
      "Synthetic Organization",
      "synthetic-code",
      "synthetic-invitation",
    )).rejects.toThrowError(new InvitationError("INVITATION_EMAIL_NOT_CONFIGURED", 503));
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("sends to an approved Resend test recipient", async () => {
    process.env.EMAIL_DELIVERY_MODE = "resend-test";
    await sendInvitationEmail(
      "delivered+invitation@resend.dev",
      "Synthetic Organization",
      "synthetic-code",
      "synthetic-invitation",
    );
    expect(resendSendMock).toHaveBeenCalledOnce();
  });

  it("fails closed for an invalid delivery mode", async () => {
    process.env.EMAIL_DELIVERY_MODE = "invalid";
    await expect(sendInvitationEmail(
      "delivered@resend.dev",
      "Synthetic Organization",
      "synthetic-code",
      "synthetic-invitation",
    )).rejects.toThrowError(new InvitationError("INVITATION_EMAIL_NOT_CONFIGURED", 503));
  });

  it("allows a valid live recipient only in live mode", async () => {
    process.env.EMAIL_DELIVERY_MODE = "live";
    await sendInvitationEmail(
      "person@example.com",
      "Synthetic Organization",
      "synthetic-code",
      "synthetic-invitation",
    );
    expect(resendSendMock).toHaveBeenCalledOnce();
  });
});
