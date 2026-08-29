import { z } from "zod";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_FILES, isAllowedUpload } from "./upload-rules";
import { findSecretPattern, isUnsafeCredentialDocumentName } from "./security/secret-material";

const paidChannels = ["Meta Ads", "Google Ads", "Microsoft Advertising", "LinkedIn Ads", "TikTok Ads", "Reddit Ads", "X Ads"] as const;
const organicChannels = ["LinkedIn", "X", "Instagram", "TikTok", "Facebook", "YouTube", "Reddit"] as const;
export const ONBOARDING_LONG_TEXT_MAX_LENGTH = 5000;

const onboardingFormObjectSchema = z.object({
  businessName: z.string().trim().min(1, "Enter the business name.").max(180, "Keep the business name under 180 characters."),
  website: z.string().trim().min(1, "Enter the business website.").url("Enter a full website address, including https://").max(500, "Keep the website address under 500 characters."),
  description: z.string().trim().max(ONBOARDING_LONG_TEXT_MAX_LENGTH, "Keep the offer and audience description at 5,000 characters or fewer."),
  locations: z.string().trim().max(1000, "Keep the markets and service areas under 1,000 characters."),
  businessModel: z.enum(["B2B", "B2C", "B2B2C", "Other", ""], { error: "Choose a valid business model." }),
  primaryGoal: z.enum(["qualified-leads", "revenue", "pipeline", "awareness", "retention", ""], { error: "Choose a valid primary marketing outcome." }),
  goalDetails: z.string().trim().max(ONBOARDING_LONG_TEXT_MAX_LENGTH, "Keep the promotion and audience details at 5,000 characters or fewer."),
  monthlyBudget: z.string().trim().max(500, "Keep the monthly media budget under 500 characters."),
  qualifiedOutcome: z.string().trim().min(1, "Describe what counts as a qualified lead or conversion.").max(2000, "Keep the qualified result description under 2,000 characters."),
  salesCycle: z.string().trim().max(500, "Keep the sales cycle under 500 characters."),
  paidChannels: z.array(z.enum(paidChannels, { error: "Choose a supported paid media channel." })).max(paidChannels.length, "Choose only the supported paid media channels."),
  organicChannels: z.array(z.enum(organicChannels, { error: "Choose a supported organic content channel." })).max(organicChannels.length, "Choose only the supported organic content channels."),
  brandVoice: z.string().trim().max(100, "Choose a supported brand voice."),
  prohibitedTopics: z.string().trim().max(ONBOARDING_LONG_TEXT_MAX_LENGTH, "Keep the claims and topics to avoid at 5,000 characters or fewer."),
  existingAssets: z.string().trim().max(ONBOARDING_LONG_TEXT_MAX_LENGTH, "Keep the existing assets description at 5,000 characters or fewer."),
  crm: z.string().trim().max(120, "Choose a supported CRM or lead system."),
  analytics: z.string().trim().max(120, "Choose a supported web analytics option."),
  revenueSource: z.string().trim().max(120, "Choose a supported revenue or commerce source."),
  teamApprovers: z.string().trim().max(1000, "Keep the approver list under 1,000 characters."),
  notes: z.string().trim().max(6000, "Keep the current marketing notes under 6,000 characters."),
});

const onboardingSecretFields = [
  "businessName", "website", "description", "locations", "goalDetails", "monthlyBudget",
  "qualifiedOutcome", "salesCycle", "brandVoice", "prohibitedTopics", "existingAssets",
  "crm", "analytics", "revenueSource", "teamApprovers", "notes",
] as const;

type OnboardingFormValue = z.infer<typeof onboardingFormObjectSchema>;

function addOnboardingSecretIssues(value: Partial<OnboardingFormValue>, context: z.RefinementCtx, prefix: string[] = []) {
  for (const field of onboardingSecretFields) {
    const finding = findSecretPattern(value[field]);
    if (!finding) continue;
    context.addIssue({
      code: "custom",
      path: [...prefix, field],
      message: `Remove the ${finding}. Credentials and access codes are collected only through approved connection routes.`,
    });
  }
}

export const onboardingFormSchema = onboardingFormObjectSchema.superRefine((value, context) => {
  addOnboardingSecretIssues(value, context);
});

const onboardingDraftFormSchema = z.preprocess((candidate) => {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return candidate;
  return Object.fromEntries(Object.entries(candidate).filter(([, value]) => value !== ""));
}, onboardingFormObjectSchema.partial());

export const onboardingAttachmentSchema = z.object({
  id: z.string().uuid("Remove the file that needs attention and upload it again."),
  name: z.string().trim().min(1, "Remove the unnamed file and upload it again.").max(180, "Use a file name under 180 characters.")
    .refine((value) => !/[\\/]/.test(value), "File names cannot contain path separators.")
    .refine((value) => !isUnsafeCredentialDocumentName(value), "Do not upload password, credential, token, cookie, MFA, or recovery-code files."),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, `Choose a file no larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`),
  type: z.string().max(120),
  storagePath: z.string().min(1, "Wait for the file upload to finish, or remove the file.").max(500),
  status: z.literal("uploaded", { error: "Wait for the file upload to finish, or remove the file that needs attention." }),
});

export const onboardingDraftStructureSchema = z.object({
  submissionId: z.string().uuid(),
  form: onboardingDraftFormSchema,
  attachments: z.array(onboardingAttachmentSchema).max(MAX_UPLOAD_FILES),
});

export const onboardingDraftSchema = onboardingDraftStructureSchema.superRefine((value, context) => {
  addOnboardingSecretIssues(value.form, context, ["form"]);
});

export const onboardingSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  form: onboardingFormSchema,
  attachments: z.array(onboardingAttachmentSchema).max(MAX_UPLOAD_FILES),
}).superRefine((value, context) => {
  if (!value.form.primaryGoal) context.addIssue({ code: "custom", path: ["form", "primaryGoal"], message: "Choose a primary goal." });
  if (value.form.paidChannels.length === 0 && value.form.organicChannels.length === 0) context.addIssue({ code: "custom", path: ["form", "paidChannels"], message: "Select at least one channel." });
});

const onboardingFieldConfig = {
  businessName: { label: "Business name", step: "business" },
  website: { label: "Website", step: "business" },
  description: { label: "Offer and audience", step: "business" },
  locations: { label: "Markets and service areas", step: "business" },
  businessModel: { label: "Business model", step: "business" },
  primaryGoal: { label: "Primary marketing outcome", step: "goals" },
  goalDetails: { label: "Promotion and priority audience", step: "goals" },
  monthlyBudget: { label: "Monthly media budget", step: "goals" },
  qualifiedOutcome: { label: "Qualified lead or conversion", step: "goals" },
  salesCycle: { label: "Typical sales cycle", step: "goals" },
  paidChannels: { label: "Paid or organic channels", step: "channels" },
  organicChannels: { label: "Paid or organic channels", step: "channels" },
  brandVoice: { label: "Brand voice", step: "brand" },
  prohibitedTopics: { label: "Claims, topics, or language to avoid", step: "brand" },
  existingAssets: { label: "Existing creative assets", step: "brand" },
  attachments: { label: "Business files", step: "brand" },
  crm: { label: "CRM or lead system", step: "systems" },
  analytics: { label: "Web analytics", step: "systems" },
  revenueSource: { label: "Revenue or commerce source", step: "systems" },
  teamApprovers: { label: "Campaign, creative, and budget approvers", step: "systems" },
  notes: { label: "Current marketing notes", step: "systems" },
} as const;

export type OnboardingValidationField = keyof typeof onboardingFieldConfig;
export type OnboardingValidationStep = typeof onboardingFieldConfig[OnboardingValidationField]["step"];
export type OnboardingValidationIssue = {
  field: OnboardingValidationField;
  label: string;
  message: string;
  step: OnboardingValidationStep;
};

function isOnboardingValidationField(value: unknown): value is OnboardingValidationField {
  return typeof value === "string" && value in onboardingFieldConfig;
}

export function formatOnboardingValidationIssues(error: z.ZodError): OnboardingValidationIssue[] {
  const fields = new Set<OnboardingValidationField>();
  const issues = error.issues.flatMap((issue) => {
    const candidate = issue.path[0] === "form" ? issue.path[1] : issue.path[0] === "attachments" ? "attachments" : null;
    if (!isOnboardingValidationField(candidate) || fields.has(candidate)) return [];
    fields.add(candidate);
    const config = onboardingFieldConfig[candidate];
    return [{ field: candidate, label: config.label, message: issue.message, step: config.step }];
  });
  const fieldOrder = Object.keys(onboardingFieldConfig) as OnboardingValidationField[];
  return issues.sort((left, right) => fieldOrder.indexOf(left.field) - fieldOrder.indexOf(right.field));
}

export const uploadRequestSchema = z.object({
  submissionId: z.string().uuid(),
  attachmentId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(180)
    .refine((value) => !/[\\/]/.test(value), "File names cannot contain path separators")
    .refine((value) => !isUnsafeCredentialDocumentName(value), "Credential and access-code files are not accepted"),
  contentType: z.string().max(120),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
}).superRefine((value, context) => {
  if (!isAllowedUpload(value.fileName, value.contentType)) {
    context.addIssue({ code: "custom", path: ["fileName"], message: "This file type is not supported." });
  }
});

export type OnboardingSubmissionInput = z.infer<typeof onboardingSubmissionSchema>;
