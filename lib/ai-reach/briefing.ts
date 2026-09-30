import type { ConnectionProvider } from "../connections/contracts";
import type { DashboardConnectionSummary, DashboardData } from "../dashboard/dashboard-service";
import { DUBSADO_EXPORT_MAX_AGE_HOURS, isDubsadoExportFresh } from "./dubsado-evidence";
import { assessReadOnlyEvidenceSnapshot, type ReadOnlyEvidenceSnapshot } from "./evidence-contract";
import { buildOutcomeFunnel, formatRate, minimumStepRecords, type OutcomeFunnel } from "./funnel";

export type AiReachRecommendation = {
  id: string;
  title: string;
  reason: string;
  evidence: string[];
  expectedEffect: string;
  effort: "Low" | "Medium";
  risk: "Low" | "Medium";
  uncertainty: "Low" | "Medium" | "High";
  approval: string;
  // Saved metrics this recommendation is computed from, if any. Answers that
  // suggest it show and cite those metrics.
  metricKeys?: string[];
};

export type AiReachBriefing = {
  status: "limited" | "ready";
  summary: string;
  limitation: string;
  sources: Array<{ name: string; state: "connected" | "missing" | "needs_review"; detail: string }>;
  recommendations: [AiReachRecommendation, AiReachRecommendation, AiReachRecommendation];
};

// uploadMaxAgeHours is the organization's upload window (default 7 days).
type BriefingInput = Pick<DashboardData, "organization" | "onboarding" | "connections" | "verifiedResourceCount"> & { evidenceSnapshot?: ReadOnlyEvidenceSnapshot | null; uploadMaxAgeHours?: number };
type Source = AiReachBriefing["sources"][number];

const googleAdsMetricKeys = new Set([
  "google_ads.spend",
  "google_ads.impressions",
  "google_ads.clicks",
  "google_ads.conversions",
  "google_ads.click_rate",
]);

const dubsadoMetricKeys = new Set([
  "inquiries",
  "qualified_leads",
  "booked_calls",
  "completed_qualified_meetings",
  "proposals_issued",
  "signed_engagements",
  "closed_won_deals",
  "booked_revenue",
  "cancelled_engagements",
  "refunded_engagements",
]);

// The saved Google Ads metrics backed by official API evidence.
function googleAdsPerformanceMetricKeys(snapshot: ReadOnlyEvidenceSnapshot | null | undefined) {
  if (!snapshot) return [];
  const officialGoogleAdsEvidenceIds = new Set(snapshot.evidence
    .filter((evidence) => evidence.provider === "google_ads" && evidence.sourceClass === "official_platform_observation" && evidence.method === "official_api")
    .map((evidence) => evidence.id));
  return snapshot.metrics
    .filter((metric) => googleAdsMetricKeys.has(metric.key) && metric.evidenceIds.some((evidenceId) => officialGoogleAdsEvidenceIds.has(evidenceId)))
    .map((metric) => metric.key);
}

// The saved Dubsado outcome metrics backed by an authorized export.
function dubsadoOutcomeMetricKeys(snapshot: ReadOnlyEvidenceSnapshot | null | undefined) {
  if (!snapshot) return [];
  const approvedDubsadoEvidenceIds = new Set(snapshot.evidence
    .filter((evidence) => evidence.provider === "dubsado" && evidence.sourceClass === "business_outcome_observation" && evidence.method === "authorized_export")
    .map((evidence) => evidence.id));
  return snapshot.metrics
    .filter((metric) => dubsadoMetricKeys.has(metric.key) && metric.evidenceIds.some((evidenceId) => approvedDubsadoEvidenceIds.has(evidenceId)))
    .map((metric) => metric.key);
}

function hasReadOnlyAccessRecord(connection: DashboardConnectionSummary, now: number) {
  const verifiedAt = connection.lastVerifiedAt === null ? NaN : Date.parse(connection.lastVerifiedAt);
  const expiresAt = connection.expiresAt === null ? null : Date.parse(connection.expiresAt);
  return connection.status === "active_read_only"
    && connection.accessMode === "read_only"
    && Number.isFinite(verifiedAt) && verifiedAt <= now
    && (expiresAt === null || (Number.isFinite(expiresAt) && expiresAt > now));
}

function sourceRecord(connections: DashboardConnectionSummary[], provider: ConnectionProvider, name: string, now: number): Source {
  const matches = connections.filter((connection) => connection.provider === provider);
  // A verified manual route can have no discovered resource rows. Counts cannot establish source identity or outcome evidence.
  if (matches.some((connection) => hasReadOnlyAccessRecord(connection, now))) {
    return { name, state: "connected", detail: "Read-only access is recorded. Source data still needs review." };
  }
  return matches.length > 0
    ? { name, state: "needs_review", detail: "A connection exists. Review its access, verification date, and expiry." }
    : { name, state: "missing", detail: "No read-only connection is recorded." };
}

// Points the third action at the sales step where the largest share of
// records stops, using the saved Dubsado numbers. It describes what happened;
// it does not claim why, so the action is to review, not to change anything.
function funnelRecommendation(funnel: OutcomeFunnel, weakest: NonNullable<OutcomeFunnel["weakest"]>, dubsadoState: Source["state"]): AiReachRecommendation {
  return {
    id: "funnel-weakest-step",
    title: `Find out why ${weakest.from} stall before ${weakest.to}`,
    reason: `Only ${weakest.advanced} of ${weakest.entered} records that reached ${weakest.from} went on to ${weakest.to} (${formatRate(weakest.rate)}). That is the weakest step with enough records to compare.`,
    evidence: [
      ...funnel.steps.map((step) => `${step.from} → ${step.to}: ${step.advanced} of ${step.entered} (${formatRate(step.rate)})`),
      "Assumes each record passed through the earlier stages. Cancelled and refunded records are not counted.",
    ],
    expectedEffect: "It focuses review time on the step that loses the largest share of records.",
    effort: "Medium",
    risk: "Low",
    uncertainty: dubsadoState === "connected" ? "Medium" : "High",
    approval: "Customer and measurement owner approval required",
    metricKeys: funnel.metricKeys,
  };
}

// A reminder to upload a new export once the saved one is past its
// freshness window, so advice never comes from old numbers.
function staleExportRecommendation(dubsadoState: Source["state"], metricKeys: string[], maxAgeDays: number): AiReachRecommendation {
  return {
    id: "dubsado-refresh",
    title: "Upload a fresh Dubsado export",
    reason: `The saved Dubsado export is out of date (older than ${maxAgeDays} ${maxAgeDays === 1 ? "day" : "days"}, the limit in Settings), so AI Reach will not compare sales steps from it. Upload a new export to see current results.`,
    evidence: ["Authorized Dubsado outcome metrics are saved, but they are past their freshness window."],
    // The old export is cited so the answer can show why a new one is needed.
    metricKeys,
    expectedEffect: "Current numbers keep the results and sales-step advice accurate.",
    effort: "Low",
    risk: "Low",
    uncertainty: dubsadoState === "connected" ? "Medium" : "High",
    approval: "Customer and measurement owner approval required",
  };
}

export function buildAiReachBriefing(data: BriefingInput, now = new Date()): AiReachBriefing {
  const checkedAt = now.getTime();
  const google = sourceRecord(data.connections, "google_ads", "Google Ads", checkedAt);
  const analytics = sourceRecord(data.connections, "google_analytics", "Google Analytics 4", checkedAt);
  const searchConsole = sourceRecord(data.connections, "google_search_console", "Search Console", checkedAt);
  const website = sourceRecord(data.connections, "wordpress", "Website", checkedAt);
  const dubsado = sourceRecord(data.connections, "dubsado", "Dubsado outcomes", checkedAt);
  const submitted = data.onboarding.status === "submitted";
  const googleAdsKeys = googleAdsPerformanceMetricKeys(data.evidenceSnapshot);
  const dubsadoKeys = dubsadoOutcomeMetricKeys(data.evidenceSnapshot);
  const googleAdsPerformanceEvidence = googleAdsKeys.length > 0;
  const dubsadoOutcomeEvidence = dubsadoKeys.length > 0;
  const sources = [
    website,
    googleAdsPerformanceEvidence
      ? { ...google, detail: `${google.detail} Campaign performance metrics are included in the evidence snapshot.` }
      : google,
    analytics,
    searchConsole,
    dubsadoOutcomeEvidence
      ? { ...dubsado, detail: `${dubsado.detail} Commercial outcome metrics are included in the evidence snapshot.` }
      : dubsado,
  ];
  const connectedSources = sources.filter((source) => source.state === "connected").length;
  const snapshotAssessment = data.evidenceSnapshot ? assessReadOnlyEvidenceSnapshot(data.evidenceSnapshot, now) : null;
  const snapshotReady = Boolean(snapshotAssessment?.ready && connectedSources === sources.length);
  // Old counts should not drive step-level advice, so the funnel is only
  // built while the Dubsado export itself is still fresh.
  const dubsadoEvidenceFresh = Boolean(data.evidenceSnapshot && isDubsadoExportFresh(data.evidenceSnapshot, now, data.uploadMaxAgeHours));
  const funnel = dubsadoOutcomeEvidence && dubsadoEvidenceFresh ? buildOutcomeFunnel(data.evidenceSnapshot) : null;
  const primaryMetric = data.evidenceSnapshot?.metrics.find((metric) => metric.key === data.evidenceSnapshot?.primaryOutcomeKey);
  return {
    status: snapshotReady ? "ready" : "limited",
    summary: snapshotReady && primaryMetric
      ? `AI Reach has a complete read-only outcome snapshot. ${primaryMetric.key.replaceAll("_", " ")} is ${primaryMetric.value}${primaryMetric.unit === "currency" ? ` ${primaryMetric.currency}` : ""}.`
      : `AI Reach shows read-only access records for ${connectedSources} of ${sources.length} core sources. ${
        // Saved results appear in the tiles below, so name them as a draft
        // instead of claiming nothing is measured.
        primaryMetric ? "Saved business results are a draft, not ready for decisions." : "Business results are not measured in this view."
      }`,
    limitation: snapshotReady
      ? "This snapshot uses approved read-only evidence. It does not prove that a marketing change caused the outcome."
      : data.evidenceSnapshot && snapshotAssessment
        ? `Approved business results are not ready for decisions. ${snapshotAssessment.blockers.join(" ")}`
        : "Approved business results are not available in this view. Data age and customer approval still need review.",
    sources,
    recommendations: [
      {
        id: "offer-focus",
        title: submitted ? "Confirm the offer for the first test" : "Complete your business profile",
        reason: "Confirm the offer and customer approval before comparing business results.",
        evidence: [submitted ? "Onboarding is marked submitted." : "Onboarding is not marked submitted.", "This summary contains no approved offer decision."],
        expectedEffect: "A clear test makes later results easier to compare.",
        effort: "Low",
        risk: "Low",
        uncertainty: "High",
        approval: "Customer approval required",
      },
      {
        id: "google-read-only",
        title: googleAdsPerformanceEvidence || google.state === "connected" ? "Review Google Ads reporting evidence" : google.state === "needs_review" ? "Verify Google Ads read-only access" : "Connect Google Ads read-only",
        reason: googleAdsPerformanceEvidence
          ? "Campaign metrics are present in the evidence snapshot. Review the reporting window and platform limitations before making a decision."
          : google.state === "connected" ? "Access is recorded, but campaign results and their date range are not available in this view." : "Google Ads access needs verification before it can support reporting.",
        evidence: [googleAdsPerformanceEvidence ? "Official Google Ads campaign metrics are included in the evidence snapshot." : google.detail, "The pilot forbids ad, budget, bid, and targeting changes."],
        expectedEffect: "It prepares a read-only route for campaign evidence.",
        effort: "Medium",
        risk: "Low",
        uncertainty: google.state === "connected" ? "Medium" : "High",
        approval: "Advertising owner approval required",
        ...(googleAdsPerformanceEvidence ? { metricKeys: googleAdsKeys } : {}),
      },
      dubsadoOutcomeEvidence && funnel?.weakest
        ? funnelRecommendation(funnel, funnel.weakest, dubsado.state)
        : dubsadoOutcomeEvidence && !dubsadoEvidenceFresh
          ? staleExportRecommendation(dubsado.state, dubsadoKeys, Math.round((data.uploadMaxAgeHours ?? DUBSADO_EXPORT_MAX_AGE_HOURS) / 24))
          : {
        id: "dubsado-map",
        title: dubsadoOutcomeEvidence ? "Review Dubsado outcome evidence" : dubsado.state === "connected" ? "Review Dubsado outcome definitions" : dubsado.state === "needs_review" ? "Verify the Dubsado read route" : "Add a Dubsado read route",
        reason: dubsadoOutcomeEvidence
          ? "Commercial outcome metrics are present. Review their reporting window, stage map, and reconciliation limits before using them for a decision."
          : "Commercial results need approved stage definitions and source data before they can support a decision.",
        evidence: [
          dubsadoOutcomeEvidence ? "Authorized Dubsado outcome metrics are included in the evidence snapshot." : dubsado.detail,
          // Saved stages exist but no step has enough records to compare fairly.
          funnel ? `Too few records at each step to compare them yet (at least ${minimumStepRecords} are needed).` : "An approved stage map is not available in this view.",
        ],
        expectedEffect: "Clear definitions help compare qualified opportunities and commercial outcomes.",
        effort: "Medium",
        risk: "Medium",
        uncertainty: dubsado.state === "connected" ? "Medium" : "High",
        approval: "Customer and measurement owner approval required",
        ...(dubsadoOutcomeEvidence ? { metricKeys: dubsadoKeys } : {}),
      },
    ],
  };
}
