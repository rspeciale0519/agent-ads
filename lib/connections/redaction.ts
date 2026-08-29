const sensitiveKey = /(?:secret|token|password|cookie|private.?key|authorization|api.?key|access.?token|refresh.?token|pkce|credential)/i;

export function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => redactSensitive(entry)) as T;
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) output[key] = sensitiveKey.test(key) ? "[REDACTED]" : redactSensitive(entry);
    return output as T;
  }
  if (typeof value === "string" && (value.startsWith("eyJ") || value.includes("BEGIN PRIVATE KEY"))) return "[REDACTED]" as T;
  return value;
}

export function safeAuditMetadata(value: Record<string, unknown>) {
  return redactSensitive(value);
}

export function containsSecret(value: unknown): boolean {
  if (typeof value === "string") return value !== "[REDACTED]" && (value.startsWith("eyJ") || value.includes("BEGIN PRIVATE KEY"));
  if (Array.isArray(value)) return value.some(containsSecret);
  if (value && typeof value === "object") return Object.entries(value).some(([key, entry]) => (sensitiveKey.test(key) && entry !== "[REDACTED]") || containsSecret(entry));
  return false;
}
