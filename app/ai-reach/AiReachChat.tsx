"use client";

import { useMemo, useState } from "react";
import type { AiReachBriefing } from "../../lib/ai-reach/briefing";

type Props = { organizationName: string; briefing: AiReachBriefing };

const starterQuestions = ["What is blocking good decisions?", "What should I connect first?", "Can I change my ads now?"];

export default function AiReachChat({ organizationName, briefing }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const sourceCount = useMemo(() => briefing.sources.filter((source) => source.state === "connected").length, [briefing.sources]);

  function ask(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return;
    setLastQuestion(value.trim());
    setQuestion("");
    if (normalized.includes("change") || normalized.includes("pause") || normalized.includes("spend")) {
      setAnswer("Not yet. This pilot is read-only. AI Reach can explain evidence, but it cannot change ads, budgets, bids, or targeting.");
      return;
    }
    if (normalized.includes("connect") || normalized.includes("source")) {
      setAnswer(sourceCount > 0 ? "Start with the missing source shown in Evidence coverage. Google Ads and Dubsado need approved read-only access before commercial reporting." : "Start with Google Ads through an approved read-only route. Then map Dubsado stages before using business-outcome metrics.");
      return;
    }
    setAnswer(`For ${organizationName}, the main limit is evidence coverage. Review the three actions below, then approve the missing source and metric definitions.`);
  }

  return <div className="ai-reach-chat"><div className="ai-reach-chat-history" aria-live="polite">{lastQuestion && <div className="ai-reach-message ai-reach-message-user"><span className="ai-reach-message-label">You</span><p>{lastQuestion}</p></div>}<div className="ai-reach-message ai-reach-message-assistant"><span className="ai-reach-message-label">AI Reach</span><p>{answer ?? "I will explain what the evidence supports and what still needs approval."}</p></div></div><div className="ai-reach-starters" aria-label="Starter questions">{starterQuestions.map((starter) => <button type="button" key={starter} onClick={() => ask(starter)}>{starter}</button>)}</div><form className="ai-reach-input" onSubmit={(event) => { event.preventDefault(); ask(question); }}><label htmlFor="ai-reach-question">Ask a question</label><div><input id="ai-reach-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Example: What should I do first?" /><button className="primary-button" type="submit" disabled={!question.trim()}>Ask</button></div></form></div>;
}
