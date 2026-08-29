"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowser } from "../../../lib/supabase-browser";

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string };

export default function MfaPanel() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadFactors = async () => {
    const result = await getSupabaseBrowser().auth.mfa.listFactors();
    if (!result.error) setFactors((result.data.all ?? []) as Factor[]);
  };

  useEffect(() => { void loadFactors(); }, []);

  const enroll = async () => {
    setError(""); setMessage(""); setBusy(true);
    try {
      const result = await getSupabaseBrowser().auth.mfa.enroll({ factorType: "totp", friendlyName: "MioDio authenticator" });
      if (result.error || !result.data?.id || !result.data.totp?.qr_code) throw result.error ?? new Error("MFA enrollment could not start.");
      setFactorId(result.data.id); setQrCode(result.data.totp.qr_code); setMessage("Scan this one-time QR code with your authenticator, then enter the six-digit code.");
    } catch (enrollError) { setError(enrollError instanceof Error ? enrollError.message : "MFA enrollment could not start."); } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!factorId || !/^\d{6}$/.test(code)) { setError("Enter the six-digit authenticator code."); return; }
    setError(""); setMessage(""); setBusy(true);
    try {
      const supabase = getSupabaseBrowser();
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error || !challenge.data?.id) throw challenge.error ?? new Error("MFA challenge could not start.");
      const verified = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
      if (verified.error) throw verified.error;
      await supabase.auth.refreshSession();
      setCode(""); setQrCode(""); setMessage("MFA is enrolled and this session is at AAL2."); await loadFactors();
    } catch (verifyError) { setError(verifyError instanceof Error ? verifyError.message : "MFA verification failed."); } finally { setBusy(false); }
  };

  const unenroll = async (id: string) => {
    setError(""); setBusy(true);
    try { const result = await getSupabaseBrowser().auth.mfa.unenroll({ factorId: id }); if (result.error) throw result.error; await loadFactors(); setMessage("MFA factor removed. Add another factor before sensitive connection actions."); } catch (unenrollError) { setError(unenrollError instanceof Error ? unenrollError.message : "MFA factor could not be removed."); } finally { setBusy(false); }
  };

  return <div className="mfa-panel"><div className="mfa-factors"><h2>Enrolled factors</h2>{factors.length ? factors.map((factor) => <div className="mfa-factor" key={factor.id}><span><strong>{factor.friendly_name ?? "Authenticator"}</strong><small>{factor.factor_type} · {factor.status}</small></span><button className="text-button" type="button" onClick={() => void unenroll(factor.id)} disabled={busy}>Remove</button></div>) : <p>No MFA factor is enrolled yet.</p>}</div><button className="primary-button" type="button" onClick={() => void enroll()} disabled={busy}>Enroll authenticator</button>{qrCode && <div className="mfa-enroll"><Image src={qrCode} alt="One-time authenticator QR code" width={190} height={190} unoptimized /><label htmlFor="mfa-code">Authenticator code</label><input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /><button className="primary-button" type="button" onClick={() => void verify()} disabled={busy}>Verify MFA</button></div>}<div className="step-up-panel"><h2>Protected actions</h2><p>After AAL2 verification, each protected page creates and consumes a short-lived action-bound grant. The grant never enters browser storage.</p></div>{error && <p className="auth-message error" role="alert">{error}</p>}{message && <p className="auth-message notice" role="status">{message}</p>}</div>;
}
