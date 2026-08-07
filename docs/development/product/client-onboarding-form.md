# Client Onboarding Form Specification

## Purpose

Provide a friendly, branded, shareable intake experience that collects the pilot company's non-secret business context and prepares the inputs used to configure its AI agent-driven digital marketing system.

This is a client-facing form, not a credential-collection surface. Platform, CRM, analytics, and billing credentials are connected later through authorized sign-in or administrator-mediated connection workflows.

## Experience goals

- Feel warm, considered, and modern rather than like a procurement questionnaire.
- Take approximately 8–12 minutes for a first pass.
- Explain how an answer will shape the client's AI marketing agents without teaching agent infrastructure.
- Let a client answer in plain language and return later.
- Ask only relevant follow-ups.
- Make privacy boundaries obvious.
- Preserve human agency: the client can skip noncritical details, edit answers, and review before submission.

## Route and access model

### Initial link

- A staff member creates an onboarding request for an organization or prospective organization.
- The system issues a revocable, expiring, single-purpose invitation link.
- The link identifies the request, not an authenticated platform account.
- The recipient can create or verify a client identity to resume securely.

### Authentication

- First pass may use an email verification link or invited account.
- Resume requires verification of the same email or authenticated membership.
- A public anonymous draft must not contain sensitive client data or remain accessible through an unguessable URL alone.

### Staff view

Staff can see request status, last saved time, completion percentage, unanswered required fields, attachments, audit history, and submission state. Staff cannot silently edit client answers; corrections are separate attributed revisions.

## Six-step flow

1. **Your business** — name, website, plain-English description, locations, model.
2. **Goals and outcomes** — primary goal, goal details, budget range, qualified outcome, sales cycle.
3. **Your channels** — multi-select paid and organic channels.
4. **Brand and creative** — voice, guardrails, assets, claims, topics to avoid.
5. **Systems and team** — CRM, analytics, revenue source, approvers, context notes.
6. **Review and send** — section summaries, edit links, privacy reminder, submit.

## Question behavior

- Required questions are limited to business name, website, primary goal, qualified outcome, and at least one channel.
- All other questions are optional or can be answered with “Not sure yet.”
- Conditional questions may ask for a CRM-specific detail after the client selects a CRM.
- The form explains that estimates and ranges are welcome.
- Field-level validation is immediate but non-punitive.
- Validation messages explain the reason and the smallest next action.
- The client can use keyboard navigation and screen readers.

## Save and resume

- Save is explicit and also occurs safely after meaningful field changes once an authenticated draft exists.
- The client sees last-saved time and a clear saved state.
- A resume link or account dashboard returns to the exact step and scroll position where feasible.
- Draft versions preserve who changed what and when.
- A client may discard a draft through a recoverable archive flow; no hard deletion is performed by the UI.

## Attachments

Supported initial materials: brand guide, logo, product/service sheet, approved claims, case studies, testimonials, creative library, analytics export, and spreadsheet exports such as keyword lists, search terms, campaign structure, and performance data (`.xls`, `.xlsx`, `.csv`, and `.tsv`).

Controls:

- File type, size, malware, and content scanning.
- The pilot form accepts up to eight files at 10 MB each; production storage remains private and server-authorized.
- Organization-scoped object storage and short-lived download links.
- File title, source, rights/permission status, and optional expiration.
- No automatic publication or use in advertising solely because a file was uploaded.
- Attachments enter an untrusted-content review pipeline before agent use.

## Privacy and security copy

The form must state:

- Platform passwords and API keys are never requested here.
- Connections happen later through authorized sign-in links.
- Answers are used to prepare the business profile and marketing workspace.
- Who can access the submission.
- How long drafts and attachments are retained.
- How the client can request correction, export, or deletion.

## Submission behavior

1. Validate required answers and attachment processing state.
2. Show a final completeness summary and unresolved optional sections.
3. Record consent/acknowledgment for the stated use and privacy policy.
4. Freeze a submitted form version.
5. Create a review task for the onboarding owner.
6. Generate a proposed Business and Marketing Profile; do not silently make it authoritative.
7. Send confirmation to the client and staff owner.
8. Route missing questions or contradictions into an attributed clarification thread.

## Staff review states

`invited -> started -> draft -> submitted -> reviewing -> clarification_requested -> profile_proposed -> profile_confirmed -> archived`

`withdrawn` and `expired` are terminal request states with data-retention behavior defined by policy.

## Acceptance criteria

- A client can complete the form on desktop and mobile without prompt or technical knowledge.
- The form visibly communicates progress and preserves answers between sessions.
- The client can navigate back and edit any completed section.
- Required validation catches missing business context without blocking optional detail.
- At least one paid or organic channel is required.
- No form field or upload accepts passwords, API keys, refresh tokens, or secret values.
- Client can submit a brand asset or advertising-data spreadsheet and see its upload state.
- Staff can see status, version, completion, and audit history.
- Submitted answers produce a durable, tenant-scoped intake record.
- Confirmation explains what happens next and how secure connections will occur.
- All form and attachment access passes authorization, tenant, retention, and audit tests.

## Current implementation boundary

The current build includes the visual flow, client-side validation, channel selection, email-confirmed Supabase Auth accounts, cookie-based sessions, applicant-scoped browser drafts, protected API routes, signed private uploads, durable applicant-owned Supabase submission storage, and Resend staff notification wiring. Before collecting real client data, it still needs the authenticated expiring invitation/resume model, rate limiting/bot protection, malware scanning, attachment review state, and retention/correction/export/deletion operations described above.
