# MioDio onboarding deployment

This project is ready for a GitHub → Vercel deployment with Supabase storage/database and Resend notifications.

## What is implemented

- `POST /api/onboarding/upload-url` validates file name, extension, MIME type, size, and upload count, then creates a short-lived Supabase signed upload URL.
- The browser uploads directly to the private `onboarding-assets` bucket; the service-role key never reaches the browser.
- Supabase Auth protects the form with email-confirmed accounts, cookie-based SSR sessions, and authenticated API routes.
- `POST /api/onboarding/submit` validates the full form with Zod, records a durable applicant-owned `onboarding_submissions` row, and sends a structured MioDio notification through Resend.
- The form accepts business plans, brand files, PDFs, Word documents, images, video, CSV/TSV exports, and Excel `.xls`/`.xlsx` exports. Each file is limited to 10 MB and each submission to eight files.

## Supabase setup

1. Create or select the MioDio Supabase project.
2. Run `supabase/migrations/20260806_onboarding_submissions.sql` in the Supabase SQL Editor.
3. Run `supabase/migrations/20260806_onboarding_auth.sql` after Auth is enabled. It adds applicant ownership and an RLS defense-in-depth policy.
4. In Auth → URL Configuration, add the deployed URL and its callback: `https://aiagent-ads.vercel.app` and `https://aiagent-ads.vercel.app/auth/callback` (also add the local callback for development).
5. Copy the project URL, publishable key, and service-role key into the Vercel environment variables. The service-role key is server-only and must never be committed or prefixed with `NEXT_PUBLIC_`.
6. Keep the `onboarding-assets` bucket private. Uploaded files are untrusted business context and should be virus-scanned and reviewed before an agent uses them.

## Resend setup

1. In the MioDio Resend account, verify the sending domain and configure its SPF/DKIM records.
2. Create an API key scoped to this application.
3. Set `RESEND_FROM_EMAIL` to an address on the verified domain and `ONBOARDING_NOTIFICATION_EMAIL` to the inbox that should receive submissions.

## GitHub and Vercel

1. Push this project to a private GitHub repository.
2. Import the repository into Vercel using the Next.js framework preset.
3. Keep the Vercel Build Command as `pnpm run build`. Its `prebuild` hook generates the Prisma client before Next.js type checks.
4. Add every variable from `.env.example` to Vercel for Preview and Production environments.
5. Deploy a Preview first, create an applicant account, confirm the email, submit a test onboarding, upload an `.xlsx` and a PDF, and confirm both the applicant-owned Supabase row/files and Resend email.
6. Add the MioDio custom domain in Vercel after the preview test passes, then add that domain's `/auth/callback` URL in Supabase Auth.

Do not replace `pnpm run build` with `next build`. The direct command skips Prisma client generation.

## Notification shape

The email subject is `New MioDio marketing onboarding · {business name}`. It contains the form answers, selected paid/organic channels, and an attachment inventory. It does not attach files or put credentials in email; files remain in the private Supabase bucket.

## Before collecting real client data

- Replace open self-signup with authenticated, expiring invitations when client access needs to be restricted to pre-approved applicants.
- Add rate limiting and bot protection to both API routes.
- Add malware scanning and an attachment review state before agent retrieval.
- Define retention, correction, export, and deletion procedures for the Supabase row and storage objects.
