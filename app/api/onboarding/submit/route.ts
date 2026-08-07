import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildOnboardingEmail } from "../../../../lib/onboarding-email";
import { onboardingSubmissionSchema } from "../../../../lib/onboarding-schema";
import { getStorageBucket, getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { getSupabaseServer } from "../../../../lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = onboardingSubmissionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please complete the required fields and finish all file uploads." }, { status: 400 });

  const authClient = await getSupabaseServer();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in before sending your onboarding." }, { status: 401 });

  const input = parsed.data;
  const expectedPrefix = `onboarding/${user.id}/${input.submissionId}/`;
  if (input.attachments.some((attachment) => !attachment.storagePath.startsWith(expectedPrefix))) {
    return NextResponse.json({ error: "One or more uploaded files could not be verified." }, { status: 400 });
  }

  const notificationEmail = process.env.ONBOARDING_NOTIFICATION_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!notificationEmail || !fromEmail || !resendApiKey) {
    return NextResponse.json({ error: "Submission delivery is not configured yet." }, { status: 503 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const bucket = getStorageBucket();
    const { data: existing, error: lookupError } = await supabase
      .from("onboarding_submissions")
      .select("id, applicant_id, notification_status")
      .eq("id", input.submissionId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.applicant_id && existing.applicant_id !== user.id) return NextResponse.json({ error: "This onboarding draft belongs to another account." }, { status: 409 });
    if (existing?.notification_status === "sent") return NextResponse.json({ ok: true, duplicate: true });

    const payload = {
      ...input.form,
      attachments: input.attachments,
      applicantEmail: user.email || "",
    };
    if (!existing) {
      const { error: insertError } = await supabase.from("onboarding_submissions").insert({
        id: input.submissionId,
        applicant_id: user.id,
        business_name: input.form.businessName,
        payload,
        attachment_count: input.attachments.length,
        storage_bucket: bucket,
        notification_status: "pending",
      });
      if (insertError && insertError.code !== "23505") throw insertError;
    }

    const { html, text } = buildOnboardingEmail(input);
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: [notificationEmail],
      subject: `New MioDio marketing onboarding · ${input.form.businessName}`,
      html,
      text,
      headers: { "X-MioDio-Submission-ID": input.submissionId },
    });
    if (result.error) {
      await supabase.from("onboarding_submissions").update({ applicant_id: user.id, notification_status: "failed", notification_error: result.error.message }).eq("id", input.submissionId);
      return NextResponse.json({ error: "The submission was saved, but the notification email could not be sent." }, { status: 502 });
    }

    const { error: updateError } = await supabase.from("onboarding_submissions").update({ applicant_id: user.id, notification_status: "sent", notification_sent_at: new Date().toISOString() }).eq("id", input.submissionId);
    if (updateError) console.error("Submission saved but notification status could not be updated", updateError);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Onboarding submission failed", error);
    return NextResponse.json({ error: "We could not save this submission. Please try again." }, { status: 500 });
  }
}
