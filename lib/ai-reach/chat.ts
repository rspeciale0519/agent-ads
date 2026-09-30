import type { AiReachBriefing } from "./briefing";

// Verbs that would change an account. The pilot is read-only, so a request to
// do one of these is refused before any evidence is read.
const actionVerbs = "change|pause|stop|increase|decrease|raise|lower|edit|publish|send|launch|delete|adjust|turn off|turn on|cancel|boost|cut";

// Verbs that also have everyday read-only uses ("Create a summary", "Set up a
// report"). They count as a change only when their object is something in an
// account, such as a campaign, budget, website, email, or CRM record.
const targetedVerbs = "set|create|update|modify|remove|schedule|allocate|reallocate|reduce|double|halve|enable|disable|activate|deactivate|resume|switch off|switch on|shut off|shut down|turn up|turn down|put|place";
const accountTargets = "ads?|campaigns?|ad groups?|ad sets?|budgets?|bids?|bidding|keywords?|audiences?|targeting|spend|website|site|landing pages?|pages?|emails?|newsletters?|crm|records?|contacts?|deals?|pipeline|accounts?";
// Nouns for read-only outputs. A target followed by one of these describes
// the output ("a Google Ads report", "a Google Ads monthly report"), not the
// thing being changed. Up to two describing words may sit in between.
const reportNouns = "reports?|summary|summaries|performance|results?|metrics?|data|stats|statistics|breakdowns?|overviews?|analysis|numbers|trends?|insights?|dashboards?|charts?|graphs?";
// A report noun is the requested output only when the phrase ends there
// ("…monthly report", "…report for May"). "Set campaign performance targets"
// and "Create a Google Ads performance campaign" are still changes.
const reportEnd = "(?=\\s*$|\\s*[.,;:!?)]|\\s+(?:for|of|on|about|by|from|in|with|to|that|which|and|so|please|showing|comparing|per|over|across|since|between|this|last)\\b)";
// The verb, up to a few small words ("a new", "my search"), then the target
// as the direct object. "Create a summary of leads" and "Create a Google Ads
// report" are not matched: "summary" and "report" are the objects.
const targetedAction = `(?:${targetedVerbs})\\s+(?:(?:a|an|the|my|our|this|that|these|those|all|new|every)\\s+)*(?:[\\w'-]+\\s+)?(?:${accountTargets})\\b(?!(?:\\s+[\\w'-]+){0,2}?\\s+(?:${reportNouns})${reportEnd})`;
const anyAction = `(?:${actionVerbs})\\b|${targetedAction}`;

// A request, not a question about history: the verb opens the sentence
// ("Pause the campaign"), or someone asks for it to be done ("Can you change…",
// "I want to increase…"). "How did leads change?" and "When did we put the
// campaign on hold?" are not matched.
const actionRequestPatterns = [
  new RegExp(`^(?:please\\s+)?(?:${anyAction})`, "u"),
  new RegExp(`\\b(?:can|could|would|will|should)\\s+(?:you|i|we|ai reach)\\s+(?:please\\s+)?(?:${anyAction})`, "u"),
  new RegExp(`\\b(?:i|we)\\s+(?:want|need|would like)\\s+(?:you\\s+)?to\\s+(?:${anyAction})`, "u"),
  new RegExp(`\\b(?:help me|go ahead and|let's|lets)\\s+(?:${anyAction})`, "u"),
  // Passive requests about something in an account: "Could my budget be
  // raised?", "Can the ad be put on hold?". "Can the report be updated?" is not.
  new RegExp(`\\b(?:can|could|would|will|should)\\s+(?:my|our|the|this|that|these|those|all)\\b[^.?!]{0,40}\\b(?:${accountTargets})\\b[^.?!]{0,20}\\bbe\\s+(?:put|paused|stopped|changed|increased|decreased|raised|lowered|turned|cancell?ed|deleted|updated|removed|scheduled|launched|published|sent|reduced|boosted|adjusted|set|created|edited|enabled|disabled|resumed|switched|shut)\\b`, "u"),
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
