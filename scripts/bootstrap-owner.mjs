import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const authSubject = process.env.APP_BOOTSTRAP_AUTH_SUBJECT;
const organizationName = process.env.APP_BOOTSTRAP_ORGANIZATION_NAME;
const organizationSlug = process.env.APP_BOOTSTRAP_ORGANIZATION_SLUG;
const databaseUrl = process.env.APP_BOOTSTRAP_DATABASE_URL || process.env.DIRECT_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!authSubject || !organizationName || !organizationSlug || !supabaseUrl || !serviceRoleKey || !databaseUrl) {
  throw new Error("Bootstrap requires APP_BOOTSTRAP_AUTH_SUBJECT, APP_BOOTSTRAP_ORGANIZATION_NAME, APP_BOOTSTRAP_ORGANIZATION_SLUG, Supabase server variables, and APP_BOOTSTRAP_DATABASE_URL or DIRECT_URL.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(authSubject);
if (authError || !authResult.user) throw new Error("The protected bootstrap subject is not a Supabase Auth user.");

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: ["error"] });
try {
  const result = await prisma.$transaction(async (tx) => {
    const [role] = await tx.$queryRaw`SELECT current_user AS name, rolsuper AS is_superuser, rolbypassrls AS bypasses_rls FROM pg_roles WHERE rolname = current_user`;
    if (!role || role.name === "app_runtime" || role.bypasses_rls !== true) throw new Error("Bootstrap requires the approved direct maintenance role, not app_runtime.");
    await tx.$executeRaw`select pg_advisory_xact_lock(hashtext('miodio-account-connections-bootstrap'))`;
    const existingOwner = await tx.membership.findFirst({ where: { role: "owner", status: "active" } });
    if (existingOwner) throw new Error("An active organization owner already exists; bootstrap refused.");

    const appUser = await tx.appUser.upsert({
      where: { authSubject },
      update: { email: authResult.user.email ?? null },
      create: { authSubject, email: authResult.user.email ?? null },
    });
    const organization = await tx.organization.create({ data: { name: organizationName, slug: organizationSlug } });
    const permissions = [
      "connections.view",
      "connections.inventory.manage",
      "connections.authorize",
      "connections.resources.select",
      "connections.verify",
      "connections.revoke",
      "connections.secrets.rotate",
      "membership.manage",
    ];
    await tx.membership.create({ data: { organizationId: organization.id, userId: appUser.id, role: "owner", permissions, acceptedAt: new Date() } });
    const correlationId = randomUUID();
    const integrityHash = createHash("sha256").update(`${organization.id}:organization.bootstrap:${correlationId}`).digest("hex");
    await tx.auditEvent.create({
      data: {
        organizationId: organization.id,
        actorUserId: appUser.id,
        action: "organization.bootstrap",
        resourceType: "organization",
        resourceId: organization.id,
        correlationId,
        outcomeCode: "succeeded",
        metadata: { authSubject: "redacted", ownerEmail: "redacted" },
        integrityHash,
      },
    });
    return { organizationId: organization.id, ownerUserId: appUser.id };
  }, { maxWait: 5_000, timeout: 10_000 });
  console.log(JSON.stringify({ ok: true, ...result }));
} finally {
  await prisma.$disconnect();
}
