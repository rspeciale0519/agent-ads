import { describe, expect, it } from "vitest";
import { withRefreshLock } from "./refresh-lock";

describe("refresh lock", () => {
  it("serializes refresh work without retaining the secret as a map key", async () => {
    const events: string[] = [];
    let releaseFirst!: () => void;
    const first = withRefreshLock("same-refresh-token", async () => {
      events.push("first-start");
      await new Promise<void>((resolve) => { releaseFirst = resolve; });
      events.push("first-end");
      return "first";
    });
    const second = withRefreshLock("same-refresh-token", async () => {
      events.push("second");
      return "second";
    });
    await Promise.resolve();
    expect(events).toEqual(["first-start"]);
    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
    expect(events).toEqual(["first-start", "first-end", "second"]);
  });
});
