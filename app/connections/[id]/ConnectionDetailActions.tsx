"use client";

import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";

import { useRef, useState } from "react";

type Resource = { id: string; displayName: string; eligibility: string; selected: boolean };
type ProtectedAction = "reconnect" | "revoke" | "archive";
type ResponseBody = { authorizationUrl?: string; result?: { state: string }; error?: string; grantId?: string };

export default function ConnectionDetailActions({ connectionId, status, resources }: { connectionId: string; status: string; resources: Resource[] }) {
  const mutations = useMutationIdentityStore();
  const [selected, setSelected] = useState(resources.filter((resource) => resource.selected).map((resource) => resource.id));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const grants = useRef<Partial<Record<ProtectedAction, string>>>({});
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const saveResources = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    const intent = `connection-resources:${connectionId}:${[...selected].sort().join(",")}`;
    try {
      const response = await mutationFetch(mutations, intent, `/api/v1/connections/${connectionId}/resources`, {
        method: "PUT",
        body: JSON.stringify({ resourceIds: selected }),
      });
      const body = await response.json() as { error?: string };
      if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") {
        mutations.reset(intent);
        setMessage("The previous resource request needs reconciliation. Refresh this page before you change the selection.");
        return;
      }
      if (!response.ok) {
        if (body.error !== "IDEMPOTENCY_IN_PROGRESS") mutations.reset(intent);
        throw new Error(body.error ?? "Resources could not be selected.");
      }
      setMessage("Resource selection saved. Run verification when you are ready.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Resources could not be selected.");
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    const intent = `connection-verify:${connectionId}`;
    try {
      const response = await mutationFetch(mutations, intent, `/api/v1/connections/${connectionId}/verify`, { method: "POST" });
      const body = await response.json() as { result?: { outcomeCode: string }; error?: string };
      if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") {
        mutations.reset(intent);
        setMessage("The previous verification needs reconciliation. Refresh this page before you run it again.");
        return;
      }
      if (!response.ok) {
        if (body.error !== "IDEMPOTENCY_IN_PROGRESS") mutations.reset(intent);
        throw new Error(body.error ?? "Verification could not run.");
      }
      setMessage(`Verification result: ${body.result?.outcomeCode ?? "complete"}. Refresh to see the normalized status.`);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Verification could not run.");
    } finally {
      setBusy(false);
    }
  };
  const issueGrant = async (action: ProtectedAction) => {
    const cached = grants.current[action];
    if (cached) return cached;
    const actionClass = action === "reconnect" ? "connection_reconnect" : "connection_revoke";
    const intent = `step-up:${actionClass}`;
    const response = await mutationFetch(mutations, intent, "/api/v1/security/step-up/verify", {
      method: "POST",
      body: JSON.stringify({ actionClass }),
    });
    const body = await response.json() as ResponseBody;
    if (!response.ok || !body.grantId) {
      mutations.reset(intent);
      throw new Error(body.error ?? "Complete MFA before this protected action.");
    }
    grants.current[action] = body.grantId;
    return body.grantId;
  };
  const protectedAction = async (action: ProtectedAction) => {
    if (action !== "reconnect" && !window.confirm(action === "revoke" ? "Revoke this connection and destroy its managed provider secret where supported?" : "Archive this connection from the active workspace?")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const grantId = await issueGrant(action);
      const endpoint = action === "reconnect" ? `/api/v1/connections/${connectionId}/reconnect` : `/api/v1/connections/${connectionId}/${action}`;
      const intent = `connection-${action}:${connectionId}`;
      const response = await mutationFetch(mutations, intent, endpoint, { method: "POST", body: JSON.stringify({ grantId }) });
      const body = await response.json() as ResponseBody;
      if (body.error === "IDEMPOTENCY_ALREADY_COMPLETED" || body.error === "IDEMPOTENCY_RECONCILIATION_REQUIRED") {
        mutations.reset(intent);
        delete grants.current[action];
        setMessage("The previous request needs reconciliation. Refresh this page before you act again.");
        return;
      }
      if (!response.ok) {
        if (body.error !== "IDEMPOTENCY_IN_PROGRESS") {
          mutations.reset(intent);
          delete grants.current[action];
        }
        throw new Error(body.error ?? `${action} failed.`);
      }
      delete grants.current[action];
      if (action === "reconnect" && body.authorizationUrl) window.location.assign(body.authorizationUrl);
      else setMessage(`${action[0]?.toUpperCase() ?? ""}${action.slice(1)} requested. Refresh to see the normalized status.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `${action} failed.`);
    } finally {
      setBusy(false);
    }
  };
  return <div className="connection-actions"><div className="resource-list"><h3>Selected resources</h3>{resources.length ? resources.map((resource) => <label className="resource-row" key={resource.id}><input type="checkbox" checked={selected.includes(resource.id)} disabled={resource.eligibility !== "eligible" || busy} onChange={() => toggle(resource.id)} /><span><strong>{resource.displayName}</strong><small>{resource.eligibility} · external ID hidden from general support exports</small></span></label>) : <p>Resources will appear after provider discovery.</p>}</div><div className="connection-action-buttons"><button className="secondary-button" type="button" onClick={() => void saveResources()} disabled={busy || !resources.length}>Save selection</button><button className="primary-button" type="button" onClick={() => void verify()} disabled={busy || !["verifying", "discovering", "degraded", "active_read_only"].includes(status)}>Verify read-only access</button></div>{status !== "archived" && <div className="connection-lifecycle"><p>Reconnect, revoke, and archive create a fresh action-bound grant when you choose the action. Your session must have current MFA.</p><div className="connection-action-buttons"><button className="secondary-button" type="button" onClick={() => void protectedAction("reconnect")} disabled={busy}>Reconnect</button><button className="secondary-button" type="button" onClick={() => void protectedAction("revoke")} disabled={busy}>Revoke access</button><button className="text-button" type="button" onClick={() => void protectedAction("archive")} disabled={busy}>Archive</button></div><p className="manual-action-help"><a href="/security/mfa">Open security setup</a> if MFA is required.</p></div>}{error && <p className="auth-message error" role="alert">{error}</p>}{message && <p className="auth-message notice" role="status">{message}</p>}</div>;
}
