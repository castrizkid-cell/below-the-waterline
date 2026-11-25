#!/usr/bin/env node
// Module-boundary gate (runs in CI, not a unit test: it reads source files).
// Rules:
//  1. js/*-ui.mjs are UI modules. js/dom.mjs is the only browser adapter. Everything else in js/ is PURE.
//  2. PURE modules never reference browser or nondeterministic globals.
//  3. PURE modules import only PURE modules. UI modules import PURE modules and dom.mjs, never another UI module.
//  4. No import cycles.
//  5. No module runs code at import time (no top-level calls), except main.mjs, the page entry point.
//  6. Every module in js/ is imported by at least one test in tests/.
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const JS = join(ROOT, "js"), TESTS = join(ROOT, "tests");
const ENTRY = "main.mjs", ADAPTER = "dom.mjs";
const FORBIDDEN = /\b(document|window|navigator|localStorage|matchMedia|requestAnimationFrame|performance\.now|Date\.now|Math\.random|fetch|setTimeout|setInterval|Path2D|DOMPoint)\b/;

const files = readdirSync(JS).filter(f => f.endsWith(".mjs"));
const kind = f => f === ENTRY ? "entry" : f === ADAPTER ? "adapter" : f.endsWith("-ui.mjs") ? "ui" : "pure";
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
const importsOf = src => [...src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+["'](\.\/[^"']+)["']/gm)].map(m => basename(m[1]));

const errors = [], graph = {};
for (const f of files) {
  const src = readFileSync(join(JS, f), "utf8"), code = strip(src), k = kind(f);
  graph[f] = importsOf(src);
  if (k === "pure") {
    code.split("\n").forEach((line, i) => { const m = line.match(FORBIDDEN); if (m) errors.push(`${f}:${i + 1} pure module uses "${m[1]}"`); });
  }
  for (const dep of graph[f]) {
    const dk = kind(dep);
    if (!files.includes(dep)) errors.push(`${f} imports missing module ${dep}`);
    if (k === "pure" && dk !== "pure") errors.push(`${f} (pure) imports ${dep} (${dk})`);
    if (k === "ui" && dk === "ui") errors.push(`${f} (ui) imports another ui module ${dep}`);
    if (k === "adapter" && dk !== "pure") errors.push(`${f} (adapter) imports ${dep} (${dk})`);
  }
  if (k !== "entry") {
    code.split("\n").forEach((line, i) => { if (/^[A-Za-z_$][\w$.]*\s*\(.*\)\s*;?\s*$/.test(line) && !/^(if|for|while|switch|export|import|function)\b/.test(line)) errors.push(`${f}:${i + 1} runs code at import: ${line.trim()}`); });
  }
}
// cycles
const state = {};
const visit = (f, path) => {
  if (state[f] === 2) return; if (state[f] === 1) { errors.push(`import cycle: ${[...path, f].join(" -> ")}`); return; }
  state[f] = 1; (graph[f] || []).forEach(d => visit(d, [...path, f])); state[f] = 2;
};
files.forEach(f => visit(f, []));
// coverage: every non-entry module imported by a test
const testSrc = readdirSync(TESTS).filter(f => f.endsWith(".test.mjs")).map(f => readFileSync(join(TESTS, f), "utf8")).join("\n");
for (const f of files) if (kind(f) !== "entry" && !testSrc.includes(`/js/${f}"`)) errors.push(`${f} has no unit test importing it`);

const counts = files.reduce((a, f) => (a[kind(f)] = (a[kind(f)] || 0) + 1, a), {});
if (errors.length) { console.error(`Module boundaries: ${errors.length} violation(s)\n  ` + errors.join("\n  ")); process.exit(1); }
console.log(`Module boundaries OK: ${files.length} modules (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}), no cycles, all tested.`);
