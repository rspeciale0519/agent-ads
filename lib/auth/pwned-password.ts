// Checks a password against the free "Have I Been Pwned" list of passwords
// seen in data breaches (https://haveibeenpwned.com/Passwords). Supabase only
// offers this check on paid plans, so the app does it before sign-up and
// password resets.
//
// Privacy (k-anonymity): the password never leaves the browser. It is turned
// into a SHA-1 fingerprint, and only the first 5 characters of that
// fingerprint are sent. The service returns every leaked fingerprint that
// starts with those 5 characters, and the match is checked here.

export const PWNED_PASSWORDS_ORIGIN = "https://api.pwnedpasswords.com";

// Returns how many times the password appears in known breaches (0 = not
// found), or null when the check could not run (offline, slow, or the service
// is down). Callers treat null as "allow", so an outage never blocks sign-up.
export async function pwnedPasswordCount(password: string, fetcher: typeof fetch = fetch, timeoutMs = 4000): Promise<number | null> {
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const response = await fetcher(`${PWNED_PASSWORDS_ORIGIN}/range/${prefix}`, {
      // Padding hides how many matches came back, so the reply size reveals nothing.
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    // Each line looks like "SUFFIX:COUNT"; padding lines have a count of 0.
    for (const line of (await response.text()).split("\n")) {
      const [candidate, count] = line.trim().split(":");
      if (candidate?.toUpperCase() === suffix) return Number.parseInt(count ?? "0", 10) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

// The message shown when a password is found in a breach, or null if it's fine.
export async function leakedPasswordMessage(password: string, fetcher: typeof fetch = fetch) {
  const count = await pwnedPasswordCount(password, fetcher);
  return count && count > 0
    ? "This password has appeared in a known data breach, so attackers may try it. Please choose a different one."
    : null;
}

// SHA-1 fingerprint in uppercase hex, the format the service uses.
async function sha1Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}
