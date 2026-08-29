"use client";

import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ManualInventoryPanel() {
  const mutations = useMutationIdentityStore();
  const router = useRouter();
  const [provider, setProvider] = useState("dubsado");
  const [method, setMethod] = useState("approved_export");
  const [principal, setPrincipal] = useState("");
  const [externalId, setExternalId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const payload = { provider, method, expectedPrincipal: principal, externalAccountId: externalId || undefined, instructions };
      const response = await mutationFetch(mutations, `manual-invitation-create:${JSON.stringify(payload)}`, "/api/v1/access-invitations", { method: "POST", body: JSON.stringify(payload) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The route could not be saved.");
      setMessage("Route saved. Continue through the official invitation or approved export path."); setPrincipal(""); setExternalId(""); setInstructions(""); router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The route could not be saved."); } finally { setBusy(false); }
  };

  return <form className="auth-form connection-form" onSubmit={submit}>
    <label htmlFor="manual-provider">System</label>
    <select id="manual-provider" value={provider} onChange={(event) => { setProvider(event.target.value); setMethod(event.target.value === "dubsado" ? "approved_export" : "provider_invitation"); }}><option value="google_search_console">Google Search Console</option><option value="dubsado">Dubsado</option><option value="wordpress">WordPress</option><option value="videoask">VideoAsk</option><option value="organic_social">Organic/social account</option><option value="asset_source">Asset source</option></select>
    <label htmlFor="manual-method">Approved route</label>
    <select id="manual-method" value={method} onChange={(event) => setMethod(event.target.value)}>{provider === "dubsado" ? <><option value="approved_export">Approved CSV export</option><option value="client_owned_integration">Client-owned integration</option></> : <><option value="provider_invitation">Official provider invitation</option><option value="manual_inventory">Inventory only</option></>}</select>
    <label htmlFor="manual-principal">Expected principal or owner</label>
    <input id="manual-principal" value={principal} onChange={(event) => setPrincipal(event.target.value)} maxLength={200} required placeholder="Example: client-owned workspace admin" />
    <label htmlFor="manual-id">Known account or site ID (optional)</label>
    <input id="manual-id" value={externalId} onChange={(event) => setExternalId(event.target.value)} maxLength={200} placeholder="Non-secret identifier only" />
    <label htmlFor="manual-instructions">Safe handoff instructions</label>
    <textarea id="manual-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={1200} required placeholder="Record where the official invite or approved export will be confirmed. Do not paste a login, token, key, or code." />
    <p className="soft-note">Verification requires a non-mutating provider-console, operator, approved-export, or client-owned-integration check. An email or checkbox alone never proves access.</p>
    {error && <p className="auth-message error" role="alert">{error}</p>}{message && <p className="auth-message notice" role="status">{message}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save safe route"}</button>
  </form>;
}
