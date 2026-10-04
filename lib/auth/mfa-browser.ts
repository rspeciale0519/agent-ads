"use client";

import { getSupabaseBrowser } from "../supabase-browser";

export const TOTP_CODE_PATTERN = /^\d{6}$/;

/**
 * Raise the current browser session to AAL2 with an already-verified authenticator.
 * Sign-in only reaches AAL1, so every new session needs this before protected actions.
 * Returns false when the account has no verified authenticator to use.
 */
export async function verifySessionWithExistingTotp(code: string): Promise<boolean> {
  if (!TOTP_CODE_PATTERN.test(code)) throw new Error("Enter the six-digit authenticator code.");
  const supabase = getSupabaseBrowser();
  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  const factor = factors.data.totp[0];
  if (!factor) return false;
  const verified = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (verified.error) throw verified.error;
  // The verified session lands in the auth cookies, which the server reads for its AAL2 checks.
  await supabase.auth.refreshSession();
  return true;
}

/** True when the account has a verified authenticator but this session has not used it yet. */
export async function sessionNeedsTotpVerification(): Promise<boolean> {
  const level = await getSupabaseBrowser().auth.mfa.getAuthenticatorAssuranceLevel();
  if (level.error) throw level.error;
  return level.data.currentLevel === "aal1" && level.data.nextLevel === "aal2";
}
