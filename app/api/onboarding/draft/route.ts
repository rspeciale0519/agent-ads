import { Prisma } from "@prisma/client";
import { z } from "zod";
import { enforceRateLimit } from "../../../../lib/api/rate-limit";
import { errorResponse, noStoreJson, requireSameOrigin } from "../../../../lib/api/http";
import { getAuthenticatedUser, withApplicantContext } from "../../../../lib/auth/organization-context";
import { formatOnboardingValidationIssues, onboardingDraftSchema } from "../../../../lib/onboarding-schema";
import { getStorageBucket } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const draftQuerySchema = z.object({ submissionId: z.string().uuid() });
const savedRowSchema = z.array(z.object({ id: z.string().uuid() })).max(1);

export async function GET(request: Request) {
  try {
    const authenticated = await getAuthenticatedUser();
    if (!authenticated) return noStoreJson({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    const parsedQuery = draftQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsedQuery.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    await enforceRateLimit(`onboarding-draft-read:${authenticated.supabaseUser.id}`, 120, 60 * 60_000);
    const row = await withApplicantContext(authenticated.supabaseUser.id, (tx) => tx.onboardingSubmission.findUnique({
      where: { id: parsedQuery.data.submissionId },
      select: { id: true, applicantId: true, payload: true, notificationStatus: true },
    }));
    if (!row || row.applicantId !== authenticated.supabaseUser.id || row.notificationStatus === "sent") {
      return noStoreJson({ draft: null });
    }
    const parsedDraft = onboardingDraftSchema.safeParse(draftCandidate(row.id, row.payload));
    if (!parsedDraft.success) return noStoreJson({ error: "DRAFT_REQUIRES_SECURE_REVIEW" }, { status: 409 });
    return noStoreJson({ draft: parsedDraft.data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = onboardingDraftSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return noStoreJson({ error: "DRAFT_VALIDATION_FAILED", validationIssues: formatOnboardingValidationIssues(parsed.error) }, { status: 400 });
    const authenticated = await getAuthenticatedUser();
    if (!authenticated) return noStoreJson({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
    await enforceRateLimit(`onboarding-draft-write:${authenticated.supabaseUser.id}`, 60, 60 * 60_000);
    const input = parsed.data;
    const payload = { ...input.form, attachments: input.attachments } as Prisma.InputJsonValue;
    const rows = await withApplicantContext(authenticated.supabaseUser.id, (tx) => tx.$queryRaw<unknown>`
      INSERT INTO public.onboarding_submissions (
        id, business_name, payload, attachment_count, storage_bucket,
        notification_status, notification_error, notification_sent_at, submitted_at, applicant_id
      ) VALUES (
        ${input.submissionId}::uuid, ${input.form.businessName ?? ""}, ${JSON.stringify(payload)}::jsonb,
        ${input.attachments.length}, ${getStorageBucket()}, 'pending', NULL, NULL,
        statement_timestamp(), ${authenticated.supabaseUser.id}::uuid
      )
      ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        payload = EXCLUDED.payload,
        attachment_count = EXCLUDED.attachment_count,
        storage_bucket = EXCLUDED.storage_bucket,
        notification_status = 'pending',
        notification_error = NULL,
        notification_sent_at = NULL,
        submitted_at = statement_timestamp(),
        applicant_id = EXCLUDED.applicant_id
      WHERE onboarding_submissions.applicant_id = EXCLUDED.applicant_id
        AND onboarding_submissions.notification_status <> 'sent'
      RETURNING id
    `);
    const saved = savedRowSchema.safeParse(rows);
    if (!saved.success || saved.data.length !== 1) return noStoreJson({ error: "DRAFT_NOT_WRITABLE" }, { status: 409 });
    return noStoreJson({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

function draftCandidate(submissionId: string, payload: Prisma.JsonValue) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const form = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "attachments" && key !== "applicantEmail"));
  return { submissionId, form, attachments: Array.isArray(record.attachments) ? record.attachments : [] };
}
