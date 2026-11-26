#!/usr/bin/env node
// The local gate (CI is off on GitHub). Runs every check the CI used to run, stops at the first failure.
// Usage: node scripts/verify.mjs [base-ref]   (base-ref for commit lint, default origin/main)
import { spawnSync } from "node:child_process";
const base = process.argv[2] || "origin/main";
const has = ref => spawnSync("git", ["rev-parse", "--verify", "--quiet", ref], { stdio: "ignore" }).status === 0;
const steps = [
  ["unit tests ×3, flaky check, 2 s budget", "node", ["scripts/test-budget.mjs", "3", "2000"]],
  ["module boundaries", "node", ["scripts/check-boundaries.mjs"]],
  ["agent routing rules", "node", ["scripts/check-agents.mjs"]],
  ["release config", "node", ["scripts/check-release.mjs"]],
];
if (has(base)) steps.push([`commit lint (${base}..HEAD)`, "npx", ["--no-install", "commitlint", "--from", base, "--to", "HEAD"]]);
const t0 = Date.now();
for (const [name, cmd, args] of steps) {
  process.stdout.write(`• ${name} … `);
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) { console.log("FAILED\n" + (r.stdout || "") + (r.stderr || "")); process.exit(1); }
  console.log("ok");
}
console.log(`verify passed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
