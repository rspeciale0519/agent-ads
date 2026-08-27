const organizationA = "00000000-0000-4000-8000-000000002101";
const organizationB = "00000000-0000-4000-8000-000000002102";
const userA = "00000000-0000-4000-8000-000000002201";
const userB = "00000000-0000-4000-8000-000000002202";
const authA = "00000000-0000-4000-8000-000000002301";
const authB = "00000000-0000-4000-8000-000000002302";
const connectionA = "00000000-0000-4000-8000-000000002401";
const connectionB = "00000000-0000-4000-8000-000000002402";
const reference = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const orphan = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

function fixture({ pointerA = null, pointerB = null, referenceOrganization = null } = {}) {
  const pointer = (value) => value === null ? "NULL" : `'${value}'`;
  const referenceSql = referenceOrganization === null ? "" : `
INSERT INTO private.credential_references (
  id, organization_id, broker_handle, backend, credential_kind, key_version, updated_at
) VALUES (
  '${reference}', '${referenceOrganization}', 'f0-upgrade-handle', 'proof',
  'oauth_refresh_token', 'proof-v1', now()
);`;
  return `
INSERT INTO public.organizations (id, name, slug, updated_at) VALUES
  ('${organizationA}', 'F0 upgrade A', 'f0-upgrade-a', now()),
  ('${organizationB}', 'F0 upgrade B', 'f0-upgrade-b', now());
INSERT INTO public.users (id, auth_subject, updated_at) VALUES
  ('${userA}', '${authA}', now()),
  ('${userB}', '${authB}', now());
INSERT INTO public.connections (
  id, organization_id, created_by_user_id, provider, authorization_method,
  credential_reference_id, granted_scopes, updated_at
) VALUES
  ('${connectionA}', '${organizationA}', '${userA}', 'mock', 'oauth', ${pointer(pointerA)}, ARRAY[]::text[], now()),
  ('${connectionB}', '${organizationA}', '${userA}', 'mock', 'oauth', ${pointer(pointerB)}, ARRAY[]::text[], now());
${referenceSql}
`;
}

function textRollbackAssertion(expectedA, expectedB = null) {
  const value = (entry) => entry === null ? "NULL" : `'${entry}'`;
  return `
DO $assertion$
BEGIN
  IF (
    SELECT attribute.atttypid::regtype::text
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.connections'::regclass
      AND attribute.attname = 'credential_reference_id'
      AND NOT attribute.attisdropped
  ) IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'failed repair did not roll back the column type';
  END IF;
  IF (SELECT credential_reference_id FROM public.connections WHERE id = '${connectionA}') IS DISTINCT FROM ${value(expectedA)}
     OR (SELECT credential_reference_id FROM public.connections WHERE id = '${connectionB}') IS DISTINCT FROM ${value(expectedB)} THEN
    RAISE EXCEPTION 'failed repair did not preserve pointer values';
  END IF;
END
$assertion$;
`;
}

const validAssertion = `
DO $assertion$
BEGIN
  IF (
    SELECT attribute.atttypid::regtype::text
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.connections'::regclass
      AND attribute.attname = 'credential_reference_id'
      AND NOT attribute.attisdropped
  ) IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'valid pointer was not converted to uuid';
  END IF;
  IF (SELECT credential_reference_id::text FROM public.connections WHERE id = '${connectionA}') IS DISTINCT FROM '${reference}'
     OR (SELECT credential_reference_id FROM public.connections WHERE id = '${connectionB}') IS NOT NULL THEN
    RAISE EXCEPTION 'valid conversion changed a pointer or null value';
  END IF;
END
$assertion$;
`;

const missingOrganizationEmptyAssertion = `
DO $assertion$
BEGIN
  IF (
    SELECT attribute.atttypid::regtype::text
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.connections'::regclass
      AND attribute.attname = 'credential_reference_id'
      AND NOT attribute.attisdropped
  ) IS DISTINCT FROM 'uuid' OR (
    SELECT attribute.atttypid::regtype::text
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'private.credential_references'::regclass
      AND attribute.attname = 'organization_id'
      AND NOT attribute.attisdropped
  ) IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'empty historical schema did not complete UUID and tenant repair';
  END IF;
END
$assertion$;
`;

export const upgradeScenarios = [
  {
    name: "valid",
    fixture: fixture({ pointerA: reference, referenceOrganization: organizationA }),
    assertion: validAssertion,
  },
  {
    name: "malformed",
    fixture: fixture({ pointerA: "not-a-uuid" }),
    expectedFailure: "non-canonical UUID",
    assertion: textRollbackAssertion("not-a-uuid"),
  },
  {
    name: "orphan",
    fixture: fixture({ pointerA: orphan }),
    expectedFailure: "orphaned or cross-tenant reference",
    assertion: textRollbackAssertion(orphan),
  },
  {
    name: "cross_tenant",
    fixture: fixture({ pointerA: reference, referenceOrganization: organizationB }),
    expectedFailure: "orphaned or cross-tenant reference",
    assertion: textRollbackAssertion(reference),
  },
  {
    name: "collision",
    fixture: fixture({ pointerA: reference, pointerB: reference.toUpperCase(), referenceOrganization: organizationA }),
    expectedFailure: "collide after UUID normalization",
    assertion: textRollbackAssertion(reference, reference.toUpperCase()),
  },
  {
    name: "missing_organization_with_pointer",
    fixture: `
ALTER TABLE private.credential_references DROP COLUMN organization_id CASCADE;
${fixture({ pointerA: reference }).replace(
  /INSERT INTO public\.connections/u,
  `INSERT INTO private.credential_references (id, broker_handle, backend, credential_kind, key_version, updated_at)
VALUES ('${reference}', 'f0-missing-tenant-handle', 'proof', 'oauth_refresh_token', 'proof-v1', now());
INSERT INTO public.connections`,
)}`,
    expectedFailure: "organization_id is missing while credential pointers exist",
    assertion: textRollbackAssertion(reference),
  },
  {
    name: "missing_organization_empty",
    fixture: "ALTER TABLE private.credential_references DROP COLUMN organization_id CASCADE;",
    postRepairMigration: "20260810180000_credential_reference_tenant_scope",
    assertion: missingOrganizationEmptyAssertion,
  },
];
