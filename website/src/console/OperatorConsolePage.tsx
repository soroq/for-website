// THE OPERATOR CONSOLE.
//
// This file only composes. The pieces, and where each decision lives:
//   useOperatorAuth    who is signed in (Firebase + the operator check), and the CLI login handshake
//   useConsoleRoute    which screen is open, as a URL (Back and Forward work; links are shareable)
//   useConsoleData     what the control plane said, and when to ask again
//   model.ts           server records parsed once into typed values
//   versions.ts        one row per store build: phones per platform, patches, health
//   rollback.ts        when the Roll back button may arm
//   pages/*            one component per screen

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateNotice } from "@/operator/components/ConsolePrimitives";
import {
  AppHeader,
  AppsHome,
  ConsoleSidebar,
  ConsoleTopBar,
  digestApp,
  type AppHealth,
  type AppSummary,
  type Crumb,
} from "@/operator/components/ConsoleShell";
import { OperatorAnalyticsPage } from "@/operator/components/OperatorAnalyticsPage";
import { ProductLayerTabPanel, isProductLayerTab } from "@/operator/components/ProductLayerTabs";
import { buildAnalyticsView } from "@/operator/analytics";
import { buildProductReadinessView } from "@/operator/productReadiness";
import type { OperatorTab } from "@/operator/types";
import { isOperatorRoute } from "@/shared/pageTypes";
import { HOME_ROUTE, useConsoleRoute, type ConsoleRoute } from "./route";
import { useConsoleData } from "./useConsoleData";
import { useOperatorAuth } from "./useOperatorAuth";
import { idleState } from "./useResource";
import { buildVersionRows, versionOfRelease, type VersionRow } from "./versions";
import { AppOverviewPage } from "./pages/AppOverviewPage";
import { PatchesPage, buildPatchRows } from "./pages/PatchesPage";
import { PatchDetailPage, RollbackPage } from "./pages/PatchPages";
import { ReleaseDetail, ReleasesPage } from "./pages/ReleasesPage";
import { CheckingSession, SignInScreen } from "./pages/SignInScreen";

const SECTION_LABELS: Record<OperatorTab, string> = {
  overview: "Overview",
  analytics: "Device health",
  releases: "Releases",
  patches: "Patches",
  health: "Patch",
  rollback: "Roll back",
  ownership: "Access",
  developer: "CLI setup",
  billing: "Plan",
  trust: "Security",
};

/** Answers older than this are flagged, so an operator does not act on a stale screen without knowing. */
const STALE_AFTER_MS = 2 * 60 * 1000;

export function OperatorConsolePage() {
  // Firebase sign-in is configured for "localhost"; send 127.0.0.1 there so local sign-in works.
  useEffect(() => {
    if (window.location.hostname === "127.0.0.1") {
      const url = new URL(window.location.href);
      url.hostname = "localhost";
      window.location.replace(url.toString());
    }
  }, []);

  const auth = useOperatorAuth();
  const { route, navigate } = useConsoleRoute();
  const data = useConsoleData(auth, route);
  const [appSearch, setAppSearch] = useState("");

  const summaries: AppSummary[] = useMemo(
    () =>
      data.apps.map((app) => {
        const view = data.views[app.id];
        const state = data.analytics[app.id];
        const settled = state && state.status !== "loading" && state.status !== "idle";
        const phonesThisWeek = view?.installs?.some((group) => group.active7d > 0) ?? false;
        return {
          id: app.id,
          name: app.name,
          owner: app.owner,
          platforms: [...(data.platformsByApp.get(app.id) ?? [])].filter((p) => p !== "other").sort(),
          analytics: state,
          view,
          inactive: Boolean(settled && view && !view.unavailable && !phonesThisWeek && view.totals.patches === 0),
        };
      }),
    [data.apps, data.views, data.analytics, data.platformsByApp],
  );
  const healthById: Record<string, AppHealth> = useMemo(
    () => Object.fromEntries(summaries.map((app) => [app.id, digestApp(app).health])),
    [summaries],
  );

  const app = summaries.find((s) => s.id === route.appId) ?? null;
  const view = route.appId ? data.views[route.appId] : undefined;
  const digest = digestApp(app ?? {});
  const versions: VersionRow[] = useMemo(
    () =>
      buildVersionRows({
        releases: data.appReleases,
        patches: data.appPatches,
        installs: view?.installs ?? null,
        delivery: view?.rows ?? [],
      }),
    [data.appReleases, data.appPatches, view],
  );
  const patchRows = useMemo(
    () => buildPatchRows(data.appPatches, data.appReleases, view?.rows ?? []),
    [data.appPatches, data.appReleases, view],
  );
  const openVersion = route.releaseId ? versionOfRelease(versions, route.releaseId) : null;
  const openPatchRow = route.patchId ? (patchRows.find((r) => r.patch.id === route.patchId) ?? null) : null;

  const go = (next: Partial<ConsoleRoute>) => navigate({ ...HOME_ROUTE, appId: route.appId, ...next });
  const openApp = (appId: string) => navigate({ ...HOME_ROUTE, appId });
  const openPatch = (patchId: string) => go({ tab: "health", patchId });
  const openRollback = (patchId: string) => go({ tab: "rollback", patchId });

  const isWorkspace = isProductLayerTab(route.tab);
  const crumbs: Crumb[] = isWorkspace
    ? [{ label: "Workspace" }, { label: SECTION_LABELS[route.tab] }]
    : [
        { label: "Apps", onClick: () => navigate(HOME_ROUTE) },
        ...(app ? [{ label: app.name, onClick: () => openApp(app.id) }] : []),
        ...(app && route.tab !== "overview" ? [{ label: SECTION_LABELS[route.tab], onClick: route.releaseId || route.patchId ? () => go({ tab: route.tab }) : undefined }] : []),
        ...(app && openVersion ? [{ label: openVersion.version }] : []),
        ...(app && route.tab === "health" && openPatchRow ? [{ label: `#${openPatchRow.patch.number}` }] : []),
      ];

  // The tab title names the screen, so several open tabs can be told apart.
  useEffect(() => {
    const parts = [
      route.tab !== "overview" || isWorkspace ? SECTION_LABELS[route.tab] : "",
      !isWorkspace && app ? app.name : "",
      "Soroq Console",
    ].filter(Boolean);
    document.title = parts.join(" · ");
  }, [route.tab, app, isWorkspace]);

  if (!isOperatorRoute(window.location.pathname) && window.location.hostname !== "console.soroq.dev") {
    return null;
  }
  if (auth.checking) return <CheckingSession />;
  if (!auth.signedIn) return <SignInScreen auth={auth} />;

  const ageMs = data.receivedAt ? Date.now() - Date.parse(data.receivedAt) : 0;
  const stale = !data.loading && ageMs > STALE_AFTER_MS;
  const statusText = data.loading
    ? "Refreshing…"
    : stale
      ? "May be out of date. Refresh"
      : data.receivedAt
        ? `Updated ${new Date(data.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "";
  const appsLoaded = data.appsState.status === "ready" || Boolean(data.appsState.data);
  const missingApp = Boolean(route.appId && appsLoaded && !app);
  const inventoryError = data.appsState.error || data.releasesState.error || "";

  const productView = buildProductReadinessView({
    product: data.product.data,
    appCount: data.apps.length,
    releaseCount: data.allReleases.length,
    patchCount: data.appPatches.length,
    rolledBackPatchCount: data.appPatches.filter((p) => p.rolledBack).length,
  });

  function renderAppSection(current: AppSummary) {
    const patchesLoading = data.patchesState.status === "loading" && !data.patchesState.data;
    switch (route.tab) {
      case "releases":
        if (route.releaseId) {
          return openVersion ? (
            <ReleaseDetail
              version={openVersion}
              patchRows={patchRows}
              onBack={() => go({ tab: "releases" })}
              onInspect={openPatch}
              onRollback={openRollback}
            />
          ) : data.releasesState.status === "ready" ? (
            <StateNotice tone="warning" message={`Release ${route.releaseId} is not one of ${current.name}'s releases.`} />
          ) : null;
        }
        return (
          <ReleasesPage
            versions={versions}
            patchRows={patchRows}
            loading={data.releasesState.status === "loading" && !data.releasesState.data}
            onOpenRelease={(releaseId) => go({ tab: "releases", releaseId })}
          />
        );
      case "patches":
        return (
          <PatchesPage
            rows={patchRows}
            versions={versions}
            loading={patchesLoading}
            error={data.patchesState.error ?? ""}
            onInspect={openPatch}
            onRollback={openRollback}
          />
        );
      case "health":
        return (
          <PatchDetailPage
            patchId={route.patchId}
            row={patchesLoading ? null : openPatchRow}
            health={data.patchHealth}
            onRollback={() => openRollback(route.patchId)}
            onOpenDeviceHealth={() => go({ tab: "analytics" })}
          />
        );
      case "rollback":
        return (
          <RollbackPage
            appId={current.id}
            appName={current.name}
            patchId={route.patchId}
            rows={patchRows}
            health={data.patchHealth}
            healthFor={data.patchHealthFor}
            rollbackState={data.rollbackState}
            signedIn={auth.signedIn}
            onChoose={(patchId) => navigate({ ...HOME_ROUTE, appId: current.id, tab: "rollback", patchId }, { replace: true })}
            onRollback={(patchId) => data.rollback(patchId, current.id)}
          />
        );
      default:
        return (
          <AppOverviewPage
            digest={digest}
            versions={versions}
            installsUnavailable={view?.installsUnavailable ?? ""}
            installsLoading={!view}
            onOpenDeviceHealth={() => go({ tab: "analytics" })}
            onOpenVersion={(row) => go({ tab: "releases", releaseId: row.releases[0]?.id ?? "" })}
            onOpenRollback={openRollback}
            onOpenReleases={() => go({ tab: "releases" })}
          />
        );
    }
  }

  return (
    <main className="operator-backdrop min-h-screen overflow-x-clip text-[#111111]">
      <section className="relative z-10 grid min-h-screen min-w-0 grid-cols-[minmax(0,1fr)] content-start lg:grid-cols-[260px_minmax(0,1fr)] lg:content-stretch">
        <ConsoleSidebar
          apps={summaries}
          appHealth={healthById}
          selectedAppId={app?.id ?? ""}
          operatorTab={route.tab}
          operatorEmail={auth.email}
          signedIn={auth.signedIn}
          configReady={auth.configReady}
          onGoHome={() => navigate(HOME_ROUTE)}
          onSelectApp={openApp}
          onSelectTab={(tab) => (isProductLayerTab(tab) ? navigate({ ...HOME_ROUTE, tab }) : go({ tab }))}
          onSignIn={() => void auth.signIn()}
          onSignOut={() => {
            void auth.signOut();
            navigate(HOME_ROUTE, { replace: true });
          }}
        />

        <div className="min-w-0 overflow-x-clip">
          <ConsoleTopBar
            crumbs={crumbs}
            apiState={data.health.status}
            statusText={statusText}
            statusStale={stale}
            canRefresh={auth.signedIn}
            refreshing={data.loading}
            onRefresh={data.refresh}
          />

          <section className="mx-auto grid min-w-0 max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-8 lg:py-8">
            {inventoryError ? <StateNotice tone="error" message={`The control plane could not be read: ${inventoryError}`} /> : null}
            {missingApp ? (
              <StateNotice tone="warning" message={`App ${route.appId} is not visible to ${auth.email}. Choose one of your apps.`} />
            ) : null}

            {isWorkspace ? (
              <>
                {data.product.error ? <StateNotice tone="error" message={data.product.error} /> : null}
                <ProductLayerTabPanel
                  activeTab={route.tab}
                  productState={data.product}
                  view={productView}
                  operatorEmail={auth.email}
                  signedIn={auth.signedIn}
                />
              </>
            ) : route.tab === "analytics" && app ? (
              <OperatorAnalyticsPage
                apps={summaries.map((s) => ({ id: s.id, name: s.name }))}
                selectedAppId={app.id}
                onSelectApp={(appId) => (appId ? navigate({ ...HOME_ROUTE, appId, tab: "analytics" }) : navigate(HOME_ROUTE))}
                state={data.analytics[app.id] ?? idleState()}
                view={buildAnalyticsView(data.analytics[app.id] ?? idleState())}
                canLoad={auth.signedIn}
                onRefresh={() => void data.loadAnalytics(app.id)}
                onOpenRollback={openRollback}
              />
            ) : !app ? (
              <AppsHome
                apps={summaries}
                loading={!appsLoaded}
                search={appSearch}
                onSearch={setAppSearch}
                onSelectApp={openApp}
                isAdmin={auth.isAdmin}
              />
            ) : (
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
                <AppHeader
                  app={app}
                  digest={digest}
                  section={route.tab === "overview" ? undefined : SECTION_LABELS[route.tab]}
                  actions={
                    route.tab === "overview" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 border-black/15 bg-white text-black hover:bg-[#f3f3f4]"
                        onClick={() => go({ tab: "rollback" })}
                      >
                        <RotateCcw className="size-4" />
                        Roll back a patch
                      </Button>
                    ) : null
                  }
                />
                {renderAppSection(app)}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
