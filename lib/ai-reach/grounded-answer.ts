import type { AiReachBriefing } from "./briefing";
import { answerAiReachQuestion } from "./chat";
import { assessReadOnlyEvidenceSnapshot, type ReadOnlyEvidenceSnapshot, type ReadOnlyMetric } from "./evidence-contract";

export type AiReachCitation = { evidenceId: string; provider: string; method: string; collectedAt: string };

export type AiReachAnswer = {
  text: string;
  // boundary: refused a change request. evidence: answered from saved metrics.
  // abstain: the topic has no saved evidence. guidance: general next-step help.
  kind: "boundary" | "evidence" | "abstain" | "guidance";
  citations: AiReachCitation[];
};

export type AiReachAnswerInput = {
  question: string;
  organizationName: string;
  briefing: AiReachBriefing;
  snapshot: ReadOnlyEvidenceSnapshot | null;
  now?: Date;
};

// Words that ask AI Reach to act. The pilot is read-only, so these are refused
// before anything else, whatever the rest of the question says.
const actionTerms = ["change", "pause", "stop", "increase", "decrease", "raise", "lower", "edit", "publish", "send", "launch", "delete", "adjust", "turn off", "turn on"];

// Each metric AI Reach can report, with the plain words people use for it.
// Order matters: the first topic whose words appear in the question wins.
const metricTopics: Array<{ key: string; label: string; terms: string[] }> = [
  { key: "booked_revenue", label: "booked revenue", terms: ["revenue", "money", "income", "earn"] },
  { key: "closed_won_deals", label: "closed-won deals", terms: ["deal", "closed", "won", "sale"] },
  { key: "booked_calls", label: "booked calls", terms: ["call", "booking", "consult"] },
  { key: "completed_qualified_meetings", label: "qualified meetings", terms: ["meeting"] },
  { key: "signed_engagements", label: "signed engagements", terms: ["signed", "engagement", "contract"] },
  { key: "qualified_leads", label: "qualified leads", terms: ["lead", "prospect"] },
  { key: "inquiries", label: "inquiries", terms: ["inquir", "enquir"] },
  { key: "google_ads.spend", label: "Google Ads spend", terms: ["spend", "spent", "ad cost", "cost"] },
  { key: "google_ads.clicks", label: "Google Ads clicks", terms: ["click"] },
  { key: "google_ads.impressions", label: "Google Ads impressions", terms: ["impression", "views"] },
  { key: "google_ads.conversions", label: "Google Ads conversions", terms: ["conversion"] },
];

function formatValue(metric: ReadOnlyMetric) {
  if (metric.unit === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: metric.currency ?? "USD", maximumFractionDigits: 0 }).format(metric.value);
  if (metric.unit === "rate") return `${Math.round(metric.value * 1000) / 10}%`;
  return new Intl.NumberFormat("en-US").format(metric.value);
}

function formatWindow(metric: ReadOnlyMetric) {
  const format = (value: string) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${format(metric.reportingWindow.start)} to ${format(metric.reportingWindow.end)}`;
}

function citationsFor(metric: ReadOnlyMetric, snapshot: ReadOnlyEvidenceSnapshot): AiReachCitation[] {
  return snapshot.evidence
    .filter((evidence) => metric.evidenceIds.includes(evidence.id))
    .map((evidence) => ({ evidenceId: evidence.id, provider: evidence.provider, method: evidence.method, collectedAt: evidence.collectedAt }));
}

// Answers one question using only the saved evidence snapshot and briefing.
// It never invents a number: a metric either comes from the snapshot with its
// citations, or the answer says the evidence is not available.
export function answerFromEvidence(input: AiReachAnswerInput): AiReachAnswer {
  const normalized = input.question.trim().toLowerCase();
  if (!normalized) return { text: "Ask a question about your sources, results, or next safe action.", kind: "guidance", citations: [] };

  if (actionTerms.some((term) => normalized.includes(term))) {
    return { text: "Not yet. This pilot is read-only. AI Reach can explain evidence, but it cannot change ads, budgets, bids, targeting, websites, email, or CRM records.", kind: "boundary", citations: [] };
  }

  const topic = metricTopics.find((candidate) => candidate.terms.some((term) => normalized.includes(term)));
  if (topic) {
    const metric = input.snapshot?.metrics.find((candidate) => candidate.key === topic.key);
    if (!input.snapshot || !metric) {
      return {
        text: `I don't have approved evidence for ${topic.label} yet, so I won't guess a number. Import an approved export or connect a read-only source that reports it.`,
        kind: "abstain",
        citations: [],
      };
    }
    const assessment = assessReadOnlyEvidenceSnapshot(input.snapshot, input.now);
    const readiness = assessment.ready
      ? "The snapshot is decision-ready."
      : `Treat this as a draft, not a decision-ready result: ${assessment.blockers.join(" ")}`;
    return {
      text: `For ${input.organizationName}, ${topic.label} was ${formatValue(metric)} from ${formatWindow(metric)}. ${readiness} This shows what happened; it does not prove a marketing change caused it.`,
      kind: "evidence",
      citations: citationsFor(metric, input.snapshot),
    };
  }

  return { text: answerAiReachQuestion(input.question, input.organizationName, input.briefing), kind: "guidance", citations: [] };
}
