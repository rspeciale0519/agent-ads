"use client";

import { useState } from "react";
import type { AiReachBriefing } from "../../lib/ai-reach/briefing";
import { answerAiReachQuestion } from "../../lib/ai-reach/chat";

type Props = { organizationName: string; briefing: AiReachBriefing };

const starterQuestions = ["What is blocking good decisions?", "What should I connect first?", "Can I change my ads now?"];

export default function AiReachChat({ organizationName, briefing }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLastQuestion(trimmed);
    setQuestion("");
    setAnswer(answerAiReachQuestion(trimmed, organizationName, briefing));
  }

  return <div className="ai-reach-chat"><div className="ai-reach-chat-history" aria-live="polite">{lastQuestion && <div className="ai-reach-message ai-reach-message-user"><span className="ai-reach-message-label">You</span><p>{lastQuestion}</p></div>}<div className="ai-reach-message ai-reach-message-assistant"><span className="ai-reach-message-label">AI Reach</span><p>{answer ?? "I will explain what the evidence supports and what still needs approval."}</p></div></div><div className="ai-reach-starters" aria-label="Starter questions">{starterQuestions.map((starter) => <button type="button" key={starter} onClick={() => ask(starter)}>{starter}</button>)}</div><form className="ai-reach-input" onSubmit={(event) => { event.preventDefault(); ask(question); }}><label htmlFor="ai-reach-question">Ask a question</label><div><input id="ai-reach-question" maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Example: What should I do first?" /><button className="primary-button" type="submit" disabled={!question.trim()}>Ask</button></div></form></div>;
}
