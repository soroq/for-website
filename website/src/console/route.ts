// WHERE THE OPERATOR IS, AS A URL.
//
// Every screen is addressable: the open app, section, release and patch live in the query string, so a
// link or a reload lands on the same screen and the browser's Back and Forward buttons move between
// screens. The format is the one the console has always used (?app_id=…&tab=…&release_id=…&patch=…), so
// existing links keep working. Parameters the console does not own (the CLI login handshake) are left
// exactly as they are.

import { useCallback, useEffect, useState } from "react";
import type { OperatorTab } from "@/operator/types";

export const CONSOLE_TABS: readonly OperatorTab[] = [
  "overview",
  "analytics",
  "releases",
  "patches",
  "health",
  "rollback",
  "ownership",
  "developer",
  "billing",
  "trust",
] as const;

export type ConsoleRoute = {
  tab: OperatorTab;
  appId: string;
  /** Open release (within the releases section). */
  releaseId: string;
  /** Open patch (patch details, or the rollback target). */
  patchId: string;
};

export const HOME_ROUTE: ConsoleRoute = { tab: "overview", appId: "", releaseId: "", patchId: "" };

const OWNED = ["app_id", "tab", "release_id", "patch", "patch_id", "runtime_id", "channel"];

export function parseRoute(search: string): ConsoleRoute {
  const params = new URLSearchParams(search);
  const tab = params.get("tab") ?? "";
  return {
    tab: (CONSOLE_TABS as readonly string[]).includes(tab) ? (tab as OperatorTab) : "overview",
    appId: (params.get("app_id") ?? "").trim(),
    releaseId: (params.get("release_id") ?? "").trim(),
    patchId: (params.get("patch") ?? params.get("patch_id") ?? "").trim(),
  };
}

/** The query string for `route`, keeping every parameter the console does not own from `current`. */
export function routeToSearch(route: ConsoleRoute, current = ""): string {
  const params = new URLSearchParams(current);
  for (const key of OWNED) params.delete(key);
  if (route.appId) params.set("app_id", route.appId);
  if (route.tab !== "overview") params.set("tab", route.tab);
  if (route.releaseId) params.set("release_id", route.releaseId);
  if (route.patchId) params.set("patch", route.patchId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function sameRoute(a: ConsoleRoute, b: ConsoleRoute): boolean {
  return a.tab === b.tab && a.appId === b.appId && a.releaseId === b.releaseId && a.patchId === b.patchId;
}

/**
 * The current route, and `navigate` to move: a new history entry by default, or `replace` for a change
 * that is not a step the operator would want Back to undo (clearing a stale parameter, for example).
 */
export function useConsoleRoute() {
  const [route, setRoute] = useState<ConsoleRoute>(() => parseRoute(window.location.search));

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: ConsoleRoute, options: { replace?: boolean } = {}) => {
    const url = `${window.location.pathname}${routeToSearch(next, window.location.search)}`;
    if (options.replace) window.history.replaceState(null, "", url);
    else if (url !== `${window.location.pathname}${window.location.search}`) window.history.pushState(null, "", url);
    setRoute((prev) => (sameRoute(prev, next) ? prev : next));
  }, []);

  return { route, navigate };
}
