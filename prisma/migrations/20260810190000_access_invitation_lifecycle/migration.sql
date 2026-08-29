ALTER TABLE public.access_invitations
  ADD COLUMN IF NOT EXISTS verification_source text,
  ADD COLUMN IF NOT EXISTS source_date timestamptz;

ALTER TABLE public.access_invitations
  DROP CONSTRAINT IF EXISTS access_invitations_status_check,
  ADD CONSTRAINT access_invitations_status_check
    CHECK (status IN ('draft', 'sent', 'accepted', 'verified', 'attention_required', 'expired', 'revoked'));

ALTER TABLE public.access_invitations
  DROP CONSTRAINT IF EXISTS access_invitations_verified_source_check,
  ADD CONSTRAINT access_invitations_verified_source_check
    CHECK (status <> 'verified' OR (verification_source IS NOT NULL AND source_date IS NOT NULL));
