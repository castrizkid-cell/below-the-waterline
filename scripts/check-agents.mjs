#!/usr/bin/env node
// Agent-routing gate: the written routing rules exist and point at agents that exist with safe settings.
// (Live latency tests would call Claude from CI, which is billed, so those stay in the manual smoke test.)
import { readFileSync, readdirSync, existsSync } from "node:fs";
const root = new URL("..", import.meta.url).pathname;
const md = readFileSync(root + "CLAUDE.md", "utf8");
const BUILTIN = ["Explore", "Plan", "general-purpose"];
const custom = existsSync(root + ".claude/agents") ? readdirSync(root + ".claude/agents").filter(f => f.endsWith(".md")) : [];
const agents = Object.fromEntries(custom.map(f => {
  const src = readFileSync(root + ".claude/agents/" + f, "utf8"), fm = (src.match(/^---\n([\s\S]*?)\n---/) || [])[1] || "";
  const get = k => (fm.match(new RegExp(`^${k}:\\s*(.+)$`, "m")) || [])[1]?.trim();
  return [get("name"), { tools: (get("tools") || "").split(/,\s*/), model: get("model"), description: get("description") || "" }];
}));
const errs = [];
const table = md.slice(md.indexOf("## Agent routing"));
if (!table.includes("| Request | Route |")) errs.push("CLAUDE.md has no routing table");
const routed = [...table.matchAll(/`([\w-]+)`/g)].map(m => m[1]).filter(n => BUILTIN.includes(n) || n in agents || /lookup|agent/.test(n));
for (const n of new Set(routed)) if (!BUILTIN.includes(n) && !(n in agents)) errs.push(`routing names unknown agent "${n}"`);
// simple questions must route to a fast, read-only agent
const q = agents["quick-lookup"];
if (!q) errs.push("missing .claude/agents/quick-lookup.md for one-sentence questions");
else {
  if (q.tools.some(t => /Edit|Write|Bash|Agent/.test(t))) errs.push("quick-lookup must be read-only");
  if (!/haiku/.test(q.model || "")) errs.push("quick-lookup should use the fast model (haiku)");
  if (!/one-sentence|one or two sentences/i.test(q.description)) errs.push("quick-lookup description must say it is for one-sentence questions");
}
if (!/\*\*refuse\*\*/.test(table)) errs.push("routing must say cloud/billed work is refused");
if (!/in parallel/i.test(table)) errs.push("routing must say independent tasks run in parallel");
if (errs.length) { console.error("Agent routing check failed:\n  " + errs.join("\n  ")); process.exit(1); }
console.log(`Agent routing OK: ${Object.keys(agents).length} custom agent(s), ${new Set(routed).size} routes documented.`);
