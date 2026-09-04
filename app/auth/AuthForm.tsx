"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { buildAuthCallbackUrl, RECOVERY_CALLBACK_NEXT, SIGNUP_CALLBACK_NEXT } from "../../lib/auth/redirects";
import { Icon } from "../onboarding/ui";

type Mode = "login" | "signup" | "forgot";
type Props = { initialMode?: Exclude<Mode, "forgot">; initialNotice?: string; initialError?: string };

export default function AuthForm({ initialMode = "signup", initialNotice = "", initialError = "" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState(initialNotice);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (mode !== "forgot" && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowser();
      if (mode === "forgot") {
        const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: buildAuthCallbackUrl(window.location.origin, RECOVERY_CALLBACK_NEXT) });
        if (result.error) throw new Error("We could not send a reset email. Try again later.");
        setNotice("If that email has an account, reset instructions are on the way. Check your inbox.");
        return;
      }
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: buildAuthCallbackUrl(window.location.origin, SIGNUP_CALLBACK_NEXT) } })
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
      <h1 id="auth-title">{mode === "signup" ? "Create your private onboarding account." : mode === "forgot" ? "Reset your password." : "Welcome back to your onboarding."}</h1>
      <p className="auth-intro">{mode === "forgot" ? "Enter your email address and we will send a secure password reset link." : "Your account keeps your marketing answers and business files connected to you while we prepare your AI agent-driven marketing system."}</p>
      <div className="auth-security"><Icon name="lock" size={17} /><span><strong>Private by design.</strong> Email confirmation and protected sessions help keep your submission limited to you and the MioDio team.</span></div>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        {mode !== "forgot" && <><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required /></>}
        {mode === "login" && <button className="auth-forgot" type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Forgot your password?</button>}
        {error && <p className="auth-message error" role="alert">{error}</p>}
        {notice && <p className="auth-message notice" role="status">{notice}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Working…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in"}<Icon name="arrow" size={16} /></button>
      </form>
      <p className="auth-switch">{mode === "signup" ? "Already have an account?" : mode === "forgot" ? "Remember your password?" : "New to MioDio onboarding?"} <button type="button" onClick={() => { setMode(mode === "signup" || mode === "forgot" ? "login" : "signup"); setError(""); setNotice(""); }}>{mode === "signup" || mode === "forgot" ? "Log in" : "Create an account"}</button></p>
    </section>
  </main>;
}
