"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

// A "Log out" button for page headers. Like the onboarding page's "Sign out",
// it ends the Supabase session in the browser (which clears the login
// cookies), then opens the login page with a "You're logged out" notice.
export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    await getSupabaseBrowser().auth.signOut();
    window.location.assign("/auth?mode=login&signedout=1");
  };
  return <button className="secondary-button" type="button" onClick={() => void signOut()} disabled={busy}>{busy ? "Logging out…" : "Log out"}</button>;
}
