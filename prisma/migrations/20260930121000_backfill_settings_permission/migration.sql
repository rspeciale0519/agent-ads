BEGIN;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '15s';

-- Owners and administrators may change organization settings. Memberships and
-- pending invitations store their permissions, so add the new one to rows
-- that were created before it existed.
UPDATE public.memberships
SET permissions = array_append(permissions, 'organization.settings.manage')
WHERE role IN ('owner', 'administrator')
  AND NOT ('organization.settings.manage' = ANY (permissions));

UPDATE public.organization_invitations
SET permissions = array_append(permissions, 'organization.settings.manage')
WHERE role IN ('owner', 'administrator')
  AND status = 'pending'
  AND NOT ('organization.settings.manage' = ANY (permissions));

COMMIT;
