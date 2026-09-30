"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

// A "Log out" button for page headers. Like the onboarding page's "Sign out",
// it ends the Supabase session in the browser (which clears the login
// cookies), then opens the login page with a "You're logged out" notice.
// Only this browser is logged out; other devices stay signed in.
// If logging out fails, the button says so and can be tried again.
export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const signOut = async () => {
    setBusy(true);
    setFailed(false);
    const { error } = await getSupabaseBrowser().auth.signOut({ scope: "local" }).catch((caught: unknown) => ({ error: caught }));
    if (error) {
      setBusy(false);
      setFailed(true);
      return;
    }
    window.location.assign("/auth?mode=login&signedout=1");
  };
  return <>
    {failed && <span className="auth-message error" role="alert">Couldn&apos;t log out. Try again.</span>}
    <button className="secondary-button" type="button" onClick={() => void signOut()} disabled={busy}>{busy ? "Logging out…" : "Log out"}</button>
  </>;
}
