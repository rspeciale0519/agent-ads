import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { replaceAgentSection, updateProgress } from "./update-progress.mjs";

const original = `# Shared development progress
Outside content stays.
<!-- agent:codex:start -->
Codex before.
<!-- agent:codex:end -->
<!-- agent:claude:start -->
Claude before.
<!-- agent:claude:end -->
Release gates stay open.
`;

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "agent-ads-coordination-"));
  roots.push(root);
  const directory = path.join(root, "docs/development/collaboration");
  const target = path.join(root, "docs/development/delivery/shared-progress.md");
  mkdirSync(directory, { recursive: true });
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, original);
  return { root, directory, target };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    // Only remove the unique temporary directory that this test created.
    if (!path.basename(root).startsWith("agent-ads-coordination-")) throw new Error("Unsafe test cleanup");
    if (path.dirname(root) !== tmpdir()) throw new Error("Unexpected test directory");
    rmSync(root, { recursive: true, force: true });
  }
});

describe("shared progress updates", () => {
  it("preserves the other agent and release evidence", () => {
    const result = replaceAgentSection(original, "codex", "Codex after.");
    expect(result).toContain("Claude before.");
    expect(result).toContain("Release gates stay open.");
    expect(result).toContain("Outside content stays.");
    expect(result).not.toContain("Codex before.");
  });

  it("keeps both sequential agent updates", () => {
    const { root, target, directory } = fixture();
    updateProgress(root, "codex", "Codex after.");
    updateProgress(root, "claude", "Claude after.");
    const saved = readFileSync(target, "utf8");
    expect(saved).toContain("Codex after.");
    expect(saved).toContain("Claude after.");
    expect(existsSync(path.join(directory, ".progress.lock"))).toBe(false);
  });

  it("refuses a concurrent writer without changing its lock or document", () => {
    const { root, target, directory } = fixture();
    const lock = path.join(directory, ".progress.lock");
    writeFileSync(lock, "another writer");
    expect(() => updateProgress(root, "claude", "New text")).toThrow("Progress is locked");
    expect(readFileSync(lock, "utf8")).toBe("another writer");
    expect(readFileSync(target, "utf8")).toBe(original);
  });

  it("releases its lock after rejecting invalid content", () => {
    const { root, target, directory } = fixture();
    expect(() => updateProgress(root, "codex", "<!-- agent:claude:start -->")).toThrow("reserved");
    expect(existsSync(path.join(directory, ".progress.lock"))).toBe(false);
    expect(readFileSync(target, "utf8")).toBe(original);
  });

  it("rejects malformed markers and invalid or empty updates", () => {
    expect(() => replaceAgentSection(original, "other", "Text")).toThrow("agent name");
    expect(() => replaceAgentSection(original, "codex", " ")).toThrow("bytes");
    expect(() => replaceAgentSection(original, "codex", "a".repeat(20001))).toThrow("bytes");
    expect(() => replaceAgentSection(original.replace("<!-- agent:codex:end -->", ""), "codex", "Text")).toThrow("exactly one");
    expect(() => replaceAgentSection(original + "<!-- agent:claude:end -->", "claude", "Text")).toThrow("exactly one");
  });
});
