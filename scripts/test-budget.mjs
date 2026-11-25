#!/usr/bin/env node
// Runs the unit suite N times. Fails if any run is over budget, any test fails,
// or a test's result differs between runs (flaky). Usage: node scripts/test-budget.mjs [runs] [budgetMs]
import { spawnSync } from "node:child_process";

const RUNS = +(process.argv[2] || 3), BUDGET = +(process.argv[3] || 2000);
const results = new Map(); const times = []; let failed = false;
for (let r = 0; r < RUNS; r++) {
  const t0 = process.hrtime.bigint();
  const p = spawnSync(process.execPath, ["--test", "--test-reporter=tap", "tests/"], { encoding: "utf8" });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6; times.push(ms);
  for (const m of p.stdout.matchAll(/^\s*(not ok|ok) \d+ - (.+)$/gm)) {
    const prev = results.get(m[2]); results.set(m[2], prev ? (prev === m[1] ? prev : "FLAKY") : m[1]);
  }
  if (p.status !== 0) failed = true;
}
const flaky = [...results].filter(([, v]) => v === "FLAKY").map(([k]) => k);
const bad = [...results].filter(([, v]) => v === "not ok").map(([k]) => k);
const worst = Math.max(...times);
console.log(`${results.size} tests × ${RUNS} runs · wall ${times.map(t => t.toFixed(0) + "ms").join(", ")} · budget ${BUDGET}ms`);
if (flaky.length) console.error("FLAKY:\n  " + flaky.join("\n  "));
if (bad.length) console.error("FAILING:\n  " + bad.join("\n  "));
if (worst > BUDGET) console.error(`TOO SLOW: slowest run ${worst.toFixed(0)}ms > ${BUDGET}ms budget`);
process.exit(failed || flaky.length || bad.length || worst > BUDGET ? 1 : 0);
