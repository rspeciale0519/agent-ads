CREATE OR REPLACE FUNCTION private.list_user_organizations(requested_auth_subject uuid)
RETURNS TABLE(id uuid, name text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT organizations.id, organizations.name, memberships.role
    FROM public.memberships
    JOIN public.users ON users.id = memberships.user_id
    JOIN public.organizations ON organizations.id = memberships.organization_id
   WHERE requested_auth_subject = private.current_auth_subject()
     AND users.auth_subject = private.current_auth_subject()
     AND memberships.status = 'active'
     AND organizations.status = 'active'
   ORDER BY organizations.name
$$;

CREATE OR REPLACE FUNCTION private.lookup_organization_invitation(invitation_token_hash text)
RETURNS TABLE(invitation_id uuid, organization_id uuid, organization_name text, recipient_email text, recipient_auth_subject uuid, role text, permissions text[], status text, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT organization_invitations.id,
         organization_invitations.organization_id,
         organizations.name,
         organization_invitations.recipient_email,
         organization_invitations.recipient_auth_subject,
         organization_invitations.role,
         organization_invitations.permissions,
         organization_invitations.status,
         organization_invitations.expires_at
    FROM public.organization_invitations
    JOIN public.organizations ON organizations.id = organization_invitations.organization_id
   WHERE private.current_auth_subject() IS NOT NULL
     AND organization_invitations.token_hash = invitation_token_hash
     AND (
       organization_invitations.recipient_auth_subject IS NULL
       OR organization_invitations.recipient_auth_subject = private.current_auth_subject()
     )
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION private.list_user_organizations(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.lookup_organization_invitation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.list_user_organizations(uuid) TO app_runtime;
GRANT EXECUTE ON FUNCTION private.lookup_organization_invitation(text) TO app_runtime;
