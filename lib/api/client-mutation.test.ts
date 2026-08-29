import { afterEach, describe, expect, it, vi } from "vitest";
import { MutationIdentityStore, mutationFetch } from "./client-mutation";

afterEach(() => vi.unstubAllGlobals());

describe("browser mutation identity store", () => {
  it("reuses one identity until success is confirmed", () => {
    const store = new MutationIdentityStore();
    const first = store.headers("connection:verify", false);
    const retry = store.headers("connection:verify", false);
    expect(retry.get("idempotency-key")).toBe(first.get("idempotency-key"));
    expect(retry.get("x-correlation-id")).toBe(first.get("x-correlation-id"));
    store.complete("connection:verify");
    const nextIntent = store.headers("connection:verify", false);
    expect(nextIntent.get("idempotency-key")).not.toBe(first.get("idempotency-key"));
  });

  it("isolates simultaneous logical intents", () => {
    const store = new MutationIdentityStore();
    expect(store.headers("connection:verify", false).get("idempotency-key"))
      .not.toBe(store.headers("connection:revoke", false).get("idempotency-key"));
  });

  it("preserves caller headers while adding retained mutation identity", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    const store = new MutationIdentityStore();

    await mutationFetch(store, "connection:verify", "/api/connections/one/verify", {
      method: "POST",
      headers: { Accept: "application/problem+json", "Content-Type": "application/merge-patch+json" },
      body: JSON.stringify({ check: true }),
    });

    const requestInit = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(requestInit?.headers);
    expect(headers.get("accept")).toBe("application/problem+json");
    expect(headers.get("content-type")).toBe("application/merge-patch+json");
    expect(headers.get("idempotency-key")).toMatch(/^[0-9a-f-]{36}$/u);
    expect(headers.get("x-correlation-id")).toMatch(/^browser\.[0-9a-f-]{36}$/u);
  });
});
