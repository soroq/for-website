// WHAT THE CONSOLE KNOWS, AND WHEN IT ASKS.
//
//   at sign-in       control-plane health, product readiness, apps, every release (for platforms)
//   apps loaded      device analytics for each app (up to 40), so the sidebar and app cards show health
//   app opened       that app's patches (every channel)
//   patch opened     that patch's device health (patch details and rollback)
//   refresh          all of the above again, keeping what is on screen until the new answers arrive
//
// Raw answers are parsed once into the typed model; screens read only the parsed values.

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildAnalyticsView, type AnalyticsView } from "@/operator/analytics";
import type { ApiState, JsonRecord } from "@/operator/types";
import { errorMessage } from "./api";
import { parseApps, parsePatches, parseReleases, type App, type Patch, type Release } from "./model";
import type { ConsoleRoute } from "./route";
import type { OperatorAuth } from "./useOperatorAuth";
import { idleState, useResource } from "./useResource";

const FLEET_LIMIT = 40;

export function useConsoleData(auth: OperatorAuth, route: ConsoleRoute) {
  const { api, signedIn } = auth;
  const health = useResource<JsonRecord>();
  const product = useResource<JsonRecord>();
  const appsRes = useResource<unknown>();
  const releasesRes = useResource<unknown>();
  const patchesRes = useResource<unknown>();
  const patchHealth = useResource<JsonRecord>();
  const rollbackRes = useResource<JsonRecord>();
  const [patchesFor, setPatchesFor] = useState("");
  const [patchHealthFor, setPatchHealthFor] = useState("");
  const [analytics, setAnalytics] = useState<Record<string, ApiState<JsonRecord>>>({});

  const loadAnalytics = useCallback(
    async (appId: string) => {
      setAnalytics((prev) => ({
        ...prev,
        [appId]: { status: "loading", data: prev[appId]?.data ?? null, error: null, receivedAt: prev[appId]?.receivedAt },
      }));
      try {
        const data = await api.analytics(appId);
        setAnalytics((prev) => ({ ...prev, [appId]: { status: "ready", data, error: null, receivedAt: new Date().toISOString() } }));
      } catch (error) {
        setAnalytics((prev) => ({ ...prev, [appId]: { status: "error", data: null, error: errorMessage(error) } }));
      }
    },
    [api],
  );

  const loadWorkspace = useCallback(
    (keepData: boolean) => {
      void health.load((signal) => api.healthz(signal), { keepData });
      void product.load((signal) => api.productReadiness(signal), { keepData });
      void appsRes.load((signal) => api.apps(signal), { keepData });
      void releasesRes.load((signal) => api.releases(signal), { keepData });
    },
    // The resource handles are stable; only the api changes identity (never, in practice).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api],
  );

  // Sign-in and sign-out.
  useEffect(() => {
    if (signedIn) {
      loadWorkspace(false);
      return;
    }
    for (const r of [health, product, appsRes, releasesRes, patchesRes, patchHealth, rollbackRes]) r.reset();
    setAnalytics({});
    setPatchesFor("");
    setPatchHealthFor("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const apps: App[] = useMemo(
    () => parseApps(appsRes.state.data).sort((a, b) => a.name.localeCompare(b.name)),
    [appsRes.state.data],
  );
  const allReleases: Release[] = useMemo(() => parseReleases(releasesRes.state.data), [releasesRes.state.data]);

  // Device analytics for every app the operator can see, once.
  const appIdsKey = apps.map((a) => a.id).join(",");
  useEffect(() => {
    if (!signedIn || !appIdsKey) return;
    for (const id of appIdsKey.split(",").slice(0, FLEET_LIMIT)) {
      if (!analytics[id]) void loadAnalytics(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, appIdsKey]);

  // The open app's patches.
  useEffect(() => {
    if (!signedIn || !route.appId || patchesFor === route.appId) return;
    setPatchesFor(route.appId);
    void patchesRes.load((signal) => api.patches(route.appId, signal));
    if (!analytics[route.appId]) void loadAnalytics(route.appId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, route.appId]);

  // The open patch's device health.
  const wantsPatchHealth = route.tab === "health" || route.tab === "rollback";
  useEffect(() => {
    if (!signedIn || !wantsPatchHealth || !route.patchId || patchHealthFor === route.patchId) return;
    setPatchHealthFor(route.patchId);
    rollbackRes.reset();
    void patchHealth.load((signal) => api.patchHealth(route.patchId, signal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, wantsPatchHealth, route.patchId]);

  const refresh = useCallback(() => {
    loadWorkspace(true);
    if (route.appId) {
      setPatchesFor(route.appId);
      void patchesRes.load((signal) => api.patches(route.appId, signal), { keepData: true });
    }
    for (const id of Object.keys(analytics)) void loadAnalytics(id);
    if (wantsPatchHealth && route.patchId) {
      setPatchHealthFor(route.patchId);
      void patchHealth.load((signal) => api.patchHealth(route.patchId, signal), { keepData: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadWorkspace, route.appId, route.patchId, wantsPatchHealth, analytics, loadAnalytics, api]);

  const rollback = useCallback(
    async (patchId: string, appId: string) => {
      const result = await rollbackRes.load(() => api.rollback(patchId));
      if (!result) return false;
      // What changed: the patch list, the patch's own health, and the app's analytics.
      void patchesRes.load((signal) => api.patches(appId, signal), { keepData: true });
      setPatchHealthFor(patchId);
      void patchHealth.load((signal) => api.patchHealth(patchId, signal), { keepData: true });
      void loadAnalytics(appId);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, loadAnalytics],
  );

  const appPatches: Patch[] = useMemo(
    () => (patchesFor === route.appId ? parsePatches(patchesRes.state.data).filter((p) => !p.appId || p.appId === route.appId) : []),
    [patchesRes.state.data, patchesFor, route.appId],
  );
  const appReleases: Release[] = useMemo(
    () => allReleases.filter((r) => r.appId === route.appId),
    [allReleases, route.appId],
  );
  const platformsByApp = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of allReleases) {
      if (!map.has(r.appId)) map.set(r.appId, new Set());
      map.get(r.appId)!.add(r.platform);
    }
    return map;
  }, [allReleases]);

  const views = useMemo(() => {
    const out: Record<string, AnalyticsView> = {};
    for (const [id, state] of Object.entries(analytics)) if (state.status !== "idle") out[id] = buildAnalyticsView(state);
    return out;
  }, [analytics]);

  const loading =
    appsRes.state.status === "loading" ||
    releasesRes.state.status === "loading" ||
    patchesRes.state.status === "loading";
  const receivedAt = appsRes.state.receivedAt;

  return {
    health: health.state,
    product: product.state,
    appsState: appsRes.state,
    releasesState: releasesRes.state,
    patchesState: patchesFor === route.appId ? patchesRes.state : idleState<unknown>(),
    patchHealth: patchHealthFor === route.patchId ? patchHealth.state : idleState<JsonRecord>(),
    patchHealthFor,
    rollbackState: rollbackRes.state,
    analytics,
    views,
    apps,
    allReleases,
    appReleases,
    appPatches,
    platformsByApp,
    loading,
    receivedAt,
    refresh,
    loadAnalytics,
    rollback,
    resetRollback: rollbackRes.reset,
  };
}

export type ConsoleData = ReturnType<typeof useConsoleData>;
