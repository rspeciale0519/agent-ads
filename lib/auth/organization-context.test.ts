import { describe, expect, it, vi } from "vitest";

// The module talks to Supabase and the database; only the pure helper is tested here.
vi.mock("../../lib/supabase-server", () => ({ getSupabaseServer: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("../db/client", () => ({ prisma: {} }));

import { chooseMembership, rememberedOrganizationFor, rememberedOrganizationValue } from "./organization-context";

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

describe("remembered workspace", () => {
  const me = "00000000-0000-4000-8000-00000000000a";
  const someoneElse = "00000000-0000-4000-8000-00000000000b";

  it("applies only to the account that chose it", () => {
    const cookie = rememberedOrganizationValue(me, "org-b");
    expect(rememberedOrganizationFor(cookie, me)).toBe("org-b");
    // Another person on the same browser, even with access to org-b, is asked to choose.
    expect(rememberedOrganizationFor(cookie, someoneElse)).toBeUndefined();
  });

  it("ignores missing, older-format or malformed values", () => {
    expect(rememberedOrganizationFor(undefined, me)).toBeUndefined();
    expect(rememberedOrganizationFor("org-b", me)).toBeUndefined();
    expect(rememberedOrganizationFor(`${me}:`, me)).toBeUndefined();
    expect(rememberedOrganizationFor(`${me}:org-b:extra`, me)).toBeUndefined();
  });
});
