"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../../lib/supabase-browser";
import { Icon } from "../../onboarding/ui";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords must match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowser();
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw new Error("We could not update your password. Request a new reset link and try again.");
      await supabase.auth.signOut();
      router.replace("/auth?mode=login&reset=success");
      router.refresh();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "We could not update your password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-shell">
    <section className="auth-card" aria-labelledby="reset-title">
      <div className="auth-brand"><span className="brand-orb"><Icon name="spark" size={18} /></span><span>MioDio<span className="brand-dot">.</span></span></div>
      <span className="eyebrow">Secure password reset</span>
      <h1 id="reset-title">Choose a new password.</h1>
      <p className="auth-intro">Use at least 8 characters. Your new password replaces the old one immediately.</p>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="reset-password">New password</label>
        <input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
        <label htmlFor="reset-confirmation">Confirm new password</label>
        <input id="reset-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required />
        {error && <p className="auth-message error" role="alert">{error}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Updating password…" : "Update password"}<Icon name="arrow" size={16} /></button>
      </form>
      <p className="auth-switch"><a href="/auth?mode=login">Return to login</a></p>
    </section>
  </main>;
}
