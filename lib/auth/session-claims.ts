import { z } from "zod";

const claimsSchema = z.object({
  sub: z.string().min(1),
  session_id: z.string().min(1),
  aal: z.enum(["aal1", "aal2"]),
}).passthrough();

export type SessionClaims = z.infer<typeof claimsSchema>;

export function parseVerifiedSessionClaims(input: unknown): SessionClaims | null {
  const result = claimsSchema.safeParse(input);
  return result.success ? result.data : null;
}
