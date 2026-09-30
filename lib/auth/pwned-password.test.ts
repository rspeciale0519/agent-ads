import { describe, expect, it, vi } from "vitest";
import { leakedPasswordMessage, pwnedPasswordCount } from "./pwned-password";

// SHA-1 of "password" is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8.
const reply = (body: string, ok = true) => vi.fn().mockResolvedValue({ ok, text: async () => body }) as unknown as typeof fetch;

describe("leaked password check", () => {
  it("sends only the first 5 characters of the fingerprint, never the password", async () => {
    const fetcher = reply("");
    await pwnedPasswordCount("password", fetcher);
    const url = String(vi.mocked(fetcher).mock.calls[0][0]);
    expect(url).toBe("https://api.pwnedpasswords.com/range/5BAA6");
  });

  it("returns the breach count when the fingerprint matches", async () => {
    const fetcher = reply("0000000000000000000000000000000000A:0\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9659365\r\n");
    expect(await pwnedPasswordCount("password", fetcher)).toBe(9659365);
    expect(await leakedPasswordMessage("password", fetcher)).toContain("data breach");
  });

  it("returns 0 when the password isn't in the list, and ignores padding lines", async () => {
    expect(await pwnedPasswordCount("password", reply("1E4C9B93F3F0682250B6CF8331B7EE68FD9:0\r\n"))).toBe(0);
    expect(await leakedPasswordMessage("password", reply(""))).toBeNull();
  });

  it("allows the password when the service can't be reached", async () => {
    expect(await pwnedPasswordCount("password", reply("", false))).toBeNull();
    const down = vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    expect(await leakedPasswordMessage("password", down)).toBeNull();
  });
});
