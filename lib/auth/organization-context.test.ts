import { describe, expect, it, vi } from "vitest";

// The module talks to Supabase and the database; only the pure helper is tested here.
vi.mock("../../lib/supabase-server", () => ({ getSupabaseServer: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("../db/client", () => ({ prisma: {} }));

import { chooseMembership } from "./organization-context";

const a = { id: "org-a" };
const b = { id: "org-b" };

describe("choosing the workspace", () => {
  it("uses the remembered workspace when the person belongs to it", () => {
    expect(chooseMembership([a, b], undefined, "org-b")).toBe(b);
  });

  it("ignores a remembered workspace the person doesn't belong to", () => {
    // Someone else's choice left in this browser: fall back to the only membership.
    expect(chooseMembership([a], undefined, "org-other")).toBe(a);
    // With several memberships, the person is asked to choose.
    expect(chooseMembership([a, b], undefined, "org-other")).toBeUndefined();
  });

  it("never falls back for an explicitly requested workspace", () => {
    expect(chooseMembership([a], "org-other", "org-a")).toBeUndefined();
    expect(chooseMembership([a, b], "org-a", "org-b")).toBe(a);
  });
});
