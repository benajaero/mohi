import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

describe("perf targets", () => {
  it("loads diff target config", () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
    const targetsPath = resolve(repoRoot, "benchmarks", "perf-targets.json");
    const targets = JSON.parse(readFileSync(targetsPath, "utf-8")) as {
      diff_avg_ms: number;
      patch_p95_kb: number;
    };

    expect(targets.diff_avg_ms).toBeTypeOf("number");
    expect(targets.patch_p95_kb).toBeTypeOf("number");
  });
});
