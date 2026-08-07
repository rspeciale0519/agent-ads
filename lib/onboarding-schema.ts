import { z } from "zod";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_FILES, isAllowedUpload } from "./upload-rules";

const paidChannels = ["Meta Ads", "Google Ads", "Microsoft Advertising", "LinkedIn Ads", "TikTok Ads", "Reddit Ads", "X Ads"] as const;
const organicChannels = ["LinkedIn", "X", "Instagram", "TikTok", "Facebook", "YouTube", "Reddit"] as const;

const formSchema = z.object({
  businessName: z.string().trim().min(1).max(180),
  website: z.string().trim().url().max(500),
  description: z.string().trim().max(4000),
  locations: z.string().trim().max(1000),
  businessModel: z.enum(["B2B", "B2C", "B2B2C", "Other", ""]),
  primaryGoal: z.enum(["qualified-leads", "revenue", "pipeline", "awareness", "retention", ""]),
  goalDetails: z.string().trim().max(4000),
  monthlyBudget: z.string().trim().max(500),
  qualifiedOutcome: z.string().trim().min(1).max(2000),
  salesCycle: z.string().trim().max(500),
  paidChannels: z.array(z.enum(paidChannels)).max(paidChannels.length),
  organicChannels: z.array(z.enum(organicChannels)).max(organicChannels.length),
  brandVoice: z.string().trim().max(100),
  prohibitedTopics: z.string().trim().max(4000),
  existingAssets: z.string().trim().max(4000),
  crm: z.string().trim().max(120),
  analytics: z.string().trim().max(120),
  revenueSource: z.string().trim().max(120),
  teamApprovers: z.string().trim().max(1000),
  notes: z.string().trim().max(6000),
});

export const onboardingAttachmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(180).refine((value) => !/[\\/]/.test(value), "File names cannot contain path separators"),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  type: z.string().max(120),
  storagePath: z.string().min(1).max(500),
  status: z.literal("uploaded"),
});

export const onboardingSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  form: formSchema,
  attachments: z.array(onboardingAttachmentSchema).max(MAX_UPLOAD_FILES),
}).superRefine((value, context) => {
  if (!value.form.primaryGoal) context.addIssue({ code: "custom", path: ["form", "primaryGoal"], message: "Choose a primary goal." });
  if (value.form.paidChannels.length === 0 && value.form.organicChannels.length === 0) context.addIssue({ code: "custom", path: ["form", "paidChannels"], message: "Select at least one channel." });
});

export const uploadRequestSchema = z.object({
  submissionId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(180).refine((value) => !/[\\/]/.test(value), "File names cannot contain path separators"),
  contentType: z.string().max(120),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
}).superRefine((value, context) => {
  if (!isAllowedUpload(value.fileName, value.contentType)) {
    context.addIssue({ code: "custom", path: ["fileName"], message: "This file type is not supported." });
  }
});

export type OnboardingSubmissionInput = z.infer<typeof onboardingSubmissionSchema>;
