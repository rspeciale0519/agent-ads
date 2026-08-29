import type { DashboardData } from "../dashboard/dashboard-service";

export type AiReachRecommendation = {
  id: string;
  title: string;
  reason: string;
  evidence: string[];
  expectedEffect: string;
  effort: "Low" | "Medium";
  risk: "Low" | "Medium";
  approval: string;
};

export type AiReachBriefing = {
  status: "limited" | "ready";
  summary: string;
  sources: Array<{ name: string; state: "connected" | "missing" | "needs_review"; detail: string }>;
  recommendations: [AiReachRecommendation, AiReachRecommendation, AiReachRecommendation];
};

type BriefingInput = Pick<DashboardData, "organization" | "onboarding" | "connections" | "verifiedResourceCount">;

export function buildAiReachBriefing(data: BriefingInput): AiReachBriefing {
  const google = data.connections.find((connection) => connection.provider.toLowerCase().includes("google"));
  const analytics = data.connections.find((connection) => connection.provider.toLowerCase() === "google_analytics");
  const searchConsole = data.connections.find((connection) => connection.provider.toLowerCase() === "google_search_console");
  const website = data.connections.find((connection) => connection.provider.toLowerCase() === "wordpress");
  const dubsado = data.connections.find((connection) => connection.provider.toLowerCase().includes("dubsado"));
  const sources = [
    {
      name: "Website and onboarding",
      state: data.onboarding.status === "submitted" && website?.status === "active_read_only" ? "connected" as const : "needs_review" as const,
      detail: data.onboarding.status === "submitted" && website?.status === "active_read_only" ? "Business context and a read-only site route are ready." : "Business context or a read-only site route needs review.",
    },
    {
      name: "Google Ads",
      state: google?.status === "active_read_only" ? "connected" as const : "missing" as const,
      detail: google?.status === "active_read_only" ? "Read-only access is active." : "No verified read-only resource is available.",
    },
    {
      name: "Google Analytics 4",
      state: analytics?.status === "active_read_only" ? "connected" as const : "missing" as const,
      detail: analytics?.status === "active_read_only" ? "Read-only property access is active." : "No verified read-only property is available.",
    },
    {
      name: "Search Console",
      state: searchConsole?.status === "active_read_only" ? "connected" as const : "missing" as const,
      detail: searchConsole?.status === "active_read_only" ? "Read-only property access is active." : "Read-only property access is not connected.",
    },
    {
      name: "Dubsado outcomes",
      state: dubsado?.status === "active_read_only" ? "connected" as const : "missing" as const,
      detail: dubsado?.status === "active_read_only" ? "Commercial source is connected for review." : "Outcome stages and revenue fields are not mapped.",
    },
  ];
  const connectedSources = sources.filter((source) => source.state === "connected").length;
  const status = connectedSources === sources.length && data.verifiedResourceCount > 0 ? "ready" as const : "limited" as const;
  return {
    status,
    summary: status === "ready"
      ? `AI Reach has evidence from ${connectedSources} core sources. Review the three actions below before making any change.`
      : `AI Reach has partial evidence from ${connectedSources} of ${sources.length} core sources. Connect and approve data before measuring business results.`,
    sources,
    recommendations: [
      {
        id: "offer-focus",
        title: "Choose one offer for the first test",
        reason: "Several offer families are listed, so a single starting offer is not yet clear.",
        evidence: ["Onboarding lists keynote speaking, sales training, leadership speaking, and leadership development.", "The first offer needs customer approval."],
        expectedEffect: "A clear test makes later results easier to compare.",
        effort: "Low",
        risk: "Low",
        approval: "Customer approval required",
      },
      {
        id: "google-read-only",
        title: google?.status === "active_read_only" ? "Refresh Google Ads evidence" : "Connect Google Ads read-only",
        reason: google?.status === "active_read_only" ? "Google Ads is connected, but a fresh review keeps the briefing current." : "Google Ads is the proposed first advertising source, but no verified resource is available.",
        evidence: [google?.status === "active_read_only" ? "A read-only Google connection is recorded." : "No verified Google Ads resource is recorded.", "The pilot forbids ad, budget, bid, and targeting changes."],
        expectedEffect: "It supplies campaign evidence without granting change access.",
        effort: "Medium",
        risk: "Low",
        approval: "Advertising owner approval required",
      },
      {
        id: "dubsado-map",
        title: dubsado?.status === "active_read_only" ? "Map Dubsado outcome stages" : "Add a Dubsado read route",
        reason: dubsado?.status === "active_read_only" ? "Commercial stages still need an approved mapping before efficiency metrics are used." : "The proposed commercial source is not connected, so revenue outcomes cannot be reconciled.",
        evidence: [dubsado?.status === "active_read_only" ? "Dubsado access is recorded without an approved stage map." : "No Dubsado read-only connection is recorded.", "Revenue, proposal, and signed-engagement definitions remain unapproved."],
        expectedEffect: "It links advertising evidence to qualified business outcomes safely.",
        effort: "Medium",
        risk: "Medium",
        approval: "Customer and measurement owner approval required",
      },
    ],
  };
}
