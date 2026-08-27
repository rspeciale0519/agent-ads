import type { Prisma } from "@prisma/client";
import { getSupabaseServer } from "../../lib/supabase-server";
import { cookies } from "next/headers";
import { prisma } from "../db/client";
import { normalizeRole, permissionsForRole, type OrganizationRole } from "./permissions";
import { parseVerifiedSessionClaims } from "./session-claims";

export type OrganizationContext = {
  organizationId: string;
  organizationName: string;
  userId: string;
  authSubject: string;
  email: string;
  role: OrganizationRole;
  permissions: string[];
  sessionId: string;
  assurance: "aal1" | "aal2";
};

export type TenantTransaction = Prisma.TransactionClient;

export async function getAuthenticatedUser() {
  const supabase = await getSupabaseServer();
  const [{ data: userResult }, { data: claimsResult, error: claimsError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ]);
  const claims = parseVerifiedSessionClaims(claimsResult?.claims);
  if (!userResult.user || claimsError || !claims || claims.sub !== userResult.user.id) return null;
  const appUser = await withApplicantContext(userResult.user.id, (tx) => tx.appUser.upsert({
    where: { authSubject: userResult.user.id },
    update: { email: userResult.user.email ?? null },
    create: { authSubject: userResult.user.id, email: userResult.user.email ?? null },
  }));
  return {
    supabaseUser: userResult.user,
    appUser,
    sessionId: claims.session_id,
    assurance: claims.aal,
    claims,
  };
}

export async function requireOrganizationContext(requestedOrganizationId?: string): Promise<OrganizationContext> {
  const authenticated = await getAuthenticatedUser();
  if (!authenticated) throw new OrganizationAccessError("AUTHENTICATION_REQUIRED");
  const memberships = await queryOrganizationChoices(authenticated.supabaseUser.id);
  const selectedOrganizationId = requestedOrganizationId ?? (await cookies()).get("miodio_organization")?.value;
  const membership = selectedOrganizationId
    ? memberships.find((candidate) => candidate.id === selectedOrganizationId)
    : memberships.length === 1 ? memberships[0] : undefined;
  if (!membership) {
    throw new OrganizationAccessError(memberships.length > 1 ? "ORGANIZATION_SELECTION_REQUIRED" : "ORGANIZATION_ACCESS_PENDING");
  }
  const provisionalContext: OrganizationContext = {
    organizationId: membership.id,
    organizationName: membership.name,
    userId: authenticated.appUser.id,
    authSubject: authenticated.supabaseUser.id,
    email: authenticated.supabaseUser.email ?? "",
    role: normalizeRole(membership.role),
    permissions: permissionsForRole(normalizeRole(membership.role)),
    sessionId: authenticated.sessionId,
    assurance: authenticated.assurance,
  };
  const verifiedMembership = await withTenantContext(provisionalContext, (tx) => tx.membership.findFirst({
    where: { organizationId: membership.id, userId: authenticated.appUser.id, status: "active" },
    include: { organization: true },
  }));
  if (!verifiedMembership || verifiedMembership.organization.status !== "active") {
    throw new OrganizationAccessError("ORGANIZATION_ACCESS_PENDING");
  }
  const role = normalizeRole(verifiedMembership.role);
  return {
    ...provisionalContext,
    organizationName: verifiedMembership.organization.name,
    role,
    permissions: verifiedMembership.permissions.length > 0 ? verifiedMembership.permissions : permissionsForRole(role),
  };
}

export async function listOrganizationChoices() {
  const authenticated = await getAuthenticatedUser();
  if (!authenticated) throw new OrganizationAccessError("AUTHENTICATION_REQUIRED");
  return queryOrganizationChoices(authenticated.supabaseUser.id);
}

function queryOrganizationChoices(authSubject: string) {
  return withApplicantContext(authSubject, (tx) => tx.$queryRaw<Array<{ id: string; name: string; role: string }>>`SELECT id, name, role FROM private.list_user_organizations(${authSubject}::uuid)`);
}

export async function withTenantContext<T>(context: OrganizationContext, callback: (tx: TenantTransaction) => Promise<T>) {
  return withTenantTransaction(context, callback, "share");
}

export async function withTenantExclusiveContext<T>(context: OrganizationContext, callback: (tx: TenantTransaction) => Promise<T>) {
  return withTenantTransaction(context, callback, "update");
}

export async function withTenantFinalizationContext<T>(context: OrganizationContext, callback: (tx: TenantTransaction) => Promise<T>) {
  return withTenantTransaction(context, callback, "none");
}

async function withTenantTransaction<T>(context: OrganizationContext, callback: (tx: TenantTransaction) => Promise<T>, organizationLock: "share" | "update" | "none") {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_organization_id', ${context.organizationId}, true)`;
    await tx.$executeRaw`select set_config('app.current_actor_id', ${context.userId}, true)`;
    await tx.$executeRaw`select set_config('app.current_auth_subject', ${context.authSubject}, true)`;
    if (organizationLock !== "none") {
      const organizations = organizationLock === "update"
        ? await tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM public.organizations WHERE id = ${context.organizationId}::uuid FOR UPDATE`
        : await tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM public.organizations WHERE id = ${context.organizationId}::uuid FOR SHARE`;
      if (organizations[0]?.status !== "active") throw new OrganizationAccessError("ORGANIZATION_ACCESS_PENDING");
    }
    return callback(tx);
  }, { maxWait: 5_000, timeout: 10_000 });
}

export async function withApplicantContext<T>(authSubject: string, callback: (tx: TenantTransaction) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_auth_subject', ${authSubject}, true)`;
    return callback(tx);
  }, { maxWait: 5_000, timeout: 10_000 });
}

export class OrganizationAccessError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "OrganizationAccessError";
    this.code = code;
  }
}

export function isOrganizationAccessError(error: unknown): error is OrganizationAccessError {
  return error instanceof OrganizationAccessError;
}
