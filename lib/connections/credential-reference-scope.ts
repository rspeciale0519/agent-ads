export function activeCredentialReferenceWhere(organizationId: string, connectionId: string, referenceId: string) {
  return {
    id: referenceId,
    organizationId,
    connectionId,
    cleanupStatus: "active" as const,
  };
}

export async function readScopedCredentialSecret(
  referenceId: string | null,
  reference: { brokerHandle: string } | null,
  broker: { read(handle: string): Promise<string | null> },
) {
  if (referenceId && !reference) throw new CredentialReferenceIntegrityError();
  return reference ? broker.read(reference.brokerHandle) : null;
}

export class CredentialReferenceIntegrityError extends Error {
  readonly code = "SECRET_REFERENCE_INVALID";
  readonly status = 503;

  constructor() {
    super("SECRET_REFERENCE_INVALID");
    this.name = "CredentialReferenceIntegrityError";
  }
}
