"use client";

import { useRef, useState } from "react";
import { mutationFetch, useMutationIdentityStore } from "../../lib/api/client-mutation";
import { sessionNeedsTotpVerification, verifySessionWithExistingTotp } from "../../lib/auth/mfa-browser";

type ResponseBody = { error?: string; grantId?: string; authorizationUrl?: string };

/**
 * One-click provider sign-in for a saved request. Steps: (1) if this session has not used the
 * authenticator yet, ask for the six-digit code inline, (2) get a short-lived MFA-backed grant,
 * (3) start the OAuth flow with it, (4) send the browser to the provider's consent page.
 * No provider secret ever reaches the browser; the server keeps PKCE and state.
 */
export default function ConnectProviderButton({ provider, requestId, label }: { provider: string; requestId: string; label: string }) {
  const mutations = useMutationIdentityStore();
  const grant = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [needsEnrollment, setNeedsEnrollment] = useState(false);
  const [code, setCode] = useState("");

  const startAuthorization = async () => {
    if (!grant.current) {
      const intent = "step-up:connection_authorize";
      const response = await mutationFetch(mutations, intent, "/api/v1/security/step-up/verify", { method: "POST", body: JSON.stringify({ actionClass: "connection_authorize" }) });
      const body = await response.json() as ResponseBody;
      if (!response.ok || !body.grantId) {
        mutations.reset(intent);
        // The server is the authority on assurance; fall back to the code prompt if it disagrees with the browser.
        if (body.error === "AAL2_REQUIRED") {
          if (await sessionNeedsTotpVerification()) setNeedsCode(true); else setNeedsEnrollment(true);
          return;
        }
        throw new Error(body.error ?? "Complete MFA before connecting.");
      }
      grant.current = body.grantId;
    }
    const intent = `connection-authorize:${requestId}`;
    const response = await mutationFetch(mutations, intent, `/api/v1/connections/${provider}/authorize`, { method: "POST", body: JSON.stringify({ requestId, grantId: grant.current, returnPath: "/connections" }) });
    const body = await response.json() as ResponseBody;
    grant.current = null; // A grant is single-use, so always fetch a fresh one next time.
    if (!response.ok || !body.authorizationUrl) { mutations.reset(intent); throw new Error(body.error ?? "Could not start the sign-in."); }
    window.location.assign(body.authorizationUrl);
    return true;
  };

  const run = async (step: () => Promise<boolean | void>) => {
    setBusy(true); setError("");
    try {
      // Keep the button busy while the browser leaves for the provider.
      if (await step()) return;
    } catch (stepError) {
      setError(stepError instanceof Error ? stepError.message : "Could not start the sign-in.");
    }
    setBusy(false);
  };

  const connect = () => run(async () => {
    if (await sessionNeedsTotpVerification()) { setNeedsCode(true); return; }
    return startAuthorization();
  });

  const verifyAndConnect = () => run(async () => {
    if (!(await verifySessionWithExistingTotp(code))) { setNeedsCode(false); setNeedsEnrollment(true); return; }
    setCode(""); setNeedsCode(false);
    return startAuthorization();
  });

  const codeId = `connect-code-${requestId}`;
  return <div className="connect-provider">
    {!needsCode && <button className="primary-button" type="button" onClick={() => void connect()} disabled={busy}>{busy ? "Opening…" : `Connect ${label} →`}</button>}
    {needsCode && <form className="connect-provider-code" onSubmit={(event) => { event.preventDefault(); void verifyAndConnect(); }}>
      <label htmlFor={codeId}>Enter the six-digit code from your MioDio authenticator to continue</label>
      <input id={codeId} inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={busy} />
      <button className="primary-button" type="submit" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : `Verify and connect ${label} →`}</button>
    </form>}
    {needsEnrollment && <p className="auth-message error" role="alert">Set up an authenticator first. <a href="/security/mfa">Open security setup</a>, then return here.</p>}
    {error && <p className="auth-message error" role="alert">{error}</p>}
  </div>;
}
