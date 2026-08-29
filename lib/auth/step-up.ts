import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { withTenantContext, type OrganizationContext } from "./organization-context";
import { getAssuranceStatus, requireAal2 } from "./assurance";

const STEP_UP_TTL_MS = 10 * 60 * 1000;
export const stepUpGrantInputSchema = z.object({ grantId: z.string().uuid() });

export async function issueStepUpGrant(context: OrganizationContext, actionClass: string) {
  if (!context.sessionId) throw new StepUpError("ACTIVE_SESSION_REQUIRED");
  const now = new Date();
  const grantId = randomUUID();
  await withTenantContext(context, (tx) => tx.stepUpGrant.create({
    data: {
      id: grantId,
      organizationId: context.organizationId,
      userId: context.userId,
      sessionId: context.sessionId,
      actionClass: hashAction(actionClass),
      issuedAt: now,
      expiresAt: new Date(now.getTime() + STEP_UP_TTL_MS),
    },
  }));
  return { grantId, expiresAt: new Date(now.getTime() + STEP_UP_TTL_MS) };
}

export async function consumeStepUpGrant(context: OrganizationContext, grantId: string, actionClass: string) {
  requireAal2(await getAssuranceStatus(context));
  const now = new Date();
  return withTenantContext(context, async (tx) => {
    const grant = await tx.stepUpGrant.findFirst({
      where: {
        id: grantId,
        organizationId: context.organizationId,
        userId: context.userId,
        sessionId: context.sessionId,
        actionClass: hashAction(actionClass),
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });
    if (!grant) throw new StepUpError("STEP_UP_REQUIRED");
    const consumed = await tx.stepUpGrant.updateMany({
      where: { id: grant.id, consumedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw new StepUpError("STEP_UP_REPLAYED");
    return grant;
  });
}

export async function revokeSessionStepUps(context: OrganizationContext) {
  if (!context.sessionId) return;
  await withTenantContext(context, (tx) => tx.stepUpGrant.updateMany({ where: { sessionId: context.sessionId, revokedAt: null }, data: { revokedAt: new Date() } }));
}

function hashAction(actionClass: string) {
  return createHash("sha256").update(actionClass, "utf8").digest("hex");
}

export class StepUpError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "StepUpError";
    this.code = code;
  }
}
