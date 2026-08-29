export type SupabaseRuntimeTarget = Readonly<{
  host: string;
  projectRef: string;
}>;

export type DatabaseRuntimeTarget = Readonly<{
  connectionLimit: number | null;
  database: string;
  host: string;
  pgbouncer: boolean;
  poolerType: "supavisor" | "direct";
  poolTimeout: number | null;
  port: number | null;
  principal: string;
  projectRef: string;
  queryParametersApproved: boolean;
  tls: boolean;
}>;

export const UNRESOLVED_TARGET_FINGERPRINT_SHA256: string;

export function parseSupabaseUrl(
  rawValue: unknown,
): SupabaseRuntimeTarget | null;

export function parseDatabaseUrl(
  rawValue: unknown,
): DatabaseRuntimeTarget | null;

export function targetFingerprint(
  publicTarget: SupabaseRuntimeTarget | null,
  serverTarget: SupabaseRuntimeTarget | null,
  runtimeTarget: DatabaseRuntimeTarget | null,
  brokerTarget: DatabaseRuntimeTarget | null,
): string;
