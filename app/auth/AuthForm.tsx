"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { Icon } from "../onboarding/ui";

type Mode = "login" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowser();
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setNotice("Check your email to confirm your account, then return here to sign in.");
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "We could not complete that request.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-shell">
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-brand"><span className="brand-orb"><Icon name="spark" size={18} /></span><span>MioDio<span className="brand-dot">.</span></span></div>
      <span className="eyebrow">Secure marketing workspace</span>
      <h1 id="auth-title">{mode === "signup" ? "Create your private onboarding account." : "Welcome back to your onboarding."}</h1>
      <p className="auth-intro">Your account keeps your marketing answers and business files connected to you while we prepare your AI agent-driven marketing system.</p>
      <div className="auth-security"><Icon name="lock" size={17} /><span><strong>Private by design.</strong> Email confirmation and protected sessions help keep your submission limited to you and the MioDio team.</span></div>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required />
        {error && <p className="auth-message error" role="alert">{error}</p>}
        {notice && <p className="auth-message notice" role="status">{notice}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Securing your session…" : mode === "signup" ? "Create account" : "Log in"}<Icon name="arrow" size={16} /></button>
      </form>
      <p className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to MioDio onboarding?"} <button type="button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setNotice(""); }}>{mode === "signup" ? "Log in" : "Create an account"}</button></p>
    </section>
  </main>;
}
