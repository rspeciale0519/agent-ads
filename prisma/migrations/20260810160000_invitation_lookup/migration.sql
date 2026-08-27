DROP FUNCTION IF EXISTS private.lookup_organization_invitation(text);
CREATE FUNCTION private.lookup_organization_invitation(invitation_token_hash text)
RETURNS TABLE(invitation_id uuid, organization_id uuid, organization_name text, recipient_email text, recipient_auth_subject uuid, role text, permissions text[], status text, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT organization_invitations.id, organization_invitations.organization_id, organizations.name, organization_invitations.recipient_email, organization_invitations.recipient_auth_subject, organization_invitations.role, organization_invitations.permissions, organization_invitations.status, organization_invitations.expires_at
    FROM public.organization_invitations
    JOIN public.organizations ON organizations.id = organization_invitations.organization_id
   WHERE organization_invitations.token_hash = invitation_token_hash
   LIMIT 1
$$;
REVOKE ALL ON FUNCTION private.lookup_organization_invitation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.lookup_organization_invitation(text) TO app_runtime;
