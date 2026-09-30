"use client";

import { useState } from "react";
import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";

type ResponseBody = { error?: string; settings?: { staleUploadDays: number } };

// Plain-language messages for the errors a person can fix.
const errorMessages: Record<string, string> = {
  AAL2_REQUIRED: "Complete 2-step login, then save again.",
  ACTIVE_SESSION_REQUIRED: "Your session expired. Sign in again, then save.",
  PERMISSION_DENIED: "Only owners and administrators can change settings.",
  VALIDATION_FAILED: "Enter a whole number of days in the allowed range.",
};

export default function GeneralSettingsPanel({ organizationId, staleUploadDays, minDays, maxDays }: { organizationId: string; staleUploadDays: number; minDays: number; maxDays: number }) {
  const mutations = useMutationIdentityStore();
  // The saved value, and what is currently typed in the box.
  const [saved, setSaved] = useState(staleUploadDays);
  const [days, setDays] = useState(String(staleUploadDays));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const value = Number(days);
  const valid = Number.isInteger(value) && value >= minDays && value <= maxDays;

  const save = async () => {
    if (!valid) { setError(errorMessages.VALIDATION_FAILED); return; }
    setBusy(true); setError(""); setMessage("");
    // Each distinct value is its own change, so a retry of the same save is not applied twice.
    const intent = `organization-settings:${organizationId}:${value}`;
    try {
      const response = await mutationFetch(mutations, intent, `/api/v1/organizations/${organizationId}/settings`, { method: "POST", body: JSON.stringify({ staleUploadDays: value }) });
      const body = await response.json().catch(() => ({})) as ResponseBody;
      if (!response.ok || !body.settings) {
        if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") mutations.reset(intent);
        throw new Error(errorMessages[body.error ?? ""] ?? "Settings could not be saved. Try again.");
      }
      mutations.reset(intent);
      setSaved(body.settings.staleUploadDays);
      setMessage("Saved. AI Reach now uses this limit.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Settings could not be saved. Try again.");
    } finally { setBusy(false); }
  };

  return <div className="workspace-grid">
    <article className="workspace-card workspace-card-wide">
      <span className="eyebrow">Uploaded exports</span><h2>When is an upload out of date?</h2>
      <p>AI Reach stops using an uploaded export (such as a Dubsado export) for step-by-step advice after this many days, and asks for a fresh upload. Currently {saved} {saved === 1 ? "day" : "days"}.</p>
      <label htmlFor="stale-upload-days">Treat uploads as out of date after (days, {minDays}–{maxDays})</label>
      <input id="stale-upload-days" type="number" inputMode="numeric" min={minDays} max={maxDays} step={1} value={days} onChange={(event) => setDays(event.target.value)} disabled={busy} />
      <button className="secondary-button" type="button" onClick={() => void save()} disabled={busy || !valid || value === saved}>{busy ? "Saving…" : "Save"}</button>
    </article>
    {error && <p className="auth-message error" role="alert">{error}</p>}
    {message && <p className="auth-message notice" role="status">{message}</p>}
  </div>;
}
