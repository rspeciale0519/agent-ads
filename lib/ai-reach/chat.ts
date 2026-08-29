import type { AiReachBriefing } from "./briefing";

export function answerAiReachQuestion(question: string, organizationName: string, briefing: AiReachBriefing) {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return "Ask a question about your sources, results, or next safe action.";

  if (["change", "pause", "spend", "budget", "bid", "targeting", "publish", "send"].some((term) => normalized.includes(term))) {
    return "Not yet. This pilot is read-only. AI Reach can explain evidence, but it cannot change ads, budgets, bids, targeting, websites, email, or CRM records.";
  }

  if (["missing", "block", "limit", "ready", "why"].some((term) => normalized.includes(term))) {
    const missing = briefing.sources.filter((source) => source.state !== "connected").map((source) => source.name);
    return missing.length > 0
      ? `For ${organizationName}, the main limit is missing or unapproved evidence from ${missing.join(", ")}. Review the three actions before using business results.`
      : "The core sources are connected. Review freshness and approvals before using the results for a decision.";
  }

  if (["connect", "source", "access", "invite"].some((term) => normalized.includes(term))) {
    const firstMissing = briefing.sources.find((source) => source.state !== "connected");
    return firstMissing
      ? `Start with ${firstMissing.name}. Use an official read-only invitation, OAuth grant, or approved export. Never share a password or token.`
      : "All core sources are connected. Review the three safe actions and confirm the measurement definitions.";
  }

  if (["measure", "result", "revenue", "meeting", "outcome", "business"].some((term) => normalized.includes(term))) {
    return "Today, AI Reach can show source coverage and safe next actions. Qualified meetings, signed engagements, and booked revenue remain unmeasured until the approved Dubsado map exists.";
  }

  return `For ${organizationName}, start with “${briefing.recommendations[0].title}.” I will explain the evidence, limits, effort, risk, and approval needed before any change.`;
}
