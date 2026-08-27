"use client";

import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInvitationPage() {
  const mutations = useMutationIdentityStore();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await mutationFetch(mutations, "organization-invitation-accept", "/api/v1/organization-invitations/accept", { method: "POST", body: JSON.stringify({ code }) });
      const payload = await response.json() as { organization?: { organizationId: string }; error?: string };
      if (payload.error === "IDEMPOTENCY_ALREADY_COMPLETED") { router.replace("/dashboard"); router.refresh(); return; }
      if (!response.ok) throw new Error(payload.error ?? "Invitation could not be accepted.");
      router.replace("/dashboard"); router.refresh();
    } catch (acceptError) { setError(acceptError instanceof Error ? acceptError.message : "Invitation could not be accepted."); } finally { setBusy(false); }
  };
  return <main className="security-shell"><section className="security-card"><span className="eyebrow">Workspace invitation</span><h1>Join your MioDio workspace.</h1><p>Paste the one-time code from your invitation email. It is exchanged in this request body and never placed in the URL.</p><form className="auth-form" onSubmit={submit}><label htmlFor="invitation-code">Invitation code</label><input id="invitation-code" value={code} onChange={(event) => { mutations.reset("organization-invitation-accept"); setCode(event.target.value); }} autoComplete="off" required /><button className="primary-button" type="submit" disabled={busy}>{busy ? "Joining…" : "Accept invitation"}</button>{error && <p className="auth-message error" role="alert">{error}</p>}</form></section></main>;
}
