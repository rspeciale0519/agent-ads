import { createHash } from "node:crypto";

const pending = new Map<string, Promise<void>>();

export async function withRefreshLock<T>(secret: string, operation: () => Promise<T>) {
  const key = createHash("sha256").update(secret, "utf8").digest("hex");
  const previous = pending.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  pending.set(key, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (pending.get(key) === queued) pending.delete(key);
  }
}
