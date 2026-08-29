import { describe, expect, it } from "vitest";
import { stepUpGrantInputSchema } from "./step-up";

describe("step-up request boundary", () => {
  it("accepts only UUID grant identifiers", () => {
    expect(stepUpGrantInputSchema.safeParse({ grantId: "not-a-grant" }).success).toBe(false);
    expect(stepUpGrantInputSchema.safeParse({ grantId: "00000000-0000-4000-8000-000000000001" }).success).toBe(true);
  });
});
