import type { ConnectionProvider } from "../connections/contracts";
import type { DashboardConnectionSummary, DashboardData } from "../dashboard/dashboard-service";
import { assessReadOnlyEvidenceSnapshot, type ReadOnlyEvidenceSnapshot } from "./evidence-contract";

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
};

export type AiReachBriefing = {
  status: "limited" | "ready";
  summary: string;
  limitation: string;
  sources: Array<{ name: string; state: "connected" | "missing" | "needs_review"; detail: string }>;
  recommendations: [AiReachRecommendation, AiReachRecommendation, AiReachRecommendation];
};

type BriefingInput = Pick<DashboardData, "organization" | "onboarding" | "connections" | "verifiedResourceCount"> & { evidenceSnapshot?: ReadOnlyEvidenceSnapshot | null };
type Source = AiReachBriefing["sources"][number];

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

export function buildAiReachBriefing(data: BriefingInput, now = new Date()): AiReachBriefing {
  const checkedAt = now.getTime();
  const google = sourceRecord(data.connections, "google_ads", "Google Ads", checkedAt);
  const analytics = sourceRecord(data.connections, "google_analytics", "Google Analytics 4", checkedAt);
  const searchConsole = sourceRecord(data.connections, "google_search_console", "Search Console", checkedAt);
  const website = sourceRecord(data.connections, "wordpress", "Website", checkedAt);
  const dubsado = sourceRecord(data.connections, "dubsado", "Dubsado outcomes", checkedAt);
  const submitted = data.onboarding.status === "submitted";
  const sources = [website, google, analytics, searchConsole, dubsado];
  const connectedSources = sources.filter((source) => source.state === "connected").length;
  const snapshotAssessment = data.evidenceSnapshot ? assessReadOnlyEvidenceSnapshot(data.evidenceSnapshot, now) : null;
  const snapshotReady = Boolean(snapshotAssessment?.ready && connectedSources === sources.length);
  const primaryMetric = data.evidenceSnapshot?.metrics.find((metric) => metric.key === data.evidenceSnapshot?.primaryOutcomeKey);
  return {
    status: snapshotReady ? "ready" : "limited",
    summary: snapshotReady && primaryMetric
      ? `AI Reach has a complete read-only outcome snapshot. ${primaryMetric.key.replaceAll("_", " ")} is ${primaryMetric.value}${primaryMetric.unit === "currency" ? ` ${primaryMetric.currency}` : ""}.`
      : `AI Reach shows read-only access records for ${connectedSources} of ${sources.length} core sources. Business results are not measured in this view.`,
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
        title: google.state === "connected" ? "Review Google Ads reporting evidence" : google.state === "needs_review" ? "Verify Google Ads read-only access" : "Connect Google Ads read-only",
        reason: google.state === "connected" ? "Access is recorded, but campaign results and their date range are not available in this view." : "Google Ads access needs verification before it can support reporting.",
        evidence: [google.detail, "The pilot forbids ad, budget, bid, and targeting changes."],
        expectedEffect: "It prepares a read-only route for campaign evidence.",
        effort: "Medium",
        risk: "Low",
        uncertainty: google.state === "connected" ? "Medium" : "High",
        approval: "Advertising owner approval required",
      },
      {
        id: "dubsado-map",
        title: dubsado.state === "connected" ? "Review Dubsado outcome definitions" : dubsado.state === "needs_review" ? "Verify the Dubsado read route" : "Add a Dubsado read route",
        reason: "Commercial results need approved stage definitions and source data before they can support a decision.",
        evidence: [dubsado.detail, "An approved stage map is not available in this view."],
        expectedEffect: "Clear definitions help compare qualified opportunities and commercial outcomes.",
        effort: "Medium",
        risk: "Medium",
        uncertainty: dubsado.state === "connected" ? "Medium" : "High",
        approval: "Customer and measurement owner approval required",
      },
    ],
  };
}
