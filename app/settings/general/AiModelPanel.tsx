"use client";

import { useRef, useState } from "react";
import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";

type Provider = { id: string; label: string; exampleModel: string };
type Saved = { provider: string; model: string; keyHint: string; updatedAt: string } | null;
type ResponseBody = { error?: string; grantId?: string; settings?: Saved; result?: { removed: boolean } };

// Plain-language messages for errors a person can fix.
const errorMessages: Record<string, string> = {
  AAL2_REQUIRED: "Complete 2-step login, then try again.",
  STEP_UP_REQUIRED: "Complete 2-step login, then try again.",
  ACTIVE_SESSION_REQUIRED: "Your session expired. Sign in again, then try again.",
  PERMISSION_DENIED: "Only owners and administrators can change the AI model.",
  AI_MODEL_KEY_REQUIRED: "Enter an API key for this company.",
  VALIDATION_FAILED: "Check the model name (letters, numbers, and . _ : / @ - only) and the API key.",
};

// platformDefault is the model the whole app uses when a workspace has none
// saved; null means chat falls back to built-in answers.
export default function AiModelPanel({ organizationId, providers, saved: initial, platformDefault }: { organizationId: string; providers: Provider[]; saved: Saved; platformDefault: { provider: string; model: string } | null }) {
  const mutations = useMutationIdentityStore();
  const grant = useRef<string | null>(null);
  const [saved, setSaved] = useState<Saved>(initial);
  const [provider, setProvider] = useState(initial?.provider ?? providers[0].id);
  const [model, setModel] = useState(initial?.model ?? providers[0].exampleModel);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // A key is needed the first time and whenever the company changes.
  const keyRequired = !saved || saved.provider !== provider;
  const chosen = providers.find((entry) => entry.id === provider) ?? providers[0];
  const labelFor = (id: string) => providers.find((entry) => entry.id === id)?.label ?? id;
  // What chat uses when nothing is saved for this workspace.
  const fallback = platformDefault
    ? `the app's default model (${labelFor(platformDefault.provider)}, model ${platformDefault.model}), so questions go to ${labelFor(platformDefault.provider)}`
    : "its built-in answers, and no questions are sent to an AI company";

  // Asks the server for a one-time MFA grant for this protected change.
  const issueGrant = async () => {
    if (grant.current) return grant.current;
    const intent = "step-up:ai_model_manage";
    const response = await mutationFetch(mutations, intent, "/api/v1/security/step-up/verify", { method: "POST", body: JSON.stringify({ actionClass: "ai_model_manage" }) });
    const body = await response.json().catch(() => ({})) as ResponseBody;
    mutations.reset(intent);
    if (!response.ok || !body.grantId) throw new Error(errorMessages[body.error ?? ""] ?? "Complete 2-step login, then try again.");
    grant.current = body.grantId;
    return body.grantId;
  };

  const send = async (method: "POST" | "DELETE", payload: Record<string, unknown>) => {
    const grantId = await issueGrant();
    const intent = `ai-model:${organizationId}:${method}:${grantId}`;
    const response = await mutationFetch(mutations, intent, `/api/v1/organizations/${organizationId}/ai-model`, { method, body: JSON.stringify({ grantId, ...payload }) });
    const body = await response.json().catch(() => ({})) as ResponseBody;
    // A grant is single-use, so the next change always asks for a new one.
    grant.current = null;
    mutations.reset(intent);
    if (!response.ok) throw new Error(errorMessages[body.error ?? ""] ?? "The change could not be saved. Try again.");
    return body;
  };

  const save = async () => {
    if (keyRequired && !apiKey.trim()) { setError(errorMessages.AI_MODEL_KEY_REQUIRED); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const body = await send("POST", { provider, model: model.trim(), ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) });
      setSaved(body.settings ?? null);
      setApiKey("");
      setMessage("Saved. AI Reach chat now uses this model.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The change could not be saved. Try again.");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm("Remove the saved AI model and delete its API key?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await send("DELETE", {});
      setSaved(null);
      setMessage(`Removed. AI Reach chat now uses ${fallback}.`);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "The model could not be removed. Try again.");
    } finally { setBusy(false); }
  };

  return <div className="workspace-grid">
    <article className="workspace-card workspace-card-wide">
      <span className="eyebrow">AI model</span><h2>Which AI answers chat questions?</h2>
      <p>{saved ? `Currently ${providers.find((entry) => entry.id === saved.provider)?.label ?? saved.provider}, model ${saved.model}, key ending in ${saved.keyHint}.` : `No model is saved for this workspace, so AI Reach chat uses ${fallback}.`}</p>
      <p className="workspace-muted">Questions are sent to the company you choose, with emails, phone numbers, and links removed first. The model only picks which saved results to show; AI Reach writes every answer itself. Your key is stored encrypted and is never shown again.</p>
      <label htmlFor="ai-provider">Company</label>
      <select id="ai-provider" value={provider} onChange={(event) => { setProvider(event.target.value); setModel(providers.find((entry) => entry.id === event.target.value)?.exampleModel ?? ""); }} disabled={busy}>
        {providers.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
      </select>
      <label htmlFor="ai-model">Model name (for example, {chosen.exampleModel})</label>
      <input id="ai-model" value={model} onChange={(event) => setModel(event.target.value)} autoComplete="off" spellCheck={false} disabled={busy} />
      <label htmlFor="ai-key">API key{keyRequired ? "" : " (leave blank to keep the saved key)"}</label>
      <input id="ai-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" spellCheck={false} disabled={busy} />
      <button className="secondary-button" type="button" onClick={() => void save()} disabled={busy || !model.trim()}>{busy ? "Saving…" : "Save"}</button>
      {saved && <button className="text-button" type="button" onClick={() => void remove()} disabled={busy}>Remove model and key</button>}
    </article>
    {error && <p className="auth-message error" role="alert">{error}</p>}
    {message && <p className="auth-message notice" role="status">{message}</p>}
  </div>;
}
