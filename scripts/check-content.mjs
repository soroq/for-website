#!/usr/bin/env node
// Content / version guard for the Soroq website.
// Scans website/**/*.{ts,tsx,html} and fails the build (exit 1) on stale or
// forbidden content. No external dependencies. Run before tsc/vite in `build`.
//
// Source of truth for current values: website/src/lib/productConstants.ts
//   cli v0.2.2 | soroq_flutter 0.2.3 | soroq_sdk 0.1.6

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIR = join(ROOT, "website");
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".vercel"]);
const SCAN_EXT = new Set([".ts", ".tsx", ".html"]);

const NEGATION = /\b(no|not|isn't|isnt|without|never)\b/i;
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*|<!--|#)/;

// Each rule: { name, ext?, blocking (default true), test(line) -> bool }
// `ext` optionally restricts a rule to a subset of extensions.
const RULES = [
  // --- Stale versions (protected: never weaken) ------------------------------
  {
    name: "stale version",
    test: (l) =>
      /0\.1\.12(?!\d)/.test(l) ||
      /0\.1\.16(?!\d)/.test(l) ||
      /0\.1\.3(?!\d)/.test(l) ||
      /soroq_flutter\s+0\.1\./.test(l) ||
      /soroq_sdk\s+0\.1\.[0-5](?!\d)/.test(l) ||
      /\bcli-v?[0-9]/.test(l) || // old CLI release-tag format (cli-0.2.x / cli-v...)
      /\bv0\.2\.1(?!\d)/.test(l), // current CLI is v0.2.2
  },
  // --- Private repo links (protected) ---------------------------------------
  {
    name: "private-repo link",
    test: (l) => /github\.com\/soroq\/soroq(?![\w-])/.test(l),
  },
  // --- Local absolute paths -------------------------------------------------
  {
    name: "local path",
    comments: false,
    test: (l) => /\/Users\//.test(l) || /\/home\//.test(l),
  },
  // --- Bad guidance ---------------------------------------------------------
  {
    name: "bad guidance",
    test: (l) =>
      /dependency_overrides/.test(l) ||
      /SOROQ_FLUTTER_BIN/.test(l) ||
      /SOROQ_CONTROL_PLANE_OPERATOR_TOKEN/.test(l),
  },
  // --- Prohibited claims (protected; negation on the line clears it) ---------
  {
    name: "prohibited claim",
    negatable: true,
    test: (l) =>
      (/app ?store/i.test(l) && /(approv|production|ready)/i.test(l)) ||
      /play ?store production/i.test(l) ||
      /shorebird/i.test(l) ||
      /arbitrary[ -]?dart/i.test(l) ||
      /\bparity\b/i.test(l),
  },
  // --- Internal / meta copy -------------------------------------------------
  {
    name: "internal/meta copy",
    test: (l) =>
      /package-post-publish-proof/.test(l) ||
      /should make it obvious/i.test(l) ||
      /launch page should/i.test(l),
  },
  // --- .html link targets in JSX/TS: deferred migration -> non-blocking ------
  {
    name: ".html link (deferred: migrate to clean URL)",
    ext: new Set([".ts", ".tsx"]),
    blocking: false,
    test: (l) => /(href|to)="\/[^"]*\.html"/.test(l),
  },
];

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(extname(full))) out.push(full);
  }
}

const files = [];
walk(SCAN_DIR, files);

const violations = [];
const warnings = [];

for (const file of files) {
  const ext = extname(file);
  const lines = readFileSync(file, "utf8").split("\n");
  const rel = relative(ROOT, file);
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.ext && !rule.ext.has(ext)) continue;
      if (rule.comments === false && COMMENT_LINE.test(line)) continue;
      if (!rule.test(line)) continue;
      if (rule.negatable && NEGATION.test(line)) continue;
      const rec = {
        loc: `${rel}:${i + 1}`,
        rule: rule.name,
        text: line.trim().slice(0, 120),
      };
      if (rule.blocking === false) warnings.push(rec);
      else violations.push(rec);
    }
  });
}

for (const w of warnings) {
  console.warn(`WARN  ${w.loc}  [${w.rule}]  ${w.text}`);
}
for (const v of violations) {
  console.error(`FAIL  ${v.loc}  [${v.rule}]  ${v.text}`);
}

if (warnings.length > 0) {
  console.warn(`content guard: ${warnings.length} deferred warning(s) (non-blocking)`);
}

if (violations.length > 0) {
  console.error(`${violations.length} violations`);
  process.exit(1);
}

console.log("content guard: clean");
process.exit(0);
