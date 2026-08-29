import { beforeEach, describe, expect, it, vi } from "vitest";

const { resendSendMock } = vi.hoisted(() => ({
  resendSendMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSendMock };
  },
}));

import {
  getOnboardingNotificationConfig,
  OnboardingNotificationError,
  sendOnboardingNotification,
} from "./onboarding-notification";

const baseEnvironment = {
  EMAIL_DELIVERY_MODE: "resend-test",
  ONBOARDING_NOTIFICATION_EMAIL: "delivered@resend.dev",
  RESEND_API_KEY: "synthetic-resend-key",
  RESEND_FROM_EMAIL: "Agent Ads <test@example.invalid>",
};
const message = {
  html: "<p>Synthetic onboarding</p>",
  subject: "Synthetic onboarding",
  submissionId: "00000000-0000-4000-8000-000000000001",
  text: "Synthetic onboarding",
};

beforeEach(() => {
  resendSendMock.mockReset();
  resendSendMock.mockResolvedValue({ data: { id: "synthetic-message" }, error: null });
});

describe("onboarding notification delivery", () => {
  it("fails closed when delivery is disabled", () => {
    expect(() => getOnboardingNotificationConfig({
      ...baseEnvironment,
      EMAIL_DELIVERY_MODE: "disabled",
    })).toThrowError(new OnboardingNotificationError(
      "ONBOARDING_NOTIFICATION_NOT_CONFIGURED",
      503,
    ));
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("sends only to an approved Resend test recipient in test mode", async () => {
    const config = getOnboardingNotificationConfig(baseEnvironment);
    await sendOnboardingNotification(config, message);
    expect(resendSendMock).toHaveBeenCalledOnce();

    expect(() => getOnboardingNotificationConfig({
      ...baseEnvironment,
      ONBOARDING_NOTIFICATION_EMAIL: "person@example.com",
    })).toThrowError(new OnboardingNotificationError(
      "ONBOARDING_NOTIFICATION_NOT_CONFIGURED",
      503,
    ));
  });

  it("fails closed for an invalid delivery mode", () => {
    expect(() => getOnboardingNotificationConfig({
      ...baseEnvironment,
      EMAIL_DELIVERY_MODE: "invalid",
    })).toThrowError(new OnboardingNotificationError(
      "ONBOARDING_NOTIFICATION_NOT_CONFIGURED",
      503,
    ));
  });

  it("allows a valid live recipient only in live mode", async () => {
    const config = getOnboardingNotificationConfig({
      ...baseEnvironment,
      EMAIL_DELIVERY_MODE: "live",
      ONBOARDING_NOTIFICATION_EMAIL: "person@example.com",
    });
    await sendOnboardingNotification(config, message);
    expect(resendSendMock).toHaveBeenCalledOnce();
  });

  it("returns one stable provider failure without provider details", async () => {
    resendSendMock.mockResolvedValue({ data: null, error: { message: "private-provider-error" } });
    const config = getOnboardingNotificationConfig(baseEnvironment);
    await expect(sendOnboardingNotification(config, message)).rejects.toThrowError(
      new OnboardingNotificationError("ONBOARDING_NOTIFICATION_FAILED", 502),
    );
  });
});
