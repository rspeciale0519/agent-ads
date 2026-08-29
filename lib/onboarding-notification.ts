import { Resend } from "resend";
import { z } from "zod";
import { assertEmailDeliveryAllowed } from "./email-delivery-policy";

const notificationConfigSchema = z.object({
  apiKey: z.string().min(1),
  from: z.string().min(1).max(320),
  recipient: z.string().email().max(254),
}).strict();

export type OnboardingNotificationConfig = z.infer<typeof notificationConfigSchema>;

export function getOnboardingNotificationConfig(
  environment: Record<string, string | undefined> = process.env,
): OnboardingNotificationConfig {
  const parsed = notificationConfigSchema.safeParse({
    apiKey: environment.RESEND_API_KEY,
    from: environment.RESEND_FROM_EMAIL,
    recipient: environment.ONBOARDING_NOTIFICATION_EMAIL,
  });
  if (!parsed.success) {
    throw new OnboardingNotificationError("ONBOARDING_NOTIFICATION_NOT_CONFIGURED", 503);
  }
  try {
    assertEmailDeliveryAllowed(parsed.data.recipient, environment.EMAIL_DELIVERY_MODE);
  } catch {
    throw new OnboardingNotificationError("ONBOARDING_NOTIFICATION_NOT_CONFIGURED", 503);
  }
  return Object.freeze(parsed.data);
}

export async function sendOnboardingNotification(
  config: OnboardingNotificationConfig,
  message: {
    html: string;
    subject: string;
    submissionId: string;
    text: string;
  },
) {
  try {
    const result = await new Resend(config.apiKey).emails.send({
      from: config.from,
      to: [config.recipient],
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: { "X-MioDio-Submission-ID": message.submissionId },
    }, { idempotencyKey: `onboarding-${message.submissionId}` });
    if (result.error) {
      throw new OnboardingNotificationError("ONBOARDING_NOTIFICATION_FAILED", 502);
    }
  } catch (error) {
    if (error instanceof OnboardingNotificationError) throw error;
    throw new OnboardingNotificationError("ONBOARDING_NOTIFICATION_FAILED", 502);
  }
}

export class OnboardingNotificationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "OnboardingNotificationError";
    this.code = code;
    this.status = status;
  }
}
