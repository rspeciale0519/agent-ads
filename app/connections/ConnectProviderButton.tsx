"use client";

import { useRef, useState } from "react";
import { mutationFetch, useMutationIdentityStore } from "../../lib/api/client-mutation";

type ResponseBody = { error?: string; grantId?: string; authorizationUrl?: string };

/**
 * One-click provider sign-in for a saved request. Steps: (1) ask the server for a short-lived
 * MFA-backed grant, (2) start the OAuth flow with it, (3) send the browser to the provider's consent page.
 * No provider secret ever reaches the browser; the server keeps PKCE and state.
 */
export default function ConnectProviderButton({ provider, requestId, label }: { provider: string; requestId: string; label: string }) {
  const mutations = useMutationIdentityStore();
  const grant = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async () => {
    setBusy(true); setError("");
    try {
      if (!grant.current) {
        const intent = "step-up:connection_authorize";
        const response = await mutationFetch(mutations, intent, "/api/v1/security/step-up/verify", { method: "POST", body: JSON.stringify({ actionClass: "connection_authorize" }) });
        const body = await response.json() as ResponseBody;
        if (!response.ok || !body.grantId) { mutations.reset(intent); throw new Error(body.error ?? "Complete MFA before connecting."); }
        grant.current = body.grantId;
      }
      const intent = `connection-authorize:${requestId}`;
      const response = await mutationFetch(mutations, intent, `/api/v1/connections/${provider}/authorize`, { method: "POST", body: JSON.stringify({ requestId, grantId: grant.current, returnPath: "/connections" }) });
      const body = await response.json() as ResponseBody;
      grant.current = null; // A grant is single-use, so always fetch a fresh one next time.
      if (!response.ok || !body.authorizationUrl) { mutations.reset(intent); throw new Error(body.error ?? "Could not start the sign-in."); }
      window.location.assign(body.authorizationUrl);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Could not start the sign-in.");
      setBusy(false);
    }
  };

  return <div className="connect-provider">
    <button className="primary-button" type="button" onClick={() => void connect()} disabled={busy}>{busy ? "Opening…" : `Connect ${label} →`}</button>
    {error && <p className="auth-message error" role="alert">{error}</p>}
  </div>;
}
