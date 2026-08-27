"use client";

import { useRef } from "react";

export type MutationIdentity = {
  idempotencyKey: string;
  correlationId: string;
};

export function createMutationIdentity(): MutationIdentity {
  const idempotencyKey = crypto.randomUUID();
  return { idempotencyKey, correlationId: `browser.${crypto.randomUUID()}` };
}

export function mutationHeaders(identity: MutationIdentity, includeJson = true) {
  const headers = new Headers();
  headers.set("Idempotency-Key", identity.idempotencyKey);
  headers.set("X-Correlation-Id", identity.correlationId);
  if (includeJson) headers.set("Content-Type", "application/json");
  return headers;
}

export class MutationIdentityStore {
  private readonly identities = new Map<string, MutationIdentity>();

  headers(intent: string, includeJson = true) {
    let identity = this.identities.get(intent);
    if (!identity) {
      identity = createMutationIdentity();
      this.identities.set(intent, identity);
    }
    return mutationHeaders(identity, includeJson);
  }

  complete(intent: string) {
    this.identities.delete(intent);
  }

  reset(intent: string) {
    this.identities.delete(intent);
  }
}

export function useMutationIdentityStore() {
  const store = useRef<MutationIdentityStore | null>(null);
  if (!store.current) store.current = new MutationIdentityStore();
  return store.current;
}

export async function mutationFetch(store: MutationIdentityStore, intent: string, input: RequestInfo | URL, init: RequestInit) {
  const headers = new Headers(init.headers);
  const identityHeaders = store.headers(intent, typeof init.body === "string" && !headers.has("Content-Type"));
  identityHeaders.forEach((value, name) => headers.set(name, value));
  const response = await fetch(input, { ...init, headers });
  if (response.ok) store.complete(intent);
  return response;
}
