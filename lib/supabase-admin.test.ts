import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ kind: "supabase-admin-test-client" })),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

async function loadAdminModule() {
  return import("./supabase-admin");
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  createClient.mockClear();
  vi.stubEnv("SUPABASE_URL", "https://project.example.test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Supabase admin server key selection", () => {
  it("uses SUPABASE_SECRET_KEY before the legacy fallback", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "primary-test-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-test-key");

    const { getSupabaseAdmin } = await loadAdminModule();
    getSupabaseAdmin();

    expect(createClient).toHaveBeenCalledWith(
      "https://project.example.test",
      "primary-test-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });

  it("uses SUPABASE_SERVICE_ROLE_KEY when the primary variable is missing", async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-test-key");

    const { getSupabaseAdmin } = await loadAdminModule();
    getSupabaseAdmin();

    expect(createClient).toHaveBeenCalledWith(
      "https://project.example.test",
      "legacy-test-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });

  it("returns the generic error when both key variables are missing", async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { getSupabaseAdmin } = await loadAdminModule();

    expect(() => getSupabaseAdmin()).toThrow("Supabase server environment variables are not configured.");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("uses the fallback when the primary variable is blank", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "   ");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-test-key");

    const { getSupabaseAdmin } = await loadAdminModule();
    getSupabaseAdmin();

    expect(createClient).toHaveBeenCalledWith(
      "https://project.example.test",
      "legacy-test-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });

  it("returns the generic error when both key variables are blank", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "   ");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "   ");

    const { getSupabaseAdmin } = await loadAdminModule();

    expect(() => getSupabaseAdmin()).toThrow("Supabase server environment variables are not configured.");
    expect(createClient).not.toHaveBeenCalled();
  });
});
