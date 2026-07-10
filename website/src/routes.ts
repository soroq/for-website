import type { ComponentType } from "react";

import { OperatorConsolePage } from "@/console/OperatorConsolePage";
import { MarketingHome, ProductPageRoute } from "@/marketing/components";
import { productPages } from "@/marketing/data";
import {
  isOperatorRoute,
  normalizePath,
  type ProductPageConfig,
} from "@/shared/pageTypes";

export type Surface = "marketing" | "docs" | "console";

export type RouteEntry = {
  path: string;
  htmlEntry: string;
  surface: Surface;
  component: ComponentType<any> | null;
};

// Single source of truth for the build inputs (see vite.config.ts). Three
// entrypoints exist: the shared App (`src/main.tsx`) for marketing + the docs
// home; the docs system (`src/docs/main.tsx`) for the 5 migrated docs content
// pages, which render through DocsLayout and never touch App; and cli-login
// (`src/cli-login/main.tsx`). `component: null` marks entries that App does not
// resolve. The clean URL for each docs page drops `.html` (vercel.json rewrites
// `/getting-started` -> `/getting-started.html`, etc.).
export const routes: RouteEntry[] = [
  { path: "/", htmlEntry: "index.html", surface: "marketing", component: MarketingHome },
  { path: "/quickstart.html", htmlEntry: "quickstart.html", surface: "marketing", component: ProductPageRoute },
  { path: "/control-plane.html", htmlEntry: "control-plane.html", surface: "marketing", component: ProductPageRoute },
  { path: "/compatibility.html", htmlEntry: "compatibility.html", surface: "marketing", component: ProductPageRoute },
  { path: "/operator.html", htmlEntry: "operator.html", surface: "console", component: OperatorConsolePage },
  // Docs content pages: own entry (src/docs/main.tsx) -> DocsLayout.
  { path: "/getting-started.html", htmlEntry: "getting-started.html", surface: "docs", component: null },
  { path: "/cli.html", htmlEntry: "cli.html", surface: "docs", component: null },
  { path: "/android-quickstart.html", htmlEntry: "android-quickstart.html", surface: "docs", component: null },
  { path: "/ios-quickstart.html", htmlEntry: "ios-quickstart.html", surface: "docs", component: null },
  { path: "/troubleshooting.html", htmlEntry: "troubleshooting.html", surface: "docs", component: null },
  { path: "/cli-login.html", htmlEntry: "cli-login.html", surface: "console", component: null },
];

export type ResolvedRoute =
  | { kind: "home" }
  | { kind: "docs-home" }
  | { kind: "product"; page: ProductPageConfig }
  | { kind: "console" };

// The docs host. Vercel rewrites clean paths transparently, so on BOTH hosts
// `window.location.pathname === "/"` at the root — the ONLY way to tell the two
// experiences apart client-side is the hostname.
export const DOCS_HOST = "docs.soroq.dev";

export function isDocsHost(hostname?: string): boolean {
  return hostname === DOCS_HOST;
}

// Pathname-first resolution, with a load-bearing hostname branch for the root.
// Known product/docs paths still resolve by pathname on ANY host, so previews
// like `<preview>.vercel.app/getting-started` keep working. Only the ambiguous
// root ("/") is disambiguated by hostname: docs host -> docs home, else
// marketing home.
export function resolveRoute(pathname: string, hostname?: string): ResolvedRoute {
  const page = productPages.find(
    (candidate) =>
      normalizePath(candidate.path) === normalizePath(pathname) ||
      (candidate.key === "operator" && isOperatorRoute(pathname)),
  );

  if (page) {
    return page.key === "operator"
      ? { kind: "console" }
      : { kind: "product", page };
  }

  if (isDocsHost(hostname)) {
    return { kind: "docs-home" };
  }

  return { kind: "home" };
}
