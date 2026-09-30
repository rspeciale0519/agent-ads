import { afterEach, describe, expect, it, vi } from "vitest";

// Stand-in for Supabase so we can see whether sign-out was called.
const signOut = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
vi.mock("../../../lib/supabase-server", () => ({ getSupabaseServer: async () => ({ auth: { signOut } }) }));

import { POST } from "./route";

const post = (headers: Record<string, string>) => POST(new Request("https://app.example.test/auth/signout", { method: "POST", headers }));

afterEach(() => vi.clearAllMocks());

describe("log out", () => {
  it("signs out and sends the person to the login page", async () => {
    const response = await post({ origin: "https://app.example.test", "sec-fetch-site": "same-origin" });
    expect(signOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://app.example.test/auth?mode=login&signedout=1");
  });

  it("ignores requests from other websites", async () => {
    expect((await post({ origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect(signOut).not.toHaveBeenCalled();
  });
});
