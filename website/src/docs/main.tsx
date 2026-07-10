// Dedicated entry for the migrated docs content pages. The 5 docs `.html`
// files load THIS instead of the shared App entry, so they render through the
// new DocsLayout without touching the central App router (cli-login precedent).
// The docs-home ("/") still comes through App -> DocsHome.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../index.css";
import { DocsHome } from "@/docs/docs";
import { DocsLayout } from "@/docs/DocsLayout";
import { pageBySlug } from "@/docs/registry";

function slugFromPath(pathname: string): string {
  return pathname
    .replace(/\.html$/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function DocsApp() {
  const slug = slugFromPath(window.location.pathname);
  const page = slug ? pageBySlug(slug) : undefined;
  if (!page) return <DocsHome />;
  return <DocsLayout page={page} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocsApp />
  </StrictMode>,
);
