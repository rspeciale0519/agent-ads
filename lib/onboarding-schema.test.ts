import { describe, expect, it } from "vitest";
import { onboardingDraftSchema, onboardingSubmissionSchema, uploadRequestSchema } from "./onboarding-schema";

const submission = {
  submissionId: "00000000-0000-4000-8000-000000000001",
  form: {
    businessName: "Synthetic Business",
    website: "https://example.test",
    description: "A safe offer description",
    locations: "Test market",
    businessModel: "B2B" as const,
    primaryGoal: "qualified-leads" as const,
    goalDetails: "Reach a synthetic audience",
    monthlyBudget: "Not set",
    qualifiedOutcome: "A completed test inquiry",
    salesCycle: "Thirty days",
    paidChannels: ["Google Ads" as const],
    organicChannels: [],
    brandVoice: "Clear",
    prohibitedTopics: "None",
    existingAssets: "Synthetic fixtures",
    crm: "Other",
    analytics: "Other",
    revenueSource: "Other",
    teamApprovers: "Owner",
    notes: "Ordinary marketing context",
  },
  attachments: [],
};

describe("onboarding secret containment", () => {
  it("rejects credential-shaped text at the full submission boundary", () => {
    const parsed = onboardingSubmissionSchema.safeParse({
      ...submission,
      form: { ...submission.form, notes: "password: synthetic-only" },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(["form", "notes"]);
  });

  it("allows incomplete safe drafts but rejects secret-shaped drafts", () => {
    expect(onboardingDraftSchema.safeParse({
      submissionId: submission.submissionId,
      form: { businessName: "", notes: "Seasonal launch" },
      attachments: [],
    }).success).toBe(true);
    expect(onboardingDraftSchema.safeParse({
      submissionId: submission.submissionId,
      form: { notes: "recovery code: 1234 5678" },
      attachments: [],
    }).success).toBe(false);
  });

  it("rejects credential-export filenames before signed upload creation", () => {
    expect(uploadRequestSchema.safeParse({
      submissionId: submission.submissionId,
      attachmentId: "00000000-0000-4000-8000-000000000002",
      fileName: "client-passwords.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 1024,
    }).success).toBe(false);
  });
});
