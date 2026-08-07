import type { OrganicChannel, PaidChannel, StepId } from "./types";

export const steps: Array<{ id: StepId; label: string; eyebrow: string }> = [
  { id: "business", label: "Business & offer", eyebrow: "01" },
  { id: "goals", label: "Goals & outcomes", eyebrow: "02" },
  { id: "channels", label: "Paid + organic channels", eyebrow: "03" },
  { id: "brand", label: "Brand & creative", eyebrow: "04" },
  { id: "systems", label: "Measurement & team", eyebrow: "05" },
  { id: "review", label: "Review & send", eyebrow: "06" },
];

export const paidChannels: Array<{ name: PaidChannel; hint: string; accent: string }> = [
  { name: "Meta Ads", hint: "Prospecting, retargeting & social campaigns", accent: "meta" },
  { name: "Google Ads", hint: "Search, YouTube & high-intent demand", accent: "google" },
  { name: "Microsoft Advertising", hint: "Bing search & professional audiences", accent: "microsoft" },
  { name: "LinkedIn Ads", hint: "B2B account & job-title targeting", accent: "linkedin" },
  { name: "TikTok Ads", hint: "Short-form creative & discovery ads", accent: "tiktok" },
  { name: "Reddit Ads", hint: "Community, interest & intent audiences", accent: "reddit" },
  { name: "X Ads", hint: "Conversation, interest & trend targeting", accent: "x" },
];

export const organicChannels: Array<{ name: OrganicChannel; hint: string; accent: string }> = [
  { name: "LinkedIn", hint: "Thought leadership, demand & employer brand", accent: "linkedin" },
  { name: "X", hint: "Conversation, threads & real-time ideas", accent: "x" },
  { name: "Instagram", hint: "Reels, carousels & visual storytelling", accent: "instagram" },
  { name: "TikTok", hint: "Native short-form content", accent: "tiktok" },
  { name: "Facebook", hint: "Community and local reach", accent: "facebook" },
  { name: "YouTube", hint: "Long-form and Shorts", accent: "youtube" },
  { name: "Reddit", hint: "Community-first participation", accent: "reddit" },
];
