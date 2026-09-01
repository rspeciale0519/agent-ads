export const SIGNUP_CALLBACK_NEXT = "/auth?mode=login&verified=1" as const;
export const RECOVERY_CALLBACK_NEXT = "/auth/reset" as const;

export type AuthCallbackNext =
  | typeof SIGNUP_CALLBACK_NEXT
  | typeof RECOVERY_CALLBACK_NEXT
  | "/dashboard"
  | "/onboarding"
  | "/connections";

export function buildAuthCallbackUrl(origin: string, next: AuthCallbackNext) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);
  return callback.toString();
}

export function safeAuthCallbackNext(value: string | null): AuthCallbackNext {
  if (value === SIGNUP_CALLBACK_NEXT || value === RECOVERY_CALLBACK_NEXT || value === "/onboarding" || value === "/connections") return value;
  return "/dashboard";
}
