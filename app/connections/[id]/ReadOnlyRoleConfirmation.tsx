"use client";

import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ResponseBody = { error?: string; grantId?: string };

export default function ReadOnlyRoleConfirmation({ connectionId }: { connectionId: string }) {
  const mutations = useMutationIdentityStore();
  const grantId = useRef("");
  const router = useRouter();
  const [evidenceSource, setEvidenceSource] = useState("provider_console");
  const [sourceDate, setSourceDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const resetConfirmation = () => { mutations.reset(`connection-role-confirm:${connectionId}`); grantId.current = ""; };

  const confirmRole = async () => {
    if (!sourceDate) {
      setError("Select the evidence source and date.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const grantIntent = "step-up:connection_role_confirm";
      const grantResponse = grantId.current ? null : await mutationFetch(mutations, grantIntent, "/api/v1/security/step-up/verify", {
        method: "POST",
        body: JSON.stringify({ actionClass: "connection_role_confirm" }),
      });
      if (grantResponse) {
        const grantBody = await grantResponse.json() as ResponseBody;
        if (grantBody.error === "IDEMPOTENCY_ALREADY_COMPLETED" || grantBody.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") mutations.reset(grantIntent);
        if (!grantResponse.ok || !grantBody.grantId) throw new Error(grantBody.error ?? "Complete MFA before confirming provider access.");
        grantId.current = grantBody.grantId;
      }
      const response = await mutationFetch(mutations, `connection-role-confirm:${connectionId}`, `/api/v1/connections/${connectionId}/role-confirmation`, {
        method: "POST",
        body: JSON.stringify({ grantId: grantId.current, evidenceSource, sourceDate }),
      });
      const body = await response.json() as ResponseBody;
      if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") {
        resetConfirmation();
        setMessage("The previous role-evidence request needs reconciliation. Refreshing the connection state.");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error(body.error ?? "Role evidence could not be recorded.");
      grantId.current = "";
      setMessage("Read-only role evidence recorded for this connection. Run verification to activate it.");
      router.refresh();
    } catch (confirmationError) {
      setError(confirmationError instanceof Error ? confirmationError.message : "Role evidence could not be recorded.");
    } finally {
      setBusy(false);
    }
  };

  return <fieldset className="manual-verification-fields">
    <legend>Confirm effective read-only role</legend>
    <p className="soft-note">OAuth scopes and discovered assets do not prove the provider account role. Confirm the effective role from a non-mutating provider view for this connection only.</p>
    <label htmlFor={`role-source-${connectionId}`}>Evidence source</label>
    <select id={`role-source-${connectionId}`} value={evidenceSource} onChange={(event) => { resetConfirmation(); setEvidenceSource(event.target.value); }} disabled={busy}>
      <option value="provider_console">Provider console</option>
      <option value="operator_observation">Operator observation</option>
    </select>
    <label htmlFor={`role-date-${connectionId}`}>Evidence date</label>
    <input id={`role-date-${connectionId}`} type="date" value={sourceDate} onChange={(event) => { resetConfirmation(); setSourceDate(event.target.value); }} max={new Date().toISOString().slice(0, 10)} disabled={busy} />
    <p className="soft-note">The audit records the source, date, actor, connection, and result. It does not collect free-text notes.</p>
    <button className="secondary-button" type="button" onClick={() => void confirmRole()} disabled={busy}>{busy ? "Recording…" : "Record role evidence"}</button>
    {error && <p className="auth-message error" role="alert">{error}</p>}
    {message && <p className="auth-message notice" role="status">{message}</p>}
  </fieldset>;
}
