import { describe, expect, it } from "vitest";
import { manualInvitationInputSchema, manualVerificationSchema, verificationSourceAllowed } from "./manual-lifecycle";

describe("manual access lifecycle contracts", () => {
  it("accepts Dubsado approved-export metadata without secrets", () => {
    const parsed = manualInvitationInputSchema.parse({ provider: "dubsado", method: "approved_export", expectedPrincipal: "Client-owned Dubsado workspace", instructions: "Record the export source and date after the client confirms the approved CSV route." });
    expect(parsed.provider).toBe("dubsado");
  });

  it("rejects credential-shaped instructions", () => {
    const result = manualInvitationInputSchema.safeParse({ provider: "wordpress", method: "provider_invitation", expectedPrincipal: "Site admin", instructions: "password: do-not-store" });
    expect(result.success).toBe(false);
  });

  it("requires non-mutating evidence source and a non-future date", () => {
    expect(manualVerificationSchema.safeParse({ verificationSource: "email", sourceDate: new Date() }).success).toBe(false);
    expect(manualVerificationSchema.safeParse({ verificationSource: "provider_console", sourceDate: new Date(Date.now() + 60_000) }).success).toBe(false);
    expect(manualVerificationSchema.safeParse({ verificationSource: "provider_console", sourceDate: new Date(), evidenceNote: "Read-only access confirmed." }).success).toBe(false);
  });

  it("binds evidence source to the approved route", () => {
    expect(verificationSourceAllowed(null, "provider_console")).toBe(false);
    expect(verificationSourceAllowed("provider_invitation", "provider_console")).toBe(true);
    expect(verificationSourceAllowed("approved_export", "provider_console")).toBe(false);
    expect(verificationSourceAllowed("client_owned_integration", "client_owned_integration")).toBe(true);
    expect(verificationSourceAllowed("unknown", "operator_observation")).toBe(false);
  });
});
