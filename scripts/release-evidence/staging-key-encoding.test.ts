import { describe, expect, it } from "vitest";
import { checkerModule, strongSecretNames, validEnvironment } from "./check-staging-runtime-config.test-helpers";

describe("staging key encoding compatibility", () => {
  it("accepts canonical Base64 and Base64url without changing key text", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    for (const encoding of ["base64", "base64url"] as const) {
      for (const size of [32, 33, 48]) {
        const environment = validEnvironment();
        strongSecretNames.forEach((name, index) => {
          environment[name] = Buffer.alloc(size, 251 - index).toString(encoding);
        });
        const before = { ...environment };
        expect(checkStagingRuntimeConfig(environment).codes).toEqual(["STAGING_RUNTIME_CONFIG_VALID"]);
        expect(environment).toEqual(before);
      }
    }
  });

  it("rejects weak, malformed, mixed-alphabet, and noncanonical keys", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    const canonical = Buffer.alloc(32, 251).toString("base64");
    const invalid = [
      "", " ", Buffer.alloc(31, 251).toString("base64"),
      Buffer.alloc(31, 251).toString("base64url"),
      ` ${canonical}`, `${canonical}\n`, `${canonical}=`,
      canonical.slice(0, -1), canonical.replace("+", "-"),
      canonical.replace("=", "!"), canonical.slice(0, -2) + "t=",
    ];
    for (const name of strongSecretNames) {
      for (const value of invalid) {
        const environment = validEnvironment();
        environment[name] = value;
        const suffix = value.length === 0 || value !== value.trim() ? "REQUIRED" : "STRENGTH_INVALID";
        expect(checkStagingRuntimeConfig(environment).codes).toContain(`STAGING_RUNTIME_CONFIG_${name}_${suffix}`);
      }
    }
  });

  it("still rejects duplicate standard Base64 keys", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    const environment = validEnvironment();
    for (const name of strongSecretNames) environment[name] = Buffer.alloc(48, 251).toString("base64");
    expect(checkStagingRuntimeConfig(environment).codes).toContain("STAGING_RUNTIME_CONFIG_HMAC_KEYS_NOT_DISTINCT");
  });
});
