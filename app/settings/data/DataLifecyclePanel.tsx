"use client";

import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";

import { useRef, useState } from "react";

type ActionClass = "organization_export" | "organization_offboard";
type ResponseBody = { error?: string; grantId?: string; result?: { status: "offboarding_in_progress" | "offboarded"; remainingConnectionCount?: number } };

export default function DataLifecyclePanel({ organizationId, organizationName, canOffboard }: { organizationId: string; organizationName: string; canOffboard: boolean }) {
  const mutations = useMutationIdentityStore();
  const grants = useRef<Partial<Record<ActionClass, string>>>({});
  const expectedConfirmation = `OFFBOARD ${organizationName}`;
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const issueGrant = async (actionClass: ActionClass) => {
    if (grants.current[actionClass]) return grants.current[actionClass];
    const intent = `step-up:${actionClass}`;
    const response = await mutationFetch(mutations, intent, "/api/v1/security/step-up/verify", { method: "POST", body: JSON.stringify({ actionClass }) });
    const body = await response.json() as ResponseBody;
    if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") mutations.reset(intent);
    if (!response.ok || !body.grantId) throw new Error(body.error ?? "Complete MFA before this protected action.");
    grants.current[actionClass] = body.grantId;
    return body.grantId;
  };

  const exportData = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const grantId = await issueGrant("organization_export");
      const intent = `organization-export:${organizationId}`;
      const response = await mutationFetch(mutations, intent, `/api/v1/organizations/${organizationId}/connection-export`, { method: "POST", body: JSON.stringify({ grantId }) });
      if (!response.ok) {
        const body = await response.json() as ResponseBody;
        if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") {
          mutations.reset(intent);
          delete grants.current.organization_export;
        }
        throw new Error(body.error ?? "The export could not be prepared.");
      }
      const blob = await response.blob();
      delete grants.current.organization_export;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "account-connections-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("A protected Account Connections export was downloaded.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The export could not be prepared.");
    } finally { setBusy(false); }
  };

  const offboard = async () => {
    if (confirmation !== expectedConfirmation) { setError("Enter the exact confirmation phrase before offboarding."); return; }
    if (!window.confirm("This revokes provider access, destroys managed secrets, archives connection inventory, disables every membership, and makes this workspace inactive. Continue?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const grantId = await issueGrant("organization_offboard");
      const intent = `organization-offboard:${organizationId}`;
      const response = await mutationFetch(mutations, intent, `/api/v1/organizations/${organizationId}/offboard`, { method: "POST", body: JSON.stringify({ grantId, confirmation }) });
      const body = await response.json() as ResponseBody;
      if (!response.ok) {
        if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") {
          mutations.reset(intent);
          delete grants.current.organization_offboard;
        }
        throw new Error(body.error ?? "Offboarding could not complete.");
      }
      delete grants.current.organization_offboard;
      if (body.result?.status === "offboarding_in_progress") {
        setMessage(`A protected revocation batch completed. ${body.result.remainingConnectionCount ?? "Additional"} connections remain; run offboarding again to continue.`);
        return;
      }
      setMessage("Offboarding completed. Redirecting to the access screen.");
      window.location.assign("/access-pending");
    } catch (offboardingError) {
      setError(offboardingError instanceof Error ? offboardingError.message : "Offboarding could not complete.");
    } finally { setBusy(false); }
  };

  return <div className="workspace-grid">
    <article className="workspace-card workspace-card-wide">
      <span className="eyebrow">Customer data export</span><h2>Download Account Connections records</h2>
      <p>The JSON export contains tenant-owned connection metadata, selected resources, lifecycle evidence, invitations, and redacted audit history. It excludes secrets, broker handles, OAuth transactions, sessions, PKCE material, and raw provider responses.</p>
      <button className="secondary-button" type="button" onClick={() => void exportData()} disabled={busy}>{busy ? "Preparing…" : "Download protected export"}</button>
    </article>
    {canOffboard && <article className="workspace-card workspace-card-wide">
      <span className="eyebrow">Owner-only offboarding</span><h2>Revoke and deactivate this workspace</h2>
      <p>Offboarding is fail-closed: all connection revocation and broker cleanup must complete before inventory is archived or memberships are disabled. Audit history is retained according to the approved retention policy.</p>
      <label htmlFor="offboarding-confirmation">Type <strong>{expectedConfirmation}</strong></label>
      <input id="offboarding-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" disabled={busy} />
      <button className="text-button" type="button" onClick={() => void offboard()} disabled={busy || confirmation !== expectedConfirmation}>Offboard workspace</button>
    </article>}
    {error && <p className="auth-message error" role="alert">{error}</p>}
    {message && <p className="auth-message notice" role="status">{message}</p>}
  </div>;
}
