"use client";

import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConnectionSetupForm() {
  const mutations = useMutationIdentityStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [system, setSystem] = useState("paid_media");
  const [provider, setProvider] = useState("google_ads");
  const [identifier, setIdentifier] = useState("");
  const [notSure, setNotSure] = useState(false);
  const [ownershipStatus, setOwnershipStatus] = useState("administrator");
  const [preferredMethod, setPreferredMethod] = useState("oauth");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const existingRequest = searchParams.get("request");
      const payload = { system, provider, ownershipStatus, preferredMethod, knownIdentifiers: [{ kind: "account", value: notSure ? undefined : identifier, notSure }], notes: notes || undefined };
      const endpoint = existingRequest ? `/api/v1/connection-requests/${existingRequest}` : "/api/v1/connection-requests";
      const response = await mutationFetch(mutations, `connection-request:${existingRequest ?? "new"}:${JSON.stringify(payload)}`, endpoint, { method: existingRequest ? "PATCH" : "POST", body: JSON.stringify(payload) });
      const body = await response.json() as { request?: { id: string }; error?: string };
      if (!response.ok) throw new Error(body.error ?? "The request could not be saved.");
      router.replace("/connections"); router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The request could not be saved."); } finally { setBusy(false); }
  };

  return <form className="auth-form connection-form" onSubmit={submit}>
    <label htmlFor="connection-system">System category</label>
    <select id="connection-system" value={system} onChange={(event) => setSystem(event.target.value)}><option value="paid_media">Paid media</option><option value="analytics">Analytics</option><option value="crm_revenue">CRM / revenue</option><option value="organic_social">Organic social</option><option value="website_lead_capture">Website / lead capture</option><option value="asset_source">Asset source</option></select>
    <label htmlFor="connection-provider">Provider</label>
    <select id="connection-provider" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="google_ads">Google Ads</option><option value="google_analytics">Google Analytics 4</option><option value="google_tag_manager">Google Tag Manager</option><option value="google_search_console">Google Search Console</option><option value="meta">Meta Business</option><option value="tiktok">TikTok for Business</option><option value="dubsado">Dubsado</option><option value="wordpress">WordPress</option><option value="videoask">VideoAsk</option><option value="organic_social">Organic social</option><option value="asset_source">Asset source</option></select>
    <label htmlFor="connection-id">Known account/property ID</label>
    <input id="connection-id" value={identifier} onChange={(event) => setIdentifier(event.target.value)} disabled={notSure} placeholder="Optional provider ID" />
    <label className="checkbox-label"><input type="checkbox" checked={notSure} onChange={(event) => setNotSure(event.target.checked)} /> I am not sure of the ID yet</label>
    <label htmlFor="connection-owner">Your access today</label>
    <select id="connection-owner" value={ownershipStatus} onChange={(event) => setOwnershipStatus(event.target.value)}><option value="administrator">Administrator</option><option value="owner">Owner</option><option value="viewer">Viewer</option><option value="invited">Invited</option><option value="not_sure">Not sure</option></select>
    <label htmlFor="connection-method">Preferred access route</label>
    <select id="connection-method" value={preferredMethod} onChange={(event) => setPreferredMethod(event.target.value)}><option value="oauth">Provider authorization</option><option value="provider_invitation">Official provider invitation</option><option value="service_principal">Service principal</option><option value="approved_export">Approved export</option><option value="manual_inventory">Inventory only</option></select>
    <label htmlFor="connection-notes">Short non-secret note</label>
    <textarea id="connection-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Anything MioDio should know about ownership or next steps?" />
    <p className="soft-note">Never paste a password, platform MFA or recovery code, private key, cookie, API token, or arbitrary credential here.</p>
    {error && <p className="auth-message error" role="alert">{error}</p>}
    <div className="form-footer"><Link className="text-link" href="/connections">Cancel</Link><button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save system request"}</button></div>
  </form>;
}
