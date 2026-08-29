import { z } from "zod";

const emailDeliveryModeSchema = z.enum(["disabled", "resend-test", "live"]);
const emailRecipientSchema = z.string().email().max(254);
const labeledResendTestRecipients = new Set(["delivered", "bounced", "complained"]);

export type EmailDeliveryMode = z.infer<typeof emailDeliveryModeSchema>;

export function resolveEmailDeliveryMode(configuredMode = process.env.EMAIL_DELIVERY_MODE): EmailDeliveryMode {
  const parsed = emailDeliveryModeSchema.safeParse(configuredMode ?? "disabled");
  if (!parsed.success) throw new EmailDeliveryPolicyError("EMAIL_DELIVERY_MODE_INVALID");
  return parsed.data;
}

export function assertEmailDeliveryAllowed(recipient: string, configuredMode = process.env.EMAIL_DELIVERY_MODE): EmailDeliveryMode {
  const mode = resolveEmailDeliveryMode(configuredMode);
  if (mode === "disabled") throw new EmailDeliveryPolicyError("EMAIL_DELIVERY_DISABLED");
  if (!emailRecipientSchema.safeParse(recipient).success) throw new EmailDeliveryPolicyError("EMAIL_DELIVERY_RECIPIENT_INVALID");
  if (mode === "resend-test" && !isResendTestRecipient(recipient)) {
    throw new EmailDeliveryPolicyError("EMAIL_DELIVERY_RECIPIENT_NOT_ALLOWED");
  }
  return mode;
}

function isResendTestRecipient(recipient: string) {
  const [localPart, domain, extraPart] = recipient.toLowerCase().split("@");
  if (extraPart || domain !== "resend.dev") return false;
  if (localPart === "suppressed") return true;

  const labelSeparator = localPart.indexOf("+");
  if (labelSeparator === -1) return labeledResendTestRecipients.has(localPart);
  const base = localPart.slice(0, labelSeparator);
  const label = localPart.slice(labelSeparator + 1);
  return labeledResendTestRecipients.has(base) && label.length > 0;
}

export class EmailDeliveryPolicyError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "EmailDeliveryPolicyError";
    this.code = code;
  }
}
