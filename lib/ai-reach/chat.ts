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
      ? `For ${organizationName}, access records need review for ${missing.join(", ")}. ${briefing.limitation}`
      : `All core sources have read-only access records. ${briefing.limitation}`;
  }

  if (["connect", "source", "access", "invite"].some((term) => normalized.includes(term))) {
    const firstMissing = briefing.sources.find((source) => source.state !== "connected");
    return firstMissing
      ? `Start with ${firstMissing.name}. Use an official read-only invitation, OAuth grant, or approved export. Never share a password or token.`
      : `All core sources have read-only access records. ${briefing.limitation}`;
  }

  if (["measure", "result", "revenue", "meeting", "outcome", "business"].some((term) => normalized.includes(term))) {
    return briefing.status === "ready"
      ? `${briefing.summary} ${briefing.limitation}`
      : `Business results remain unmeasured in this view. ${briefing.limitation}`;
  }

  return `For ${organizationName}, start with “${briefing.recommendations[0].title}.” I will explain the evidence, limits, effort, risk, uncertainty (${briefing.recommendations[0].uncertainty}), and approval needed before any change.`;
}
