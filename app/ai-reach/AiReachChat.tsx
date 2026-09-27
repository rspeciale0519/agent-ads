"use client";

import { useState } from "react";
import { mutationFetch, useMutationIdentityStore } from "../../lib/api/client-mutation";
import type { AiReachChatMessage } from "../../lib/ai-reach/chat-service";

type Props = { initialConversation: { conversationId: string; messages: AiReachChatMessage[] } | null };
type ResponseBody = { error?: string; result?: { conversationId: string; messages: AiReachChatMessage[] } };

const starterQuestions = ["How many qualified leads did I get?", "What is blocking good decisions?", "Can I change my ads now?"];

// Plain-language names for where a cited number came from.
function sourceLabel(citation: AiReachChatMessage["citations"][number]) {
  const provider = citation.provider === "dubsado" ? "Dubsado export" : citation.provider === "google_ads" ? "Google Ads report" : citation.provider;
  return `${provider}, collected ${new Date(citation.collectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function AiReachChat({ initialConversation }: Props) {
  const mutations = useMutationIdentityStore();
  const [conversationId, setConversationId] = useState(initialConversation?.conversationId ?? null);
  const [messages, setMessages] = useState<AiReachChatMessage[]>(initialConversation?.messages ?? []);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reloadConversation() {
    const response = await fetch("/api/v1/ai-reach/chat", { cache: "no-store" });
    const body = await response.json() as { conversation?: Props["initialConversation"] };
    if (response.ok && body.conversation) {
      setConversationId(body.conversation.conversationId);
      setMessages(body.conversation.messages);
    }
  }

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    // The same pending question keeps one request identity until it succeeds,
    // so resending after a lost response cannot save it twice.
    const intent = `ai-reach-ask:${conversationId ?? "new"}:${trimmed}`;
    try {
      const response = await mutationFetch(mutations, intent, "/api/v1/ai-reach/chat", {
        method: "POST",
        body: JSON.stringify(conversationId ? { question: trimmed, conversationId } : { question: trimmed }),
      });
      const body = await response.json() as ResponseBody;
      if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") {
        // The earlier attempt was saved but its answer never arrived. Reload the saved conversation instead of asking again.
        mutations.reset(intent);
        await reloadConversation();
        setQuestion("");
        return;
      }
      if (!response.ok || !body.result) {
        mutations.reset(intent);
        throw new Error(body.error === "AI_REACH_QUESTION_CONTAINS_SECRET" ? "That looks like a password or token. Please remove it and ask again." : body.error ?? "AI Reach could not answer right now.");
      }
      setConversationId(body.result.conversationId);
      setMessages((current) => [...current, ...body.result!.messages]);
      setQuestion("");
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "AI Reach could not answer right now.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="ai-reach-chat">
    <div className="ai-reach-chat-history" aria-live="polite">
      {messages.length === 0 && <div className="ai-reach-message ai-reach-message-assistant"><span className="ai-reach-message-label">AI Reach</span><p>I answer from your saved evidence and show where each number came from. If I don&apos;t have the evidence, I&apos;ll say so.</p></div>}
      {messages.map((message) => <div key={message.id} className={`ai-reach-message ai-reach-message-${message.role}`}>
        <span className="ai-reach-message-label">{message.role === "user" ? "You" : "AI Reach"}</span>
        <p>{message.content}</p>
        {message.citations.length > 0 && <ul className="ai-reach-citations" aria-label="Sources">{message.citations.map((citation) => <li key={citation.evidenceId}>Source: {sourceLabel(citation)}</li>)}</ul>}
      </div>)}
    </div>
    {error && <p className="ai-reach-report-error" role="alert">{error}</p>}
    <div className="ai-reach-starters" aria-label="Starter questions">{starterQuestions.map((starter) => <button type="button" key={starter} disabled={busy} onClick={() => ask(starter)}>{starter}</button>)}</div>
    <form className="ai-reach-input" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
      <label htmlFor="ai-reach-question">Ask a question</label>
      <div><input id="ai-reach-question" maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Example: How much revenue did I book last month?" /><button className="primary-button" type="submit" disabled={!question.trim() || busy}>{busy ? "Asking…" : "Ask"}</button></div>
    </form>
  </div>;
}
