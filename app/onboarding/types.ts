export type StepId =
  | "business"
  | "goals"
  | "channels"
  | "brand"
  | "systems"
  | "review";

export type PaidChannel =
  | "Meta Ads"
  | "Google Ads"
  | "Microsoft Advertising"
  | "LinkedIn Ads"
  | "TikTok Ads"
  | "Reddit Ads"
  | "X Ads";

export type OrganicChannel =
  | "LinkedIn"
  | "X"
  | "Instagram"
  | "TikTok"
  | "Facebook"
  | "YouTube"
  | "Reddit";

export type AttachmentStatus = "uploading" | "uploaded" | "error";

export type OnboardingAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  status: AttachmentStatus;
  error?: string;
};

export type FormData = {
  businessName: string;
  website: string;
  description: string;
  locations: string;
  businessModel: "B2B" | "B2C" | "B2B2C" | "Other" | "";
  primaryGoal: "qualified-leads" | "revenue" | "pipeline" | "awareness" | "retention" | "";
  goalDetails: string;
  monthlyBudget: string;
  qualifiedOutcome: string;
  salesCycle: string;
  paidChannels: PaidChannel[];
  organicChannels: OrganicChannel[];
  brandVoice: string;
  prohibitedTopics: string;
  existingAssets: string;
  crm: string;
  analytics: string;
  revenueSource: string;
  teamApprovers: string;
  notes: string;
  attachments: OnboardingAttachment[];
};

export const initialFormData: FormData = {
  businessName: "",
  website: "",
  description: "",
  locations: "",
  businessModel: "",
  primaryGoal: "",
  goalDetails: "",
  monthlyBudget: "",
  qualifiedOutcome: "",
  salesCycle: "",
  paidChannels: [],
  organicChannels: [],
  brandVoice: "",
  prohibitedTopics: "",
  existingAssets: "",
  crm: "",
  analytics: "",
  revenueSource: "",
  teamApprovers: "",
  notes: "",
  attachments: [],
};
