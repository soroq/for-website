import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  CircleGauge,
  LayoutGrid,
  LockKeyhole,
  LogIn,
  LogOut,
  Package,
  RadioTower,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";

import { SoroqMark } from "@/components/SoroqMark";
import { Button } from "@/components/ui/button";
import type { AnalyticsView, InstallCount, InstallGroup, PatchDeliveryRow } from "../analytics";
import type { ApiState, JsonRecord, OperatorTab } from "../types";
import { CopyButton, HEALTH, REASON_EXPLAINED, healthOf, pct, rate, type Health } from "./OperatorAnalyticsPage";

// THE CONSOLE SHELL.
//
// One question organises every screen: are my updates healthy on real devices? The sidebar shows each
// app's health as a dot, the apps home shows a "delivery pulse" (one square per recent patch, coloured
// by what devices reported), and an app's overview opens on the same verdict the analytics page gives.

export type AppHealth = Health | "loading" | "unknown";

export type AppSummary = {
  id: string;
  name: string;
  platforms: string[];
  owner: string;
  analytics?: ApiState<JsonRecord>;
  view?: AnalyticsView;
};

export type AppDigest = {
  health: AppHealth;
  verdict: string;
  successRate: number | null;
  booted: number;
  failed: number;
  patches: number;
  releases: number;
  rolledBack: number;
  failing: PatchDeliveryRow[];
  pulse: PatchDeliveryRow[];
};

const PULSE_LENGTH = 24;

export function digestApp(app: Pick<AppSummary, "analytics" | "view">): AppDigest {
  const state = app.analytics;
  const view = app.view;
  const empty: AppDigest = {
    health: "unknown",
    verdict: "",
    successRate: null,
    booted: 0,
    failed: 0,
    patches: 0,
    releases: 0,
    rolledBack: 0,
    failing: [],
    pulse: [],
  };
  if (!state || state.status === "idle" || state.status === "loading" || !view) {
    return { ...empty, health: "loading", verdict: "Checking device reports…" };
  }
  if (view.unavailable) {
    return { ...empty, verdict: "Device reports could not be read" };
  }
  const rows = view.rows;
  const failing = rows.filter((row) => healthOf(row) === "failing");
  const releases = new Set(rows.map((row) => row.releaseId)).size;
  // Oldest on the left, newest on the right: the eye reads a pulse left to right like a timeline.
  const pulse = [...rows]
    .sort((a, b) => a.releaseId.localeCompare(b.releaseId) || a.patchNumber - b.patchNumber)
    .slice(-PULSE_LENGTH);
  const { successfulDevices: booted, failedDevices: failed } = view.totals;
  const health: AppHealth = failing.length
    ? "failing"
    : view.totals.observedPatches
      ? "healthy"
      : "silent";
  const verdict = failing.length
    ? failing.length === 1
      ? `Patch #${failing[0].patchNumber} is failing on ${failing[0].failedDevices} ${failing[0].failedDevices === 1 ? "device" : "devices"}`
      : `${failing.length} patches are failing on devices`
    : view.totals.observedPatches
      ? "Every reporting patch is running cleanly"
      : view.totals.patches
        ? "No device has reported yet"
        : "No updates published yet";
  return {
    health,
    verdict,
    successRate: rate(booted, failed),
    booted,
    failed,
    patches: view.totals.patches,
    releases,
    rolledBack: view.totals.rolledBackPatches,
    failing,
    pulse,
  };
}

const APP_HEALTH_DOT: Record<AppHealth, string> = {
  failing: HEALTH.failing.dot,
  healthy: HEALTH.healthy.dot,
  silent: HEALTH.silent.dot,
  rolledBack: HEALTH.rolledBack.dot,
  loading: "bg-[#e3e3e6] animate-pulse",
  unknown: "bg-white border border-[#b8b8be]",
};

const APP_HEALTH_TEXT: Record<AppHealth, string> = {
  failing: HEALTH.failing.text,
  healthy: HEALTH.healthy.text,
  silent: "text-[#6d6d72]",
  rolledBack: "text-[#6d6d72]",
  loading: "text-[#8d8d93]",
  unknown: "text-[#8d8d93]",
};

export function HealthDot({ health, className = "" }: { health: AppHealth; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${APP_HEALTH_DOT[health]} ${className}`} />;
}

export function platformLabel(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("ios")) return "iOS";
  if (p.includes("android")) return "Android";
  return platform;
}

function PlatformTags({ platforms, inverted = false }: { platforms: string[]; inverted?: boolean }) {
  if (!platforms.length) return null;
  return (
    <span className="flex shrink-0 gap-1">
      {platforms.map((platform) => (
        <span
          key={platform}
          className={`rounded border px-1.5 py-px text-[0.68rem] font-medium ${
            inverted ? "border-white/25 text-white/80" : "border-black/10 text-[#5f6066]"
          }`}
        >
          {platformLabel(platform)}
        </span>
      ))}
    </span>
  );
}

/** One square per recent patch. Hover names the patch; the legend lives on the analytics page. */
export function DeliveryPulse({ rows, size = "md" }: { rows: PatchDeliveryRow[]; size?: "sm" | "md" }) {
  const cell = size === "sm" ? "h-3 w-2" : "h-5 w-2.5";
  if (!rows.length) {
    return (
      <div className={`flex items-center gap-[3px]`} aria-label="No patches yet">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={`${cell} rounded-[2px] border border-dashed border-[#d6d6da]`} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-[3px]" role="img" aria-label={`${rows.length} recent patches by device health`}>
      {rows.map((row) => {
        const h = healthOf(row);
        return (
          <span
            key={row.patchId}
            title={`#${row.patchNumber} · ${row.releaseId} · ${HEALTH[h].label}`}
            className={`${cell} rounded-[2px] border ${
              h === "failing"
                ? "border-[#c0392b] bg-[#c0392b]"
                : h === "healthy"
                  ? "border-[#2f7d4f] bg-[#2f7d4f]"
                  : h === "rolledBack"
                    ? "border-dashed border-[#a8a8ae] bg-white"
                    : "border-[#d6d6da] bg-[#ececef]"
            }`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------
// Sidebar

type NavItem = { key: OperatorTab; label: string; icon: ComponentType<{ className?: string }> };

const APP_NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: CircleGauge },
  { key: "analytics", label: "Device health", icon: Activity },
  { key: "releases", label: "Releases", icon: Package },
  { key: "patches", label: "Patches", icon: RadioTower },
  { key: "rollback", label: "Roll back", icon: RotateCcw },
];

const WORKSPACE_NAV: NavItem[] = [
  { key: "ownership", label: "Access", icon: LockKeyhole },
  { key: "developer", label: "CLI setup", icon: TerminalSquare },
  { key: "billing", label: "Plan", icon: BarChart3 },
  { key: "trust", label: "Security", icon: ShieldCheck },
];

const APP_TABS = new Set<OperatorTab>(["overview", "analytics", "releases", "patches", "health", "rollback"]);

export function isAppTab(tab: OperatorTab) {
  return APP_TABS.has(tab);
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`focus-ring flex w-auto min-w-0 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 lg:w-full text-left text-sm transition lg:shrink ${
        active ? "bg-black font-medium text-white" : "text-[#4d4d52] hover:bg-black/[0.05] hover:text-black"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-2.5 pb-1.5 pt-5 text-xs font-medium text-[#8d8d93]">{children}</p>;
}

export function ConsoleSidebar({
  apps,
  appHealth,
  selectedAppId,
  operatorTab,
  operatorEmail,
  signedIn,
  configReady,
  onGoHome,
  onSelectApp,
  onSelectTab,
  onSignIn,
  onSignOut,
}: {
  apps: AppSummary[];
  appHealth: Record<string, AppHealth>;
  selectedAppId: string;
  operatorTab: OperatorTab;
  operatorEmail: string;
  signedIn: boolean;
  configReady: boolean;
  onGoHome: () => void;
  onSelectApp: (appId: string) => void;
  onSelectTab: (tab: OperatorTab) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const homeActive = !selectedAppId && isAppTab(operatorTab);
  const activeAppTab = operatorTab === "health" ? "patches" : operatorTab;
  return (
    <aside className="operator-sidebar flex min-w-0 flex-col border-b border-black/10 px-3 py-3 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-4">
      <a href="/" className="flex items-center gap-2.5 px-1.5">
        <SoroqMark className="size-7" />
        <span className="text-[0.95rem] font-semibold tracking-tight">Soroq</span>
        <span className="text-sm text-[#8d8d93]">Console</span>
      </a>

      {/* Phone and tablet: one scrolling row of destinations. */}
      <nav className="mt-3 flex min-w-0 gap-1 overflow-x-auto pb-1 lg:hidden" aria-label="Console">
        <NavButton item={{ key: "overview", label: "All apps", icon: LayoutGrid }} active={homeActive} onClick={onGoHome} />
        {selectedAppId
          ? APP_NAV.map((item) => (
              <NavButton key={item.key} item={item} active={activeAppTab === item.key} onClick={() => onSelectTab(item.key)} />
            ))
          : null}
        {WORKSPACE_NAV.map((item) => (
          <NavButton key={item.key} item={item} active={operatorTab === item.key} onClick={() => onSelectTab(item.key)} />
        ))}
      </nav>

      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div className="mt-5">
          <NavButton item={{ key: "overview", label: "All apps", icon: LayoutGrid }} active={homeActive} onClick={onGoHome} />
        </div>

        {apps.length ? (
          <>
            <SectionLabel>Apps</SectionLabel>
            <ul className="grid min-w-0 gap-px">
              {apps.map((app) => {
                const selected = app.id === selectedAppId;
                return (
                  <li key={app.id} className="min-w-0">
                    <button
                      type="button"
                      aria-current={selected ? "true" : undefined}
                      onClick={() => onSelectApp(app.id)}
                      className={`focus-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                        selected ? "bg-black/[0.06] font-medium text-black" : "text-[#4d4d52] hover:bg-black/[0.04] hover:text-black"
                      }`}
                    >
                      <HealthDot health={appHealth[app.id] ?? "loading"} />
                      <span className="min-w-0 flex-1 truncate">{app.name}</span>
                      {app.platforms.length ? (
                        <span className="shrink-0 text-[0.68rem] text-[#8d8d93]">{app.platforms.map(platformLabel).join(" · ")}</span>
                      ) : null}
                    </button>
                    {selected ? (
                      <div className="mb-1 ml-[0.8rem] mt-0.5 grid min-w-0 gap-px border-l border-black/10 pl-2">
                        {APP_NAV.map((item) => (
                          <NavButton key={item.key} item={item} active={activeAppTab === item.key} onClick={() => onSelectTab(item.key)} />
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        <SectionLabel>Workspace</SectionLabel>
        <div className="grid gap-px">
          {WORKSPACE_NAV.map((item) => (
            <NavButton key={item.key} item={item} active={operatorTab === item.key} onClick={() => onSelectTab(item.key)} />
          ))}
        </div>

        <div className="mt-auto pt-6">
          <div className="flex items-center gap-2.5 rounded-md border border-black/10 bg-white p-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black text-[0.7rem] font-semibold text-white">
              {(operatorEmail || "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-[#4d4d52]">{signedIn ? operatorEmail : "Not signed in"}</span>
            {signedIn ? (
              <button
                type="button"
                onClick={onSignOut}
                className="focus-ring grid size-8 shrink-0 place-items-center rounded-md text-[#6d6d72] hover:bg-black/[0.05] hover:text-black"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={!configReady}
                className="focus-ring grid size-8 shrink-0 place-items-center rounded-md text-[#6d6d72] hover:bg-black/[0.05] hover:text-black disabled:opacity-40"
                aria-label="Sign in"
                title="Sign in"
              >
                <LogIn className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------------------------------
// Top bar

export type Crumb = { label: string; onClick?: () => void; mono?: boolean };

export function ConsoleTopBar({
  crumbs,
  apiState,
  statusText,
  statusStale,
  canRefresh,
  refreshing,
  onRefresh,
}: {
  crumbs: Crumb[];
  apiState: ApiState<JsonRecord>["status"];
  statusText: string;
  statusStale: boolean;
  canRefresh: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const live = apiState === "ready";
  return (
    <header className="operator-topbar sticky top-0 z-20 flex min-w-0 items-center gap-3 border-b border-black/10 px-4 py-2.5 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? <ChevronRight className="size-3.5 shrink-0 text-[#b1b1b5]" aria-hidden="true" /> : null}
              {crumb.onClick && !last ? (
                <button type="button" onClick={crumb.onClick} className="focus-ring shrink-0 rounded text-[#6d6d72] hover:text-black">
                  {crumb.label}
                </button>
              ) : (
                <span className={`truncate ${last ? "font-medium text-black" : "text-[#6d6d72]"} ${crumb.mono ? "font-mono text-xs" : ""}`}>
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
      {statusText ? (
        <span role="status" aria-live="polite" className={`hidden text-xs md:inline ${statusStale ? "text-black" : "text-[#8d8d93]"}`}>
          {statusText}
        </span>
      ) : null}
      <span
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-[#4d4d52]"
        title={live ? "The control plane answered its health check" : "Control plane health not confirmed"}
      >
        <span className={`size-1.5 rounded-full ${live ? "bg-[#2f7d4f]" : apiState === "error" ? "bg-[#c0392b]" : "bg-[#b8b8be]"}`} />
        {live ? "Live" : apiState === "error" ? "Unreachable" : "Checking"}
      </span>
      <Button
        type="button"
        variant="outline"
        className="h-8 shrink-0 border-black/10 bg-white px-2.5 text-black hover:bg-[#f3f3f4]"
        disabled={!canRefresh || refreshing}
        onClick={onRefresh}
        aria-label="Refresh"
      >
        <RefreshCcw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    </header>
  );
}

// ---------------------------------------------------------------------------------------------------
// Apps home

export function AppsHome({
  apps,
  loading,
  search,
  onSearch,
  onSelectApp,
  isAdmin,
}: {
  apps: AppSummary[];
  loading: boolean;
  search: string;
  onSearch: (value: string) => void;
  onSelectApp: (appId: string) => void;
  isAdmin: boolean;
}) {
  const query = search.trim().toLowerCase();
  const digests = useMemo(() => new Map(apps.map((app) => [app.id, digestApp(app)])), [apps]);
  const shown = apps
    .filter((app) => !query || `${app.id} ${app.name}`.toLowerCase().includes(query))
    // Something broken first; otherwise keep the server's order.
    .sort((a, b) => Number(digests.get(b.id)?.health === "failing") - Number(digests.get(a.id)?.health === "failing"));
  const failingApps = apps.filter((app) => digests.get(app.id)?.health === "failing").length;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
          <p className="mt-1 text-sm text-[#6d6d72]">
            {loading && !apps.length
              ? "Loading your apps…"
              : failingApps
                ? `${failingApps} of ${apps.length} ${apps.length === 1 ? "app has" : "apps have"} a patch failing on devices.`
                : `${apps.length} ${apps.length === 1 ? "app" : "apps"}${isAdmin ? " in this control plane" : ""}. Each square is a recent patch, coloured by what devices reported.`}
          </p>
        </div>
        {apps.length > 6 ? (
          <label className="flex h-9 w-full items-center gap-2 rounded-md border border-black/10 bg-white px-3 sm:w-64">
            <Search className="size-4 text-[#8d8d93]" />
            <span className="sr-only">Search apps</span>
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search apps"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#9a9aa1]"
            />
          </label>
        ) : null}
      </div>

      {loading && !apps.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[196px] animate-pulse rounded-lg border border-black/10 bg-white" />
          ))}
        </div>
      ) : !apps.length ? (
        <div className="rounded-lg border border-black/10 bg-white p-6">
          <p className="text-base font-semibold">No apps yet</p>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[#6d6d72]">
            Add Soroq to a Flutter app and register it from its project folder. It shows up here as soon as it is created.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md bg-[#f4f4f5] px-3 py-2 font-mono text-xs text-black">soroq init{"\n"}soroq app create --name "My App"</pre>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          {shown.map((app) => {
            const d = digests.get(app.id)!;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onSelectApp(app.id)}
                className={`focus-ring group grid min-w-0 gap-4 rounded-lg border bg-white p-4 text-left transition hover:border-black/30 ${
                  d.health === "failing" ? "border-[#c0392b]/50" : "border-black/10"
                }`}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-base font-semibold">{app.name}</span>
                      <PlatformTags platforms={app.platforms} />
                    </div>
                    {app.name !== app.id ? <p className="mt-0.5 truncate font-mono text-xs text-[#8d8d93]">{app.id}</p> : null}
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-[#b1b1b5] transition group-hover:text-black" />
                </div>
                <DeliveryPulse rows={d.pulse} />
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <p className={`flex min-w-0 items-center gap-2 text-sm font-medium ${APP_HEALTH_TEXT[d.health]}`}>
                    <HealthDot health={d.health} />
                    <span className="truncate">{d.verdict}</span>
                  </p>
                  {d.health !== "loading" && d.health !== "unknown" ? (
                    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6d6d72]">
                      <span>
                        <span className="font-semibold text-black">{pct(d.successRate)}</span> booted cleanly
                      </span>
                      <span>
                        <span className="font-semibold text-black">{d.patches}</span> {d.patches === 1 ? "patch" : "patches"}
                      </span>
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------
// App header (every app screen) and overview

export function AppHeader({
  app,
  digest,
  section,
  actions,
}: {
  app: AppSummary;
  digest: AppDigest;
  section?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{section ?? app.name}</h1>
          {section ? null : <PlatformTags platforms={app.platforms} />}
        </div>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6d6d72]">
          {section ? <span className="font-medium text-black">{app.name}</span> : null}
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="truncate font-mono text-xs">{app.id}</span>
            <CopyButton value={app.id} label="Copy app id" />
          </span>
          {app.owner ? <span className="truncate">Owner {app.owner}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {section ? (
          <span className={`mr-2 inline-flex items-center gap-2 text-sm ${APP_HEALTH_TEXT[digest.health]}`}>
            <HealthDot health={digest.health} />
            {digest.verdict}
          </span>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

export type ReleaseDigest = {
  id: string;
  version: string;
  platform: string;
  createdAt: string;
  patches: number;
  live: number;
  rolledBack: number;
  latest: PatchDeliveryRow | null;
  /** Installs on this release's platform; null when there is no figure (see releaseInstalls). */
  installs: InstallCount | null;
};

const count = (n: number) => n.toLocaleString("en-US");

/** Orders versions like 1.0.43+59 newest first: numeric runs compare as numbers. */
function compareVersionsDesc(a: string, b: string) {
  const parts = (v: string) => v.split(/[^0-9]+/).filter(Boolean).map(Number);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] ?? -1) - (pa[i] ?? -1);
    if (d !== 0) return d;
  }
  return b.localeCompare(a);
}

/**
 * Phones running each build, from the update check an app makes on every launch, split by the platform
 * each phone checked in from. Every number is the server's; nothing is added up here.
 */
function InstallsSection({ installs, unavailable }: { installs: InstallGroup[] | null; unavailable: string }) {
  if (unavailable) {
    return (
      <section>
        <h2 className="text-base font-semibold">Installs</h2>
        <p className="mt-2 text-sm text-[#6d6d72]">Install counts could not be read right now: {unavailable}</p>
      </section>
    );
  }
  if (!installs) {
    return null;
  }
  const groups = [...installs].sort((a, b) => compareVersionsDesc(a.version, b.version));
  const split = groups.some((g) => g.platforms !== null);
  const showUnknown = groups.some((g) => (g.platforms?.unknown?.devices ?? 0) > 0);
  const cell = (g: InstallGroup, name: "android" | "ios" | "unknown") =>
    g.platforms ? count(g.platforms[name]?.devices ?? 0) : "—";
  return (
    <section>
      <h2 className="text-base font-semibold">Installs</h2>
      <p className="mt-0.5 text-sm text-[#6d6d72]">
        Phones running each version, counted when the app checks for updates at launch.
      </p>
      {groups.length ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/10 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-black/10 text-xs text-[#6d6d72]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Version</th>
                {split ? (
                  <>
                    <th className="px-4 py-2.5 text-right font-medium">Android</th>
                    <th className="px-4 py-2.5 text-right font-medium">iOS</th>
                    {showUnknown ? <th className="px-4 py-2.5 text-right font-medium">Not yet attributed</th> : null}
                  </>
                ) : null}
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 text-right font-medium">Opened in last 24h</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.07]">
              {groups.map((g) => (
                <tr key={`${g.runtimeId}:${g.channel}`}>
                  <td className="px-4 py-3">
                    <span className="block font-semibold">{g.version || "Unregistered build"}</span>
                    {g.channel && g.channel !== "stable" ? (
                      <span className="block text-xs text-[#8d8d93]">{g.channel} channel</span>
                    ) : null}
                  </td>
                  {split ? (
                    <>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{cell(g, "android")}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{cell(g, "ios")}</td>
                      {showUnknown ? (
                        <td className="px-4 py-3 text-right tabular-nums text-[#6d6d72]">{cell(g, "unknown")}</td>
                      ) : null}
                    </>
                  ) : null}
                  <td className="px-4 py-3 text-right tabular-nums">{count(g.devices)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#6d6d72]">{count(g.active24h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {showUnknown ? (
            <p className="border-t border-black/10 px-4 py-2.5 text-xs leading-5 text-[#6d6d72]">
              Not yet attributed: phones counted before installs were split by platform. Each moves to Android or
              iOS the next time the app is opened on it.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-black/10 bg-white p-5">
          <p className="text-sm font-semibold">No phone has checked in yet</p>
          <p className="mt-1 text-sm text-[#6d6d72]">Phones appear here the first time a Soroq build of the app is opened.</p>
        </div>
      )}
    </section>
  );
}

export function AppOverview({
  digest,
  releases,
  installs,
  installsUnavailable,
  onOpenAnalytics,
  onOpenRelease,
  onOpenRollback,
  onOpenPatches,
}: {
  digest: AppDigest;
  releases: ReleaseDigest[];
  installs: InstallGroup[] | null;
  installsUnavailable: string;
  onOpenAnalytics: () => void;
  onOpenRelease: (releaseId: string) => void;
  onOpenRollback: (patchId: string) => void;
  onOpenPatches: () => void;
}) {
  const [showAllReleases, setShowAllReleases] = useState(false);
  const shownReleases = showAllReleases ? releases : releases.slice(0, 8);
  const tone =
    digest.health === "failing"
      ? "border-[#c0392b] bg-[#fdf3f2]"
      : digest.health === "healthy"
        ? "border-[#2f7d4f] bg-[#f2f8f4]"
        : "border-[#c4c4ca] bg-white";
  const facts: Array<{ label: string; value: string }> = [
    { label: "Booted cleanly", value: pct(digest.successRate) },
    { label: "Devices on a patch", value: String(digest.booted) },
    { label: "Devices failing", value: String(digest.failed) },
    { label: "Patches", value: String(digest.patches) },
    { label: "Rolled back", value: String(digest.rolledBack) },
  ];

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <section className={`rounded-lg border-l-4 border-y border-r border-y-black/10 border-r-black/10 p-5 ${tone}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className={`flex items-center gap-2 text-lg font-semibold ${APP_HEALTH_TEXT[digest.health]}`}>
              {digest.health === "failing" ? <AlertTriangle className="size-5 shrink-0" /> : <HealthDot health={digest.health} className="size-2.5" />}
              {digest.verdict}
            </p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[#4d4d52]">
              {digest.health === "failing"
                ? "Devices are reporting crashes or refusals for a live patch. Open device health for the reasons, or withdraw the patch now."
                : digest.health === "healthy"
                  ? "Devices that took an update booted it without a crash or refusal. You get a GitHub issue if that changes."
                  : "Numbers appear once devices on a patched build start and report back."}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" className="h-9 border-black/15 bg-white text-black hover:bg-[#f3f3f4]" onClick={onOpenAnalytics}>
              <Activity className="size-4" />
              Device health
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <DeliveryPulse rows={digest.pulse} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs text-[#6d6d72]">{fact.label}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {digest.failing.length ? (
        <section>
          <h2 className="text-base font-semibold">Needs attention</h2>
          <ul className="mt-3 divide-y divide-black/10 overflow-hidden rounded-lg border border-black/10 bg-white">
            {digest.failing.map((row) => (
              <li key={row.patchId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    Patch #{row.patchNumber} <span className="break-all font-normal text-[#6d6d72]">on {row.releaseId}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[#6d6d72]">
                    {row.failedDevices} failing · {row.successfulDevices} booted ·{" "}
                    {row.failureClasses.map((c) => c.title).join(", ") || "no reason sent"}
                  </p>
                </div>
                <Button type="button" className="h-8 w-fit shrink-0 bg-[#c0392b] text-white hover:bg-[#a53125]" onClick={() => onOpenRollback(row.patchId)}>
                  <RotateCcw className="size-4" />
                  Roll back
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <InstallsSection installs={installs} unavailable={installsUnavailable} />

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Releases</h2>
            <p className="mt-0.5 text-sm text-[#6d6d72]">Store builds that can receive updates, newest first.</p>
          </div>
          <button type="button" onClick={onOpenPatches} className="focus-ring shrink-0 whitespace-nowrap rounded text-sm font-medium text-black underline-offset-4 hover:underline">
            All patches
          </button>
        </div>
        {releases.length ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-black/10 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-black/10 text-xs text-[#6d6d72]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Version</th>
                  <th className="px-4 py-2.5 font-medium">Platform</th>
                  <th className="px-4 py-2.5 text-right font-medium">Installs</th>
                  <th className="px-4 py-2.5 font-medium">Latest patch</th>
                  <th className="px-4 py-2.5 text-right font-medium">Live</th>
                  <th className="px-4 py-2.5 text-right font-medium">Rolled back</th>
                  <th className="px-4 py-2.5 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.07]">
                {shownReleases.map((release) => {
                  const h = release.latest ? healthOf(release.latest) : null;
                  return (
                    <tr key={release.id} className="cursor-pointer hover:bg-black/[0.025]" onClick={() => onOpenRelease(release.id)}>
                      <td className="px-4 py-3">
                        <button type="button" className="focus-ring rounded text-left" onClick={() => onOpenRelease(release.id)}>
                          <span className="block font-semibold">{release.version}</span>
                          <span className="block font-mono text-[0.7rem] text-[#8d8d93]">{release.id}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#4d4d52]">{platformLabel(release.platform) || "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {release.installs ? count(release.installs.devices) : <span className="text-[#8d8d93]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {release.latest && h ? (
                          <span className={`inline-flex items-center gap-2 ${HEALTH[h].text}`}>
                            <span className={`size-2 rounded-full ${HEALTH[h].dot}`} />#{release.latest.patchNumber} · {HEALTH[h].label}
                          </span>
                        ) : (
                          <span className="text-[#8d8d93]">No patches</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{release.live}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#6d6d72]">{release.rolledBack}</td>
                      <td className="px-4 py-3 text-[#6d6d72]">{release.createdAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {releases.length > shownReleases.length ? (
              <button
                type="button"
                onClick={() => setShowAllReleases(true)}
                className="focus-ring w-full border-t border-black/10 px-4 py-2.5 text-sm font-medium text-black hover:bg-black/[0.025]"
              >
                Show all {releases.length} releases
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-black/10 bg-white p-5">
            <p className="text-sm font-semibold">No releases yet</p>
            <p className="mt-1 text-sm text-[#6d6d72]">
              Register the build you ship to the store with <code className="font-mono text-xs">soroq release android</code> or{" "}
              <code className="font-mono text-xs">soroq release ios</code>; patches are published against it.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------
// Patches

export type PatchListRow = {
  id: string;
  number: string;
  releaseId: string;
  releaseVersion: string;
  channel: string;
  kind: string;
  rollout: string;
  rolledBack: boolean;
  createdAt: string;
  delivery: PatchDeliveryRow | null;
};

const KIND_LABELS: Record<string, string> = {
  experimental_native_aot: "Dart code",
  native_aot: "Dart code",
  code: "Dart code",
  asset: "Assets",
  config: "Config",
};

export function kindLabel(kind: string) {
  return KIND_LABELS[kind] ?? kind.replace(/_/g, " ");
}

export function PatchesTable({
  rows,
  selectedPatchId,
  onInspect,
  onRollback,
}: {
  rows: PatchListRow[];
  selectedPatchId: string;
  onInspect: (patchId: string) => void;
  onRollback: (patchId: string) => void;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <p className="text-sm font-semibold">No patches match</p>
        <p className="mt-1 text-sm text-[#6d6d72]">
          Clear the filters, or publish one from the app folder with <code className="font-mono text-xs">soroq patch android</code>.
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-black/10 text-xs text-[#6d6d72]">
          <tr>
            <th className="px-4 py-2.5 font-medium">Patch</th>
            <th className="px-4 py-2.5 font-medium">Health on devices</th>
            <th className="px-4 py-2.5 text-right font-medium">Booted</th>
            <th className="px-4 py-2.5 text-right font-medium">Failed</th>
            <th className="px-4 py-2.5 font-medium">Kind</th>
            <th className="px-4 py-2.5 font-medium">Published</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.07]">
          {rows.map((row) => {
            const h: Health = row.delivery
              ? healthOf(row.delivery)
              : row.rolledBack
                ? "rolledBack"
                : "silent";
            const selected = row.id === selectedPatchId;
            return (
              <tr key={row.id} className={selected ? "bg-black/[0.035]" : "hover:bg-black/[0.02]"}>
                <td className="px-4 py-3">
                  <button type="button" className="focus-ring rounded text-left" onClick={() => onInspect(row.id)}>
                    <span className={`block font-semibold ${row.rolledBack ? "text-[#8d8d93] line-through" : ""}`}>
                      #{row.number} <span className="font-normal text-[#6d6d72]">on {row.releaseVersion}</span>
                    </span>
                    <span className="block max-w-[34ch] truncate font-mono text-[0.7rem] text-[#8d8d93]">{row.id}</span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-2 ${HEALTH[h].text}`}>
                    <span className={`size-2 rounded-full ${HEALTH[h].dot}`} />
                    {HEALTH[h].label}
                  </span>
                  {row.channel !== "stable" || (row.rollout && row.rollout !== "100") ? (
                    <span className="mt-0.5 block text-xs text-[#8d8d93]">
                      {row.channel}
                      {row.rollout && row.rollout !== "100" ? ` · ${row.rollout}% rollout` : ""}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.delivery?.observed ? row.delivery.successfulDevices : "—"}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${row.delivery?.failedDevices ? "font-semibold text-[#8f2a20]" : ""}`}>
                  {row.delivery?.observed ? row.delivery.failedDevices : "—"}
                </td>
                <td className="px-4 py-3 text-[#4d4d52]">{kindLabel(row.kind)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[#6d6d72]">{row.createdAt}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Button type="button" variant="outline" className="h-8 border-black/10 bg-white px-2.5 text-black hover:bg-[#f3f3f4]" onClick={() => onInspect(row.id)}>
                      Details
                    </Button>
                    {!row.rolledBack ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 border-black/10 bg-white px-2.5 text-[#8f2a20] hover:border-[#c0392b]/40 hover:bg-[#fdf3f2]"
                        onClick={() => onRollback(row.id)}
                        aria-label={`Roll back patch ${row.number}`}
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------
// One patch

export function PatchHealthPanel({
  patchId,
  delivery,
  identity,
  loading,
  error,
  raw,
  onRollback,
  onOpenDeviceHealth,
}: {
  patchId: string;
  delivery: PatchDeliveryRow | null;
  identity: Array<{ label: string; value: string }>;
  loading: boolean;
  error: string;
  raw: JsonRecord | null;
  onRollback: () => void;
  onOpenDeviceHealth: () => void;
}) {
  if (!patchId) {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <p className="text-sm font-semibold">Choose a patch</p>
        <p className="mt-1 text-sm text-[#6d6d72]">Open one from the Patches list to see what devices reported about it.</p>
      </div>
    );
  }
  const h: Health | null = delivery ? healthOf(delivery) : null;
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
      {error ? (
        <p className="rounded-md border border-[#c0392b]/30 bg-[#fdf3f2] px-3 py-2 text-sm text-[#8f2a20]">{error}</p>
      ) : null}
      <section className="rounded-lg border border-black/10 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-[#6d6d72]">Patch #{delivery?.patchNumber ?? identity.find((r) => r.label === "Patch number")?.value}</p>
            <p className={`mt-1 flex items-center gap-2 text-lg font-semibold ${h ? HEALTH[h].text : "text-[#6d6d72]"}`}>
              {loading ? (
                "Loading device reports…"
              ) : h ? (
                <>
                  <span className={`size-2.5 rounded-full ${HEALTH[h].dot}`} />
                  {HEALTH[h].label}
                </>
              ) : (
                "No device reports for this patch"
              )}
            </p>
            <p className="mt-1 break-all font-mono text-xs text-[#8d8d93]">{patchId}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" className="h-9 border-black/15 bg-white text-black hover:bg-[#f3f3f4]" onClick={onOpenDeviceHealth}>
              <Activity className="size-4" />
              Device health
            </Button>
            {delivery && !delivery.rolledBack ? (
              <Button type="button" className="h-9 bg-[#c0392b] text-white hover:bg-[#a53125]" onClick={onRollback}>
                <RotateCcw className="size-4" />
                Roll back
              </Button>
            ) : null}
          </div>
        </div>
        {delivery ? (
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-[#6d6d72]">Booted cleanly</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums">{pct(rate(delivery.successfulDevices, delivery.failedDevices))}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6d6d72]">Devices booted</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums">{delivery.successfulDevices}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6d6d72]">Devices failed</dt>
              <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${delivery.failedDevices ? "text-[#8f2a20]" : ""}`}>{delivery.failedDevices}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6d6d72]">State</dt>
              <dd className="mt-0.5 text-xl font-semibold">{delivery.rolledBack ? "Rolled back" : "Live"}</dd>
            </div>
          </dl>
        ) : null}
        {delivery?.failureClasses.length ? (
          <div className="mt-5 border-t border-black/10 pt-4">
            <p className="text-sm font-semibold">Why devices failed</p>
            <ul className="mt-2 grid gap-2">
              {delivery.failureClasses.map((c) => (
                <li key={c.label} className="text-sm">
                  <span className="font-medium">{c.title}</span>
                  <span className="text-[#6d6d72]"> · {c.count} {c.count === 1 ? "device" : "devices"}</span>
                  <p className="text-[#6d6d72]">{REASON_EXPLAINED[c.label] ?? ""}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-base font-semibold">Identity</h2>
        <dl className="mt-3 grid gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
          {identity.map((row) => (
            <div key={row.label} className="min-w-0 bg-white px-4 py-3">
              <dt className="text-xs text-[#6d6d72]">{row.label}</dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-black" title={row.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {raw ? (
        <details className="rounded-lg border border-black/10 bg-white">
          <summary className="cursor-pointer px-4 py-2.5 text-sm text-[#4d4d52]">Server response</summary>
          <pre className="max-h-80 overflow-auto border-t border-black/10 p-4 text-xs leading-5 text-[#323236]">{JSON.stringify(raw, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
