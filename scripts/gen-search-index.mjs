#!/usr/bin/env node
// Build-time static search index for the Soroq docs Cmd+K palette.
// Walks the typed content registry (website/src/docs/registry.ts) and writes
// website/public/search-index.json. NO serverless function is involved.
//
// The registry is TypeScript importing `@/lib/productConstants`, so we transpile
// both files with the TypeScript compiler (a devDependency) into temp ESM,
// rewrite the single alias import to a relative path, dynamic-import, and walk.

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "website", "src");
const OUT = join(ROOT, "website", "public", "search-index.json");

const COMPILER = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
};

function transpile(source) {
  return ts.transpileModule(source, { compilerOptions: COMPILER }).outputText;
}

async function loadRegistry() {
  const tmp = mkdtempSync(join(tmpdir(), "soroq-search-"));

  // productConstants: pure TS, no imports.
  const constantsSrc = readFileSync(join(SRC, "lib", "productConstants.ts"), "utf8");
  writeFileSync(join(tmp, "productConstants.mjs"), transpile(constantsSrc));

  // registry: rewrite the one alias import to the transpiled sibling, then
  // transpile (type-only `./types` import is erased by the compiler).
  let registrySrc = readFileSync(join(SRC, "docs", "registry.ts"), "utf8");
  registrySrc = registrySrc.replace(
    /["']@\/lib\/productConstants["']/g,
    '"./productConstants.mjs"',
  );
  const registryPath = join(tmp, "registry.mjs");
  writeFileSync(registryPath, transpile(registrySrc));

  return import(pathToFileURL(registryPath).href);
}

function sectionText(section) {
  const parts = [section.heading];
  if (section.intro) parts.push(section.intro);
  if (section.output) parts.push(section.output);
  if (section.next) parts.push(section.next);
  for (const c of section.commands ?? []) parts.push(c);
  for (const t of section.codeTabs ?? []) parts.push(t.code);
  for (const e of section.env ?? []) parts.push(`${e.name} ${e.note}`);
  for (const c of section.callouts ?? []) parts.push(`${c.title ?? ""} ${c.body}`);
  for (const r of section.rows ?? []) parts.push(`${r.term} ${r.detail}`);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

async function main() {
  const { docRegistry, anchorFor } = await loadRegistry();
  const entries = [];

  for (const page of docRegistry) {
    // one page-level entry (summary is highly searchable)
    entries.push({
      slug: page.slug,
      title: page.title,
      group: page.group,
      platform: page.platform,
      heading: page.title,
      anchor: page.sections[0]?.anchor ?? "",
      text: `${page.summary} ${Object.values(page.metadata ?? {}).join(" ")}`,
    });
    for (const section of page.sections) {
      entries.push({
        slug: page.slug,
        title: page.title,
        group: page.group,
        platform: page.platform ?? section.platform,
        heading: section.heading,
        anchor: section.anchor || anchorFor(section.heading),
        text: sectionText(section),
      });
    }
  }

  writeFileSync(OUT, JSON.stringify(entries));
  console.log(`search index: ${entries.length} entries -> ${OUT.replace(ROOT + "/", "")}`);
}

main().catch((err) => {
  console.error("search index generation failed:", err);
  process.exit(1);
});
