import type { OnboardingSubmissionInput } from "./onboarding-schema";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function row(label: string, value: string) {
  if (!value) return "";
  return `<tr><td style="padding:8px 12px 8px 0;color:#64746b;font-size:12px;vertical-align:top;width:170px">${escapeHtml(label)}</td><td style="padding:8px 0;color:#19372e;font-size:13px;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`;
}

function section(title: string, rows: string) {
  return `<h2 style="margin:28px 0 8px;color:#19372e;font-size:16px">${escapeHtml(title)}</h2><table style="width:100%;border-collapse:collapse">${rows}</table>`;
}

export function buildOnboardingEmail(input: OnboardingSubmissionInput) {
  const { form, attachments } = input;
  const attachmentRows = attachments.length
    ? attachments.map((attachment) => `${escapeHtml(attachment.name)} (${Math.ceil(attachment.size / 1024)} KB · ${escapeHtml(attachment.type || "unknown type")})`).join("\n")
    : "No files uploaded";
  const html = `<!doctype html><html><body style="margin:0;background:#f5f8f4;font-family:Arial,sans-serif;color:#19372e"><div style="max-width:700px;margin:0 auto;padding:32px 18px"><div style="background:#19372e;color:#edf8f1;padding:24px 26px;border-radius:16px 16px 0 0"><div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b9dec2">MioDio marketing pilot</div><h1 style="margin:8px 0 0;font-size:25px">New onboarding submission</h1><p style="margin:8px 0 0;color:#d4ead9">${escapeHtml(form.businessName)}</p></div><div style="background:#fff;padding:10px 26px 28px;border-radius:0 0 16px 16px">${section("Business & offer", row("Business name", form.businessName) + row("Website", form.website) + row("Offer and audience", form.description) + row("Markets", form.locations) + row("Business model", form.businessModel))}${section("Goals & outcomes", row("Primary goal", form.primaryGoal) + row("Promotion and priority audience", form.goalDetails) + row("Monthly media budget", form.monthlyBudget) + row("Qualified outcome", form.qualifiedOutcome) + row("Sales cycle", form.salesCycle))}${section("Paid + organic channels", row("Paid media", form.paidChannels.join(", ")) + row("Organic content", form.organicChannels.join(", ")))}${section("Brand & creative", row("Brand voice", form.brandVoice) + row("Claims/topics to avoid", form.prohibitedTopics) + row("Existing assets", form.existingAssets))}${section("Measurement & team", row("CRM or lead system", form.crm) + row("Web analytics", form.analytics) + row("Revenue source", form.revenueSource) + row("Approvers", form.teamApprovers) + row("Current marketing notes", form.notes))}${section("Uploaded business files", row("Files", attachmentRows))}<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e1ebe3;color:#64746b;font-size:12px">Submission ID: ${escapeHtml(input.submissionId)}<br/>Files are stored in the private Supabase onboarding bucket. Review them before using them as agent context.</p></div></div></body></html>`;
  const text = [
    `New MioDio marketing onboarding: ${form.businessName}`,
    "",
    `Business: ${form.businessName}`,
    `Website: ${form.website}`,
    `Offer and audience: ${form.description}`,
    `Markets: ${form.locations}`,
    `Primary goal: ${form.primaryGoal}`,
    `Goal details: ${form.goalDetails}`,
    `Monthly budget: ${form.monthlyBudget}`,
    `Qualified outcome: ${form.qualifiedOutcome}`,
    `Sales cycle: ${form.salesCycle}`,
    `Paid media: ${form.paidChannels.join(", ")}`,
    `Organic content: ${form.organicChannels.join(", ")}`,
    `Brand voice: ${form.brandVoice}`,
    `Claims/topics to avoid: ${form.prohibitedTopics}`,
    `Existing assets: ${form.existingAssets}`,
    `CRM: ${form.crm}`,
    `Analytics: ${form.analytics}`,
    `Revenue source: ${form.revenueSource}`,
    `Approvers: ${form.teamApprovers}`,
    `Current marketing notes: ${form.notes}`,
    "",
    `Uploaded files: ${attachmentRows}`,
    `Submission ID: ${input.submissionId}`,
  ].join("\n");
  return { html, text };
}
