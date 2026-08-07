create table if not exists public.onboarding_submissions (
  id uuid primary key,
  business_name text not null,
  payload jsonb not null,
  attachment_count integer not null default 0 check (attachment_count between 0 and 8),
  storage_bucket text not null default 'onboarding-assets',
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed')),
  notification_error text,
  submitted_at timestamptz not null default timezone('utc', now()),
  notification_sent_at timestamptz
);

alter table public.onboarding_submissions enable row level security;
revoke all on public.onboarding_submissions from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'onboarding-assets',
  'onboarding-assets',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'text/tab-separated-values',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
