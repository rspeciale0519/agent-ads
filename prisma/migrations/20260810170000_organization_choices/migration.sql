CREATE OR REPLACE FUNCTION private.list_user_organizations(auth_subject uuid)
RETURNS TABLE(id uuid, name text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT organizations.id, organizations.name, memberships.role
    FROM public.memberships JOIN public.users ON users.id = memberships.user_id JOIN public.organizations ON organizations.id = memberships.organization_id
   WHERE users.auth_subject = auth_subject AND memberships.status = 'active' AND organizations.status = 'active'
   ORDER BY organizations.name
$$;
REVOKE ALL ON FUNCTION private.list_user_organizations(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.list_user_organizations(uuid) TO app_runtime;
