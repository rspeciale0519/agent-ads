"use client";

import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ActionClass = "connection_authorize" | "connection_revoke";

type Invitation = {
  id: string;
  provider?: string;
  method: string | null;
  status: string;
  expectedPrincipal: string;
  verificationSource: string | null;
  sourceDate: string | null;
  expiresAt: string | null;
};

type ResponseBody = { error?: string; grantId?: string };

type VerificationOption = { value: string; label: string };

const verificationOptionsByMethod: Record<string, readonly VerificationOption[]> = {
  provider_invitation: [
    { value: "provider_console", label: "Provider console" },
    { value: "operator_observation", label: "Operator observation" },
  ],
  approved_export: [{ value: "approved_export", label: "Approved export" }],
  client_owned_integration: [{ value: "client_owned_integration", label: "Client-owned integration" }],
  manual_inventory: [
    { value: "provider_console", label: "Provider console" },
    { value: "operator_observation", label: "Operator observation" },
  ],
  default: [
    { value: "provider_console", label: "Provider console" },
    { value: "operator_observation", label: "Operator observation" },
    { value: "approved_export", label: "Approved export" },
    { value: "client_owned_integration", label: "Client-owned integration" },
  ],
};

const terminalStatuses = ["revoked", "verified", "expired"];

function responseError(body: ResponseBody, fallback: string) {
  return body.error ?? fallback;
}

export default function ManualInvitationActions({ invitation }: { invitation: Invitation }) {
  const mutations = useMutationIdentityStore();
  const grants = useRef<Partial<Record<ActionClass, string>>>({});
  const router = useRouter();
  const verificationOptions = verificationOptionsByMethod[invitation.method ?? "default"] ?? verificationOptionsByMethod.default;
  const [verificationSource, setVerificationSource] = useState(verificationOptions[0]?.value ?? "provider_console");
  const [sourceDate, setSourceDate] = useState(invitation.sourceDate?.slice(0, 10) ?? "");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canSend = invitation.method === "provider_invitation" && ["draft", "attention_required"].includes(invitation.status);
  const canVerify = !terminalStatuses.includes(invitation.status);
  const canRevoke = invitation.status !== "revoked";
  const verificationIntent = `manual-invitation-verify:${invitation.id}`;

  useEffect(() => {
    if (!verificationOptions.some((option) => option.value === verificationSource)) setVerificationSource(verificationOptions[0]?.value ?? "provider_console");
  }, [invitation.method, verificationOptions, verificationSource]);

  const issueGrant = async (actionClass: ActionClass) => {
    const cached = grants.current[actionClass];
    if (cached) return cached;
    const intent = `step-up:${actionClass}`;
    const response = await mutationFetch(mutations, intent, "/api/v1/security/step-up/verify", {
      method: "POST",
      body: JSON.stringify({ actionClass }),
    });
    const body = await response.json() as ResponseBody;
    if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") mutations.reset(intent);
    if (!response.ok || !body.grantId) throw new Error(responseError(body, "Complete MFA before this protected action."));
    grants.current[actionClass] = body.grantId;
    return body.grantId;
  };

  const runProtected = async (action: "send" | "revoke") => {
    if (action === "revoke" && !window.confirm("Revoke this manual access route?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const actionClass: ActionClass = action === "send" ? "connection_authorize" : "connection_revoke";
      const grantId = await issueGrant(actionClass);
      const intent = `manual-invitation-${action}:${invitation.id}`;
      const response = await mutationFetch(mutations, intent, `/api/v1/access-invitations/${invitation.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ grantId }),
      });
      const body = await response.json() as ResponseBody;
      if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") {
        mutations.reset(intent); delete grants.current[actionClass];
        setMessage("The previous request needs reconciliation. Refreshing the recorded route state."); router.refresh(); return;
      }
      if (!response.ok) throw new Error(responseError(body, `${action} failed.`));
      delete grants.current[actionClass];
      setMessage(action === "send" ? "Official route marked as sent." : "Manual access route revoked.");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `${action} failed.`);
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!sourceDate || !evidenceNote.trim()) { setError("Add the evidence source, date, and a safe evidence note."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await mutationFetch(mutations, verificationIntent, `/api/v1/access-invitations/${invitation.id}/verify`, {
        method: "POST",
        body: JSON.stringify({ verificationSource, sourceDate, evidenceNote }),
      });
      const body = await response.json() as ResponseBody;
      if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") {
        mutations.reset(verificationIntent); setMessage("The previous verification needs reconciliation. Refreshing the recorded route state."); router.refresh(); return;
      }
      if (!response.ok) throw new Error(responseError(body, "Verification failed."));
      setEvidenceNote(""); setMessage("Route verified from the recorded non-mutating evidence.");
      router.refresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Verification failed.");
    } finally { setBusy(false); }
  };

  if (!canSend && !canVerify && !canRevoke) return null;
  return <div className="manual-invitation-actions">
    {(canSend || canRevoke) && <p className="soft-note">Protected send and revoke actions require current application MFA. A short-lived grant is created and consumed without being stored in browser storage.</p>}
    {canSend && <button className="secondary-button" type="button" onClick={() => void runProtected("send")} disabled={busy}>{busy ? "Working…" : "Mark official route sent"}</button>}
    {canVerify && <fieldset className="manual-verification-fields">
      <legend>Record verification evidence</legend>
      <label htmlFor={`verification-source-${invitation.id}`}>Evidence source</label>
      <select id={`verification-source-${invitation.id}`} value={verificationSource} onChange={(event) => { mutations.reset(verificationIntent); setVerificationSource(event.target.value); }} disabled={busy}>
        {verificationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <label htmlFor={`verification-date-${invitation.id}`}>Evidence date</label>
      <input id={`verification-date-${invitation.id}`} type="date" value={sourceDate} onChange={(event) => { mutations.reset(verificationIntent); setSourceDate(event.target.value); }} max={new Date().toISOString().slice(0, 10)} disabled={busy} />
      <label htmlFor={`verification-note-${invitation.id}`}>Safe evidence note</label>
      <textarea id={`verification-note-${invitation.id}`} value={evidenceNote} onChange={(event) => { mutations.reset(verificationIntent); setEvidenceNote(event.target.value); }} maxLength={500} placeholder="Record what was observed. Never paste a password, token, key, cookie, or MFA code." disabled={busy} />
      <button className="secondary-button" type="button" onClick={() => void verify()} disabled={busy}>{busy ? "Working…" : "Mark verified"}</button>
      <small>Verification requires an AAL2 application session; an email or checkbox alone is not evidence.</small>
    </fieldset>}
    {canRevoke && <button className="text-button" type="button" onClick={() => void runProtected("revoke")} disabled={busy}>Revoke route</button>}
    <p className="manual-action-help"><a href="/security/mfa">Open security setup</a> if MFA or a step-up grant is required.</p>
    {error && <p className="auth-message error" role="alert">{error}</p>}
    {message && <p className="auth-message notice" role="status">{message}</p>}
  </div>;
}
