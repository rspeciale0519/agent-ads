import { PrismaClient } from "@prisma/client";
import { randomOpaqueName, secretFingerprint, type SecretBroker, type SecretKind, SecretBrokerError } from "./secret-broker";

const globalForSecretBroker = globalThis as unknown as { secretBroker?: SecretBroker };

export class SupabaseVaultSecretBroker implements SecretBroker {
  readonly backend = "supabase-vault";
  readonly keyVersion: string;
  private readonly client: PrismaClient;

  constructor(url = process.env.SECRET_BROKER_DATABASE_URL) {
    if (!url) throw new SecretBrokerError("SECRET_BROKER_DATABASE_URL_MISSING");
    this.keyVersion = process.env.SECRET_BROKER_KEY_VERSION ?? "unknown";
    this.client = new PrismaClient({ datasources: { db: { url } } });
  }

  async put(input: { value: string; kind: SecretKind; expiresAt?: Date; opaqueName?: string }) {
    if (!input.value) throw new SecretBrokerError("EMPTY_SECRET");
    const name = input.opaqueName ?? randomOpaqueName();
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`SELECT vault.create_secret(${input.value}, ${name}, ${input.kind})::text AS id`;
    const handle = rows[0]?.id;
    if (!handle) throw new SecretBrokerError("SECRET_WRITE_FAILED");
    return { handle, fingerprint: secretFingerprint(input.value) };
  }

  async read(handle: string) {
    const rows = await this.client.$queryRaw<Array<{ read_broker_secret: string | null }>>`SELECT private.read_broker_secret(${handle}::uuid)`;
    return rows[0]?.read_broker_secret ?? null;
  }

  async rotate(handle: string, input: { value: string; kind: SecretKind; expiresAt?: Date }) {
    const existing = await this.read(handle);
    if (existing === null) throw new SecretBrokerError("SECRET_NOT_FOUND");
    const replacement = await this.put({ value: input.value, kind: input.kind, expiresAt: input.expiresAt });
    try {
      await this.destroy(handle);
    } catch {
      await this.destroy(replacement.handle).catch(() => undefined);
      throw new SecretBrokerError("SECRET_ROTATION_FAILED");
    }
    return replacement;
  }

  async destroy(handle: string) {
    await this.client.$executeRaw`SELECT private.destroy_broker_secret(${handle}::uuid)`;
  }

  async disconnect() {
    await this.client.$disconnect();
  }
}

export function getSecretBroker(): SecretBroker {
  const backend = process.env.SECRET_BROKER_BACKEND ?? "supabase-vault";
  if (backend !== "supabase-vault") throw new SecretBrokerError("SECRET_BROKER_BACKEND_NOT_APPROVED");
  if (!globalForSecretBroker.secretBroker) globalForSecretBroker.secretBroker = new SupabaseVaultSecretBroker();
  return globalForSecretBroker.secretBroker;
}
