import { getSupabaseServer } from "../../lib/supabase-server";
import { prisma } from "../db/client";
import { parseVerifiedSessionClaims } from "./session-claims";
import type { OrganizationContext } from "./organization-context";

export type AssuranceStatus = {
  authenticated: boolean;
  aal: "aal1" | "aal2";
  sessionId: string;
  mfaRequired: boolean;
  activeSessionValidated: boolean;
};

export async function getAssuranceStatus(context?: OrganizationContext): Promise<AssuranceStatus> {
  const supabase = await getSupabaseServer();
  const [{ data: userResult }, { data: claimsResult, error: claimsError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ]);
  const claims = parseVerifiedSessionClaims(claimsResult?.claims);
  const authenticated = Boolean(userResult.user && !claimsError && claims && claims.sub === userResult.user.id);
  const aal = claims?.aal ?? "aal1";
  const sessionId = authenticated && claims ? claims.session_id : "";
  const sessionMatchesUser = authenticated && sessionId.length > 0;
  let activeAuthSession = false;
  if (sessionMatchesUser) {
    try {
      const rows = await prisma.$queryRaw<Array<{ active: boolean }>>`SELECT private.is_active_auth_session(${userResult.user?.id ?? ""}, ${sessionId}) AS active`;
      activeAuthSession = rows[0]?.active === true;
    } catch {
      activeAuthSession = false;
    }
  }
  return {
    authenticated,
    aal,
    sessionId,
    mfaRequired: context ? (context.role === "owner" || context.role === "administrator") && aal !== "aal2" : false,
    activeSessionValidated: sessionMatchesUser && activeAuthSession,
  };
}

export function requireAal2(status: AssuranceStatus) {
  if (!status.authenticated) throw new AssuranceError("AUTHENTICATION_REQUIRED");
  if (status.aal !== "aal2") throw new AssuranceError("AAL2_REQUIRED");
  if (!status.activeSessionValidated) throw new AssuranceError("ACTIVE_SESSION_REQUIRED");
}

export class AssuranceError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "AssuranceError";
    this.code = code;
  }
}
