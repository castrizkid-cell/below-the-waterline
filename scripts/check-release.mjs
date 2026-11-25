#!/usr/bin/env node
// Release check: release-please config is valid and the manifest version matches package.json.
import { readFileSync } from "node:fs";
const j = f => JSON.parse(readFileSync(new URL("../" + f, import.meta.url)));
const pkg = j("package.json"), man = j(".release-please-manifest.json"), cfg = j("release-please-config.json");
const errs = [];
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) errs.push(`package.json version "${pkg.version}" is not semver`);
if (man["."] !== pkg.version) errs.push(`manifest ${man["."]} != package.json ${pkg.version}`);
if (cfg["release-type"] !== "node" || !cfg.packages?.["."]) errs.push("release-please-config.json must define release-type node and package \".\"");
if (errs.length) { console.error("Release check failed:\n  " + errs.join("\n  ")); process.exit(1); }
console.log(`Release check OK: v${pkg.version}, release-please configured.`);
