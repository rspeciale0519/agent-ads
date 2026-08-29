-- Prevent a tenant-owned child row from pointing at a parent in another tenant.
-- Existing single-column foreign keys remain for compatibility; these composite
-- constraints make organization identity part of every connection relationship.
CREATE UNIQUE INDEX "connection_requests_organization_id_id_key"
  ON public.connection_requests (organization_id, id);
CREATE UNIQUE INDEX "connections_organization_id_id_key"
  ON public.connections (organization_id, id);
CREATE UNIQUE INDEX "connection_resources_organization_id_id_key"
  ON public.connection_resources (organization_id, id);
CREATE UNIQUE INDEX "credential_references_organization_id_id_key"
  ON private.credential_references (organization_id, id);

ALTER TABLE public.connections
  ADD CONSTRAINT "connections_organization_request_fkey"
  FOREIGN KEY (organization_id, request_id)
  REFERENCES public.connection_requests (organization_id, id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.connections
  ADD CONSTRAINT "connections_organization_credential_fkey"
  FOREIGN KEY (organization_id, credential_reference_id)
  REFERENCES private.credential_references (organization_id, id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.connection_resources
  ADD CONSTRAINT "connection_resources_organization_connection_fkey"
  FOREIGN KEY (organization_id, connection_id)
  REFERENCES public.connections (organization_id, id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.connection_health_checks
  ADD CONSTRAINT "connection_health_checks_organization_connection_fkey"
  FOREIGN KEY (organization_id, connection_id)
  REFERENCES public.connections (organization_id, id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.capability_snapshots
  ADD CONSTRAINT "capability_snapshots_organization_connection_fkey"
  FOREIGN KEY (organization_id, connection_id)
  REFERENCES public.connections (organization_id, id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.capability_snapshots
  ADD CONSTRAINT "capability_snapshots_organization_resource_fkey"
  FOREIGN KEY (organization_id, resource_id)
  REFERENCES public.connection_resources (organization_id, id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.oauth_transactions
  ADD CONSTRAINT "oauth_transactions_organization_connection_fkey"
  FOREIGN KEY (organization_id, connection_id)
  REFERENCES public.connections (organization_id, id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.access_invitations
  ADD CONSTRAINT "access_invitations_organization_connection_fkey"
  FOREIGN KEY (organization_id, connection_id)
  REFERENCES public.connections (organization_id, id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.capability_snapshots
  ADD CONSTRAINT "capability_snapshots_organization_id_fkey"
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations (id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.oauth_transactions
  ADD CONSTRAINT "oauth_transactions_organization_id_fkey"
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations (id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE public.memberships
SET permissions = array_append(permissions, 'membership.manage')
WHERE role IN ('owner', 'administrator')
  AND NOT ('membership.manage' = ANY (permissions));
