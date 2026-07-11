import { useEffect } from "react";

import type { ResolvedRoute } from "@/routes";
import { normalizePath, type ProductPageKey } from "@/shared/pageTypes";

// Each page declares ONE canonical host so the two host experiences are not
// indexed as duplicate SEO surfaces. Docs live under docs.soroq.dev; everything
// else is canonical on soroq.dev. Marketing/docs `.html` entries already carry
// per-page <title>s; the ONLY page that cannot be made static is the docs home,
// because it shares index.html with the marketing home and is disambiguated at
// runtime by hostname — so we override its title + description here too.
const MARKETING_ORIGIN = "https://soroq.dev";
const DOCS_ORIGIN = "https://docs.soroq.dev";
const CONSOLE_ORIGIN = "https://console.soroq.dev";

const DOCS_PAGE_KEYS = new Set<ProductPageKey>([
  "getting-started",
  "cli",
  "android-quickstart",
  "ios-quickstart",
  "troubleshooting",
]);

const DOCS_HOME_TITLE = "Soroq | Docs";
const DOCS_HOME_DESCRIPTION =
  "Soroq docs: install the CLI, run the Android and iOS hard-OTA quickstarts, and troubleshoot base-to-patch-to-rollback flows.";
const CONSOLE_TITLE = "Soroq | Console";
const CONSOLE_DESCRIPTION =
  "Sign in to the Soroq operator console to inspect releases, patch health, staged rollouts, and rollback state.";

type HeadMeta = { canonical: string; title?: string; description?: string };

export function headForRoute(route: ResolvedRoute): HeadMeta {
  switch (route.kind) {
    case "docs-home":
      return {
        canonical: `${DOCS_ORIGIN}/`,
        title: DOCS_HOME_TITLE,
        description: DOCS_HOME_DESCRIPTION,
      };
    case "console":
      return {
        canonical: `${CONSOLE_ORIGIN}/`,
        title: CONSOLE_TITLE,
        description: CONSOLE_DESCRIPTION,
      };
    case "product": {
      const path = normalizePath(route.page.path);
      const origin = DOCS_PAGE_KEYS.has(route.page.key)
        ? DOCS_ORIGIN
        : MARKETING_ORIGIN;
      return { canonical: `${origin}${path}` };
    }
    case "home":
    default:
      return { canonical: `${MARKETING_ORIGIN}/` };
  }
}

// Applies the per-route canonical link (and, for the docs home only, the
// title/description) to <head>. Static `.html` <title>s are left untouched.
export function useCanonicalHead(route: ResolvedRoute): void {
  const { canonical, title, description } = headForRoute(route);

  useEffect(() => {
    let link = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;

    if (title) {
      document.title = title;
    }
    if (description) {
      const meta = document.head.querySelector<HTMLMetaElement>(
        'meta[name="description"]',
      );
      if (meta) {
        meta.content = description;
      }
    }
  }, [canonical, title, description]);
}
