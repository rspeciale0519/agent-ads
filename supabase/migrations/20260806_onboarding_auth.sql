alter table public.onboarding_submissions
  add column if not exists applicant_id uuid references auth.users(id) on delete restrict;

create index if not exists onboarding_submissions_applicant_id_idx
  on public.onboarding_submissions (applicant_id);

alter table public.onboarding_submissions enable row level security;

drop policy if exists "Applicants can read their own onboarding" on public.onboarding_submissions;
create policy "Applicants can read their own onboarding"
  on public.onboarding_submissions
  for select
  to authenticated
  using ((select auth.uid()) = applicant_id);

revoke all on public.onboarding_submissions from anon, authenticated;
