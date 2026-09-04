import { describe, expect, it } from "vitest";
import { buildAuthCallbackUrl, RECOVERY_CALLBACK_NEXT, safeAuthCallbackNext, SIGNUP_CALLBACK_NEXT } from "./redirects";

describe("auth callback redirects", () => {
  it("builds an encoded same-origin callback URL", () => {
    expect(buildAuthCallbackUrl("https://example.test", SIGNUP_CALLBACK_NEXT)).toBe("https://example.test/auth/callback?next=%2Fauth%3Fmode%3Dlogin%26verified%3D1");
    expect(buildAuthCallbackUrl("https://example.test", RECOVERY_CALLBACK_NEXT)).toBe("https://example.test/auth/callback?next=%2Fauth%2Freset");
  });

  it("allows only approved local destinations", () => {
    expect(safeAuthCallbackNext(SIGNUP_CALLBACK_NEXT)).toBe(SIGNUP_CALLBACK_NEXT);
    expect(safeAuthCallbackNext(RECOVERY_CALLBACK_NEXT)).toBe(RECOVERY_CALLBACK_NEXT);
    expect(safeAuthCallbackNext("https://attacker.test")).toBe("/dashboard");
    expect(safeAuthCallbackNext("/auth?mode=login&next=https://attacker.test")).toBe("/dashboard");
  });
});
