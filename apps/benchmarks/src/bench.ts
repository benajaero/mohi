import { diffHtml } from "@mohi/diff";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const targetsPath = resolve(repoRoot, "benchmarks", "perf-targets.json");
const targets = JSON.parse(readFileSync(targetsPath, "utf-8")) as PerfTargets;

const cases = [
  { name: "counter", prev: fixtures.counterPrev, next: fixtures.counterNext },
  { name: "attrs", prev: fixtures.attrsPrev, next: fixtures.attrsNext }
];

const results = cases.map((benchmark) => runCase(benchmark.name, benchmark.prev, benchmark.next));

for (const result of results) {
  console.log(`${result.name}: ${result.ops} ops, ${result.avgMs.toFixed(3)} ms avg`);
}

const maxAvg = Math.max(...results.map((result) => result.avgMs));
if (maxAvg > targets.diff_avg_ms) {
  console.error(`Diff avg ms ${maxAvg.toFixed(3)} exceeds target ${targets.diff_avg_ms}`);
  process.exitCode = 1;
}

interface PerfTargets {
  diff_avg_ms: number;
  patch_p95_kb: number;
}

function runCase(name: string, prev: string, next: string): { name: string; avgMs: number; ops: number } {
  const iterations = 500;
  let total = 0;
  let ops = 0;
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    const result = diffHtml(prev, next);
    total += performance.now() - start;
    ops = result.ops.length;
  }
  return { name, avgMs: total / iterations, ops };
}

const fixtures = {
  counterPrev: `
    <main data-mohi-id="mohi-root">
      <h1 data-mohi-id="title">Mohi</h1>
      <button data-mohi-id="btn" class="a">Count: 0</button>
    </main>
  `,
  counterNext: `
    <main data-mohi-id="mohi-root">
      <h1 data-mohi-id="title">Mohi</h1>
      <button data-mohi-id="btn" class="a">Count: 1</button>
    </main>
  `,
  attrsPrev: `
    <section data-mohi-id="mohi-root">
      <div data-mohi-id="box" class="a" data-active="false">Box</div>
    </section>
  `,
  attrsNext: `
    <section data-mohi-id="mohi-root">
      <div data-mohi-id="box" class="b" data-active="true">Box</div>
    </section>
  `
};
