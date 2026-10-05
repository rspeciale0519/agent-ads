import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const canonicalRoot = path.resolve(path.dirname(scriptPath), "../..");

export function replaceAgentSection(document, agent, update) {
  if (agent !== "codex" && agent !== "claude") {
    throw new Error("Use codex or claude as the agent name.");
  }
  if (!update.trim() || Buffer.byteLength(update, "utf8") > 20000) {
    throw new Error("The update must contain 1 to 20000 UTF-8 bytes.");
  }
  if (update.includes("<!-- agent:")) {
    throw new Error("The update cannot contain reserved agent markers.");
  }
  for (const owner of ["codex", "claude"]) {
    for (const boundary of ["start", "end"]) {
      const marker = `<!-- agent:${owner}:${boundary} -->`;
      if (document.split(marker).length !== 2) {
        throw new Error(`The document must contain exactly one ${marker}.`);
      }
    }
  }
  const codexStart = document.indexOf("<!-- agent:codex:start -->");
  const codexEnd = document.indexOf("<!-- agent:codex:end -->");
  const claudeStart = document.indexOf("<!-- agent:claude:start -->");
  const claudeEnd = document.indexOf("<!-- agent:claude:end -->");
  if (!(codexStart < codexEnd && codexEnd < claudeStart && claudeStart < claudeEnd)) {
    throw new Error("The agent sections overlap or have an invalid order.");
  }
  const startMarker = `<!-- agent:${agent}:start -->`;
  const endMarker = `<!-- agent:${agent}:end -->`;
  const start = document.indexOf(startMarker) + startMarker.length;
  const end = document.indexOf(endMarker);
  return `${document.slice(0, start)}\n${update.trim()}\n${document.slice(end)}`;
}

export function updateProgress(root, agent, update) {
  const directory = path.join(root, "docs/development/collaboration");
  const target = path.join(root, "docs/development/delivery/shared-progress.md");
  const lock = path.join(directory, ".progress.lock");
  const temporary = path.join(directory, `.progress.${randomUUID()}.tmp`);
  if (lstatSync(target).isSymbolicLink()) {
    throw new Error("The progress document cannot be a symbolic link.");
  }
  let descriptor;
  try {
    descriptor = openSync(lock, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error("Progress is locked. Do not bypass or steal the lock. Retry after the writer finishes.");
    }
    throw error;
  }
  try {
    writeFileSync(descriptor, JSON.stringify({ agent, pid: process.pid, startedAt: new Date().toISOString() }));
    fsyncSync(descriptor);
    const current = readFileSync(target, "utf8");
    const next = replaceAgentSection(current, agent, update);
    const output = openSync(temporary, "wx", 0o600);
    try {
      writeFileSync(output, next, "utf8");
      fsyncSync(output);
    } finally {
      closeSync(output);
    }
    // Keep readers on the old complete file until the new complete file exists.
    renameSync(temporary, target);
    if (readFileSync(target, "utf8") !== next) {
      throw new Error("Progress readback differs. Inspect the document before retrying.");
    }
  } finally {
    try {
      if (existsSync(temporary)) unlinkSync(temporary);
    } finally {
      closeSync(descriptor);
      unlinkSync(lock);
    }
  }
}

function main() {
  const [agent, option, input, ...extra] = process.argv.slice(2);
  if (option !== "--input" || !input || extra.length) {
    throw new Error("Usage: node scripts/collaboration/update-progress.mjs <codex|claude> --input <note.md>");
  }
  if (!lstatSync(path.join(canonicalRoot, ".git")).isDirectory()) {
    throw new Error("Run the helper from the canonical checkout, not a worktree copy.");
  }
  const notes = realpathSync(path.join(canonicalRoot, "docs/development/collaboration/notes"));
  const source = realpathSync(path.resolve(canonicalRoot, input));
  const relative = path.relative(notes, source);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error("The input must be a retained note inside the canonical notes directory.");
  }
  const stat = lstatSync(source);
  if (!stat.isFile() || stat.size > 20000 || path.extname(source).toLowerCase() !== ".md") {
    throw new Error("Use a Markdown note of at most 20000 bytes.");
  }
  updateProgress(canonicalRoot, agent, readFileSync(source, "utf8"));
  process.stdout.write(`Updated ${agent} progress and verified the saved document.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
