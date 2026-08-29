import { afterAll, describe, expect, it } from "vitest";
import { assertEmailDeliveryAllowed, EmailDeliveryPolicyError, resolveEmailDeliveryMode } from "./email-delivery-policy";

const originalDeliveryMode = process.env.EMAIL_DELIVERY_MODE;

afterAll(() => {
  if (originalDeliveryMode === undefined) delete process.env.EMAIL_DELIVERY_MODE;
  else process.env.EMAIL_DELIVERY_MODE = originalDeliveryMode;
});

describe("email delivery policy", () => {
  it("defaults a missing mode to disabled", () => {
    delete process.env.EMAIL_DELIVERY_MODE;
    expect(resolveEmailDeliveryMode()).toBe("disabled");
    expect(() => assertEmailDeliveryAllowed("delivered@resend.dev")).toThrowError(new EmailDeliveryPolicyError("EMAIL_DELIVERY_DISABLED"));
  });

  it("rejects an invalid mode", () => {
    expect(() => assertEmailDeliveryAllowed("delivered@resend.dev", "test")).toThrowError(new EmailDeliveryPolicyError("EMAIL_DELIVERY_MODE_INVALID"));
  });

  it("rejects all delivery when the mode is disabled", () => {
    expect(() => assertEmailDeliveryAllowed("delivered@resend.dev", "disabled")).toThrowError(new EmailDeliveryPolicyError("EMAIL_DELIVERY_DISABLED"));
  });

  it.each([
    "delivered@resend.dev",
    "delivered+onboarding@resend.dev",
    "bounced@resend.dev",
    "bounced+organization-invitation@resend.dev",
    "complained@resend.dev",
    "complained+security.review@resend.dev",
    "suppressed@resend.dev",
  ])("allows the official Resend test recipient %s", (recipient) => {
    expect(assertEmailDeliveryAllowed(recipient, "resend-test")).toBe("resend-test");
  });

  it.each([
    "person@example.com",
    "delivered@example.com",
    "unknown@resend.dev",
    "suppressed+label@resend.dev",
    "delivered+@resend.dev",
    "not-an-email",
  ])("rejects the non-test or malformed recipient %s in Resend test mode", (recipient) => {
    expect(() => assertEmailDeliveryAllowed(recipient, "resend-test")).toThrow(EmailDeliveryPolicyError);
  });

  it("allows valid recipients in live mode", () => {
    expect(assertEmailDeliveryAllowed("person+marketing@example.com", "live")).toBe("live");
  });

  it("rejects malformed recipients in live mode", () => {
    expect(() => assertEmailDeliveryAllowed("not-an-email", "live")).toThrowError(new EmailDeliveryPolicyError("EMAIL_DELIVERY_RECIPIENT_INVALID"));
  });
});
