import { Prisma } from "@prisma/client";
import { Resend } from "resend";
import { z } from "zod";
import { buildOnboardingEmail } from "../../../../lib/onboarding-email";
import { formatOnboardingValidationIssues, onboardingSubmissionSchema } from "../../../../lib/onboarding-schema";
import { errorResponse, noStoreJson, requireSameOrigin } from "../../../../lib/api/http";
import { getStorageBucket } from "../../../../lib/supabase-admin";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { withApplicantContext } from "../../../../lib/auth/organization-context";
import { enforceRateLimit } from "../../../../lib/api/rate-limit";

export const runtime = "nodejs";
const pendingSubmissionRowSchema = z.array(z.object({ id: z.string().uuid() })).max(1);

export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch (error) { return errorResponse(error); }
  const body = await request.json().catch(() => null);
  const parsed = onboardingSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    const validationIssues = formatOnboardingValidationIssues(parsed.error);
    const count = validationIssues.length;
    const error = count > 0
      ? `${count} ${count === 1 ? "field needs" : "fields need"} your attention before sending.`
      : "Please check the form and finish all file uploads.";
    return noStoreJson({ error, validationIssues }, { status: 400 });
  }

  const authClient = await getSupabaseServer();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return noStoreJson({ error: "Sign in before sending your onboarding." }, { status: 401 });
  try { await enforceRateLimit(`onboarding-submit:${user.id}`, 10, 60 * 60_000); } catch (error) { return errorResponse(error); }

  const input = parsed.data;
  const expectedPrefix = `onboarding/${user.id}/${input.submissionId}/`;
  if (input.attachments.some((attachment) => !attachment.storagePath.startsWith(expectedPrefix))) {
    return noStoreJson({ error: "One or more uploaded files could not be verified." }, { status: 400 });
  }

  const notificationEmail = process.env.ONBOARDING_NOTIFICATION_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!notificationEmail || !fromEmail || !resendApiKey) {
    return noStoreJson({ error: "Submission delivery is not configured yet." }, { status: 503 });
  }

  try {
    const bucket = getStorageBucket();
    const payload = {
      ...input.form,
      attachments: input.attachments,
      applicantEmail: user.email || "",
    };
    let persisted: unknown;
    try {
      persisted = await withApplicantContext(user.id, (tx) => tx.$queryRaw<unknown>`
        INSERT INTO public.onboarding_submissions (
          id, business_name, payload, attachment_count, storage_bucket,
          notification_status, notification_error, notification_sent_at, submitted_at, applicant_id
        ) VALUES (
          ${input.submissionId}::uuid, ${input.form.businessName}, ${JSON.stringify(payload as Prisma.InputJsonValue)}::jsonb,
          ${input.attachments.length}, ${bucket}, 'pending', NULL, NULL,
          statement_timestamp(), ${user.id}::uuid
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
    } catch (storageError) {
      if (storageError instanceof Prisma.PrismaClientKnownRequestError && storageError.code === "P2021") return noStoreJson({ error: "Onboarding storage is not migrated yet." }, { status: 503 });
      throw storageError;
    }
    const pendingRows = pendingSubmissionRowSchema.safeParse(persisted);
    if (!pendingRows.success) return noStoreJson({ error: "ONBOARDING_STORE_INVALID" }, { status: 503 });
    if (pendingRows.data.length === 0) return noStoreJson({ ok: true, duplicate: true });

    const { html, text } = buildOnboardingEmail(input);
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: [notificationEmail],
      subject: `New MioDio marketing onboarding · ${input.form.businessName}`,
      html,
      text,
      headers: { "X-MioDio-Submission-ID": input.submissionId },
    }, { idempotencyKey: `onboarding-${input.submissionId}` });
    if (result.error) {
      await withApplicantContext(user.id, (tx) => tx.onboardingSubmission.update({ where: { id: input.submissionId }, data: { applicantId: user.id, notificationStatus: "failed", notificationError: result.error?.message ?? "Delivery failed" } }));
      return noStoreJson({ error: "The submission was saved, but the notification email could not be sent." }, { status: 502 });
    }

    try { await withApplicantContext(user.id, (tx) => tx.onboardingSubmission.update({ where: { id: input.submissionId }, data: { applicantId: user.id, notificationStatus: "sent", notificationSentAt: new Date() } })); } catch (updateError) { console.error("Submission saved but notification status could not be updated", updateError instanceof Error ? updateError.message : "unknown error"); }
    return noStoreJson({ ok: true });
  } catch (error) {
    console.error("Onboarding submission failed", error instanceof Error ? error.message : "unknown error");
    return noStoreJson({ error: "We could not save this submission. Please try again." }, { status: 500 });
  }
}
