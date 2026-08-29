import { timingSafeEqual } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const cleanupResultSchema = z.array(z.object({
  transaction_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  provider: z.string().min(1).max(80),
  connection_id: z.string().uuid().nullable(),
  cleanup_outcome: z.enum(["destroyed", "already_absent", "invalid_reference"]),
})).max(500);
const deletedCountSchema = z.array(z.object({ deleted_count: z.coerce.number().int().min(0).max(1000) })).length(1);

const globalForMaintenance = globalThis as unknown as { accountConnectionsMaintenanceClient?: PrismaClient };

export function maintenanceRequestAuthorized(authorization: string | null, configuredToken = process.env.ACCOUNT_CONNECTIONS_MAINTENANCE_TOKEN) {
  if (!configuredToken || configuredToken.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  const candidate = authorization.slice("Bearer ".length);
  const expectedBytes = Buffer.from(configuredToken, "utf8");
  const candidateBytes = Buffer.from(candidate, "utf8");
  return expectedBytes.length === candidateBytes.length && timingSafeEqual(expectedBytes, candidateBytes);
}

export async function runExpiredOAuthMaintenance(batchLimit = 100) {
  const parsedLimit = z.number().int().min(1).max(500).parse(batchLimit);
  const rows: unknown = await maintenanceClient().$queryRaw`
    SELECT * FROM private.cleanup_expired_oauth_transactions(${parsedLimit})
  `;
  const parsed = cleanupResultSchema.parse(rows);
  return summarizeCleanupOutcomes(parsed);
}

export async function runAccountConnectionsMaintenance(batchLimit = 100) {
  const parsedLimit = z.number().int().min(1).max(500).parse(batchLimit);
  const oauth = await runExpiredOAuthMaintenance(parsedLimit);
  const rows: unknown = await maintenanceClient().$queryRaw`
    SELECT private.cleanup_expired_idempotency_records(${parsedLimit}) AS deleted_count
  `;
  const parsed = deletedCountSchema.parse(rows);
  return { oauth, idempotencyRecordsDeleted: parsed[0].deleted_count };
}

export function summarizeCleanupOutcomes(rows: Array<{ cleanup_outcome: "destroyed" | "already_absent" | "invalid_reference" }>) {
  return {
    processed: rows.length,
    destroyed: rows.filter((row) => row.cleanup_outcome === "destroyed").length,
    alreadyAbsent: rows.filter((row) => row.cleanup_outcome === "already_absent").length,
    invalidReferences: rows.filter((row) => row.cleanup_outcome === "invalid_reference").length,
  };
}

function maintenanceClient() {
  const url = process.env.SECRET_BROKER_DATABASE_URL;
  if (!url) throw new MaintenanceError("MAINTENANCE_DATABASE_URL_MISSING", 503);
  if (!globalForMaintenance.accountConnectionsMaintenanceClient) {
    globalForMaintenance.accountConnectionsMaintenanceClient = new PrismaClient({ datasources: { db: { url } } });
  }
  return globalForMaintenance.accountConnectionsMaintenanceClient;
}

export class MaintenanceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "MaintenanceError";
    this.code = code;
    this.status = status;
  }
}
