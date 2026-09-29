import type { AiReachBriefing } from "./briefing";

// Verbs that would change an account. The pilot is read-only, so a request to
// do one of these is refused before any evidence is read.
const actionVerbs = "change|pause|stop|increase|decrease|raise|lower|edit|publish|send|launch|delete|adjust|turn off|turn on|cancel|boost|cut|set(?!\\s+up)|create|update|modify|remove|schedule|allocate|reallocate|reduce|double|halve|enable|disable|activate|deactivate|resume|switch off|switch on|shut off|shut down|turn up|turn down";

// A request, not a question about history: the verb opens the sentence
// ("Pause the campaign"), or someone asks for it to be done ("Can you change…",
// "I want to increase…"). "How did leads change?" is not matched.
const actionRequestPatterns = [
  new RegExp(`^(?:please\\s+)?(?:${actionVerbs})\\b`, "u"),
  new RegExp(`\\b(?:can|could|would|will|should)\\s+(?:you|i|we|ai reach)\\s+(?:please\\s+)?(?:${actionVerbs})\\b`, "u"),
  new RegExp(`\\b(?:i|we)\\s+(?:want|need|would like)\\s+(?:you\\s+)?to\\s+(?:${actionVerbs})\\b`, "u"),
  new RegExp(`\\b(?:help me|go ahead and|let's|lets)\\s+(?:${actionVerbs})\\b`, "u"),
  // "Put the campaign on hold", "Could my ads be put on hold?"
  /\b(?:put|place)\b[^.?!]{0,40}\bon hold\b/u,
  // Passive requests: "Could my budget be raised?", "Can the ad be paused?"
  /\b(?:can|could|would|will|should)\s+(?:my|our|the|this|that|these|those|all)\b[^.?!]{0,40}\bbe\s+(?:put|paused|stopped|changed|increased|decreased|raised|lowered|turned|cancell?ed|deleted|updated|removed|scheduled|launched|published|sent|reduced|boosted|adjusted|set|created|edited|enabled|disabled|resumed|switched|shut)\b/u,
];

export function isActionRequest(normalized: string) {
  return actionRequestPatterns.some((pattern) => pattern.test(normalized));
}

export function answerAiReachQuestion(question: string, organizationName: string, briefing: AiReachBriefing) {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return "Ask a question about your sources, results, or next safe action.";

  if (isActionRequest(normalized)) {
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
