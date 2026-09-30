import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Activity,
  BarChart3,
  CircleGauge,
  Download,
  FileArchive,
  FileCode2,
  ListChecks,
  Loader2,
  LockKeyhole,
  LogIn,
  RadioTower,
  RefreshCcw,
  RotateCcw,
  Settings as SettingsIcon,
  TerminalSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoroqMark } from "@/components/SoroqMark";
import { isOperatorRoute } from "@/shared/pageTypes";
import {
  ConsoleEmpty,
  ConsoleMiniStat,
  JsonPreview,
  OperatorMetric,
  StateNotice,
} from "@/operator/components/ConsolePrimitives";
import {
  AppHeader,
  AppOverview,
  AppsHome,
  ConsoleSidebar,
  ConsoleTopBar,
  PatchHealthPanel,
  PatchesTable,
  digestApp,
  platformLabel,
  type AppHealth,
  type AppSummary,
  type Crumb,
  type PatchListRow,
  type ReleaseDigest,
} from "@/operator/components/ConsoleShell";
import {
  ProductLayerTabPanel,
  isProductLayerTab,
} from "@/operator/components/ProductLayerTabs";
import { buildProductReadinessView } from "@/operator/productReadiness";
import { buildAnalyticsView, releaseInstalls } from "@/operator/analytics";
import { OperatorAnalyticsPage } from "@/operator/components/OperatorAnalyticsPage";
import {
  apiList,
  formatMetric,
  formatRecordText,
  getRecordValue,
  mergeRecords,
  operatorPath,
  recordFlag,
  recordId,
  shortRecord,
} from "@/operator/records";
import type {
  ApiState,
  FirebaseAuthUser,
  FirebaseConfigResponse,
  FirebaseNamespace,
  JsonRecord,
  OperatorProfile,
  OperatorTab,
} from "@/operator/types";

declare global {
  interface Window {
    firebase?: FirebaseNamespace;
  }
}

const firebaseCompatScripts = [
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth-compat.js",
] as const;

const scriptLoads = new Map<string, Promise<void>>();

const CONSOLE_TABS = [
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

export function idleState<T>(): ApiState<T> {
  return { status: "idle", data: null, error: null };
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isAbortError(error: unknown) {
  // A fetch abort rejects with a DOMException named "AbortError", which is not
  // reliably a subclass of Error in browsers — match on name, not instanceof.
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export function extractApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as JsonRecord;
  const message = typeof record.error === "string" ? record.error : null;
  const detail = typeof record.detail === "string" ? record.detail : null;

  if (message && detail) {
    return `${message} ${detail}`;
  }

  return message || detail;
}

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(
      extractApiError(payload) || `Request failed with HTTP ${response.status}`,
    );
  }

  return payload as T;
}

export function loadScript(src: string) {
  const existing = scriptLoads.get(src);
  if (existing) {
    return existing;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (current?.dataset.ready === "true") {
      resolve();
      return;
    }

    const script = current || document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.ready = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Could not load ${src}`));

    if (!current) {
      document.head.appendChild(script);
    }
  });

  scriptLoads.set(src, promise);
  return promise;
}

async function loadFirebaseCompat() {
  for (const src of firebaseCompatScripts) {
    await loadScript(src);
  }

  if (!window.firebase) {
    throw new Error("Firebase browser SDK did not initialize.");
  }

  return window.firebase;
}

export function recordNumberValue(
  record: JsonRecord | null | undefined,
  keys: string[],
) {
  const value = getRecordValue(record, keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function recordTimeValue(record: JsonRecord | null | undefined) {
  const value = getRecordValue(record, [
    "created_at",
    "published_at",
    "uploaded_at",
    "updated_at",
    "received_at",
  ]);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function compareNewestPatch(a: JsonRecord, b: JsonRecord) {
  const timeDelta = recordTimeValue(b) - recordTimeValue(a);
  if (timeDelta !== 0) {
    return timeDelta;
  }
  return (
    recordNumberValue(b, ["patch_number", "number"]) -
    recordNumberValue(a, ["patch_number", "number"])
  );
}

export function recordBelongsToApp(record: JsonRecord, appId: string) {
  const recordAppId = formatRecordText(record, ["app_id", "app"], "");
  return !appId || recordAppId === appId;
}

export type ReleaseTab = "overview" | "insights" | "artifacts" | "notes" | "settings";

export const releaseTabs: Array<{
  key: ReleaseTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "overview", label: "Overview", icon: ListChecks },
  { key: "insights", label: "Insights", icon: BarChart3 },
  { key: "artifacts", label: "Artifacts", icon: FileArchive },
  { key: "notes", label: "Notes", icon: FileCode2 },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export const appWorkspaceTabs: Array<{
  key: Extract<OperatorTab, "overview" | "releases" | "patches" | "health" | "analytics" | "rollback">;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "releases", label: "Releases", icon: TerminalSquare },
  { key: "analytics", label: "Analytics", icon: Activity },
  { key: "patches", label: "Patches", icon: RadioTower },
  { key: "health", label: "Health", icon: BarChart3 },
  { key: "rollback", label: "Rollback", icon: RotateCcw },
  { key: "overview", label: "Overview", icon: CircleGauge },
];

export function recordDateLabel(record: JsonRecord | null | undefined) {
  const value = getRecordValue(record, [
    "created_at",
    "published_at",
    "uploaded_at",
    "updated_at",
  ]);
  if (!value) {
    return "date not recorded";
  }
  const timestamp =
    typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : 0;
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return String(value);
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatBytesLabel(value: unknown) {
  const bytes =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : 0;
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "not recorded";
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes.toLocaleString()} B`;
}

export function shortHash(record: JsonRecord | null | undefined) {
  return shortRecord(
    formatRecordText(
      record,
      ["sha256", "artifact_sha256", "uploaded_artifact_sha256", "hash"],
      "not recorded",
    ),
  );
}


export function OperatorConsolePage() {
  const [configState, setConfigState] =
    useState<ApiState<FirebaseConfigResponse>>(idleState);
  const [operatorState, setOperatorState] =
    useState<ApiState<OperatorProfile>>(idleState);
  const [healthState, setHealthState] = useState<ApiState<JsonRecord>>(idleState);
  const [appsState, setAppsState] = useState<ApiState<JsonRecord[]>>(idleState);
  const [releasesState, setReleasesState] =
    useState<ApiState<JsonRecord[]>>(idleState);
  const [patchesState, setPatchesState] =
    useState<ApiState<JsonRecord[]>>(idleState);
  const [patchHealthState, setPatchHealthState] =
    useState<ApiState<JsonRecord>>(idleState);
  const [rollbackState, setRollbackState] =
    useState<ApiState<JsonRecord>>(idleState);
  const [productState, setProductState] =
    useState<ApiState<JsonRecord>>(idleState);
  const [analyticsState, setAnalyticsState] =
    useState<ApiState<JsonRecord>>(idleState);
  const [authUser, setAuthUser] = useState<FirebaseAuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [appIdFilter, setAppIdFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("app_id") || "";
  });
  const [releaseIdFilter, setReleaseIdFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("release_id") || "";
  });
  const [runtimeIdFilter, setRuntimeIdFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("runtime_id") || "";
  });
  const [channelFilter, setChannelFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("channel") || "stable";
  });
  const [patchId, setPatchId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("patch") || params.get("patch_id") || "";
  });
  const [rollbackConfirm, setRollbackConfirm] = useState("");
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const rollbackConfirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const [appSearch, setAppSearch] = useState("");
  const [operatorTab, setOperatorTab] = useState<OperatorTab>(() => {
    const tab = new URLSearchParams(window.location.search).get("tab") || "";
    return (CONSOLE_TABS as readonly string[]).includes(tab) ? (tab as OperatorTab) : "overview";
  });
  const [releaseTab, setReleaseTab] = useState<ReleaseTab>("overview");
  const [releaseNotes, setReleaseNotes] = useState<Record<string, string>>(() => {
    try {
      const raw = window.localStorage.getItem("soroq.operator.releaseNotes");
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  const cliLoginDeliveredRef = useRef(false);
  // Perf: cancel stale in-flight requests when the operator rapidly switches
  // app/release/patch scope so only the latest request resolves into state.
  const inventoryAbortRef = useRef<AbortController | null>(null);
  const patchHealthAbortRef = useRef<AbortController | null>(null);
  const analyticsAbortRef = useRef<AbortController | null>(null);
  const analyticsLoadedForRef = useRef<string>("");
  // Device health for every app, so the apps list and sidebar can say which app is in trouble without
  // opening each one. Same endpoint as the analytics page; nothing is computed in the browser.
  const [fleetAnalytics, setFleetAnalytics] = useState<Record<string, ApiState<JsonRecord>>>({});
  // Releases arrive scoped to one app once an app is open, so the platforms seen so far are remembered.
  const [platformsByApp, setPlatformsByApp] = useState<Record<string, string[]>>({});
  const cliLoginParams = new URLSearchParams(window.location.search);
  const cliLoginCallback = cliLoginParams.get("cli_login_callback") || "";
  const cliLoginState = cliLoginParams.get("cli_login_state") || "";

  useEffect(() => {
    if (window.location.hostname !== "127.0.0.1") {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.hostname = "localhost";
    window.location.replace(nextUrl.toString());
  }, []);

  const signedIn = Boolean(authToken && operatorState.status === "ready");
  const patchRecord = patchHealthState.data;
  const rollbackRecord = rollbackState.data;
  const rollbackTarget = patchId.trim();
  const rollbackConfirmArmed =
    Boolean(authToken && rollbackTarget) &&
    rollbackConfirm.trim() === rollbackTarget &&
    rollbackState.status !== "loading";
  const appRecords = apiList(appsState.data);
  const releaseRecords = apiList(releasesState.data);
  const patchRecords = apiList(patchesState.data);
  const inventoryLoading =
    appsState.status === "loading" ||
    releasesState.status === "loading" ||
    patchesState.status === "loading";
  const inventoryError =
    appsState.error || releasesState.error || patchesState.error || null;
  const inventoryReceivedAt =
    appsState.receivedAt || releasesState.receivedAt || patchesState.receivedAt;
  const inventoryStale = Boolean(
    !inventoryLoading &&
      inventoryReceivedAt &&
      Date.now() - Date.parse(inventoryReceivedAt) > 120000,
  );
  const selectedPatchRecord =
    patchRecords.find((patch) => recordId(patch) === patchId.trim()) ?? null;
  const patchIdentityRecord = mergeRecords(patchRecord, selectedPatchRecord);
  const patchIdentityRows = [
    {
      label: "Patch ID",
      value:
        patchId.trim() ||
        formatRecordText(patchIdentityRecord, ["patch_id", "id"], "select a patch"),
      helper: "rollback target",
    },
    {
      label: "Patch number",
      value: formatRecordText(
        patchIdentityRecord,
        ["patch_number", "number"],
        patchIdentityRecord ? "unknown" : "not loaded",
      ),
      helper: "monotonic release lane",
    },
    {
      label: "Release",
      value: formatRecordText(
        patchIdentityRecord,
        ["release_id", "release"],
        patchIdentityRecord ? "unknown" : "not loaded",
      ),
      helper: "base artifact link",
    },
    {
      label: "App",
      value: formatRecordText(
        patchIdentityRecord,
        ["app_id", "app"],
        patchIdentityRecord ? "unknown" : "not loaded",
      ),
      helper: "registered app id",
    },
    {
      label: "Runtime",
      value: formatRecordText(
        patchIdentityRecord,
        ["runtime_id", "runtime"],
        patchIdentityRecord ? "unknown" : "not loaded",
      ),
      helper: "compatibility boundary",
    },
    {
      label: "Channel",
      value: formatRecordText(
        patchIdentityRecord,
        ["channel"],
        patchIdentityRecord ? "unknown" : "not loaded",
      ),
      helper: "delivery lane",
    },
  ];
  const patchMetrics = [
    {
      label: "Accepted",
      value: getRecordValue(patchRecord, [
        "accepted",
        "accepted_count",
        "success",
        "success_count",
        "installed",
        "installed_count",
      ]),
      helper: "client success receipts",
      fallback: patchRecord ? "0" : "not loaded",
    },
    {
      label: "Failed",
      value: getRecordValue(patchRecord, [
        "failed",
        "failed_count",
        "error_count",
        "native_stage_failed",
      ]),
      helper: "reported failures",
      fallback: patchRecord ? "0" : "not loaded",
    },
    {
      label: "Rolled back",
      value: getRecordValue(patchRecord, ["rolled_back", "rollback", "is_rolled_back"]),
      helper: "server-side flag",
      fallback: patchRecord ? "unknown" : "not loaded",
    },
  ];
  const requestedAppId = appIdFilter.trim();
  const selectedAppId = requestedAppId;
  const selectedAppRecord =
    appRecords.find((app) => recordId(app) === selectedAppId) ?? null;
  const selectedAppInScope = Boolean(selectedAppId && selectedAppRecord);
  const scopedAppId = selectedAppInScope ? selectedAppId : "";
  const selectedAppName = formatRecordText(
    selectedAppRecord,
    ["name", "display_name", "app_name", "id", "app_id"],
    selectedAppId || "Select an app",
  );
  const visibleReleases = scopedAppId
    ? releaseRecords.filter((release) => {
        return recordBelongsToApp(release, scopedAppId);
      })
    : [];
  const selectedReleaseId = releaseIdFilter.trim();
  const selectedReleaseRecord =
    selectedReleaseId
      ? visibleReleases.find((release) => recordId(release) === selectedReleaseId) || null
      : null;
  const selectedReleaseInScope = Boolean(selectedReleaseId && selectedReleaseRecord);
  const selectedReleaseLabel = formatRecordText(
    selectedReleaseRecord,
    ["version", "version_name", "id", "release_id"],
    selectedReleaseInScope ? selectedReleaseId : "Release",
  );
  const selectedReleaseNote = selectedReleaseInScope ? releaseNotes[selectedReleaseId] || "" : "";
  const visiblePatches = patchRecords.filter((patch) => {
    if (!scopedAppId) {
      return false;
    }
    const appId = formatRecordText(patch, ["app_id"], "");
    const releaseId = formatRecordText(patch, ["release_id", "release"], "");
    const channel = formatRecordText(patch, ["channel"], "");
    const expectedChannel = channelFilter.trim();

    return (
      appId === scopedAppId &&
      (!selectedReleaseId || releaseId === selectedReleaseId) &&
      (!expectedChannel || !channel || channel === expectedChannel)
    );
  });
  const visiblePatchesNewest = [...visiblePatches].sort(compareNewestPatch);
  const latestPatchRecord = visiblePatchesNewest[0] ?? selectedPatchRecord;
  const selectedRuntimeId =
    runtimeIdFilter.trim() ||
    formatRecordText(selectedReleaseRecord, ["runtime_id", "runtime"], "");
  const operatorEmail =
    operatorState.data?.email || authUser?.email || "No operator signed in";
  const operatorIsAdmin = Boolean(operatorState.data?.is_admin);
  const selectedPatchId = patchId.trim();
  const selectedPatchInScope = selectedPatchId
    ? visiblePatches.some((patch) => recordId(patch) === selectedPatchId)
    : false;
  const patchIdentityAppId = formatRecordText(patchIdentityRecord, ["app_id", "app"], "");
  const patchIdentityReleaseId = formatRecordText(
    patchIdentityRecord,
    ["release_id", "release"],
    "",
  );
  const patchIdentityChannel = formatRecordText(patchIdentityRecord, ["channel"], "");
  const patchScopeMismatches = [
    scopedAppId && patchIdentityAppId && patchIdentityAppId !== scopedAppId
      ? `patch app ${patchIdentityAppId} does not match selected app ${scopedAppId}`
      : "",
    selectedReleaseId &&
    patchIdentityReleaseId &&
    patchIdentityReleaseId !== selectedReleaseId
      ? `patch release ${patchIdentityReleaseId} does not match selected release ${selectedReleaseId}`
      : "",
    channelFilter.trim() &&
    patchIdentityChannel &&
    patchIdentityChannel !== channelFilter.trim()
      ? `patch channel ${patchIdentityChannel} does not match selected channel ${channelFilter.trim()}`
      : "",
  ].filter(Boolean);
  const patchScopeWarning = patchScopeMismatches.length
    ? patchScopeMismatches.join("; ")
    : selectedPatchId && selectedPatchRecord && !selectedPatchInScope
      ? "Selected patch is outside the current app/release/channel scope."
      : "";
  const patchHealthRecordId = patchRecord
    ? recordId(patchRecord) || formatRecordText(patchRecord, ["patch_id"], "")
    : "";
  const patchHealthLoadedForSelectedPatch =
    patchHealthState.status === "ready" &&
    Boolean(patchRecord) &&
    (!patchHealthRecordId || patchHealthRecordId === selectedPatchId);
  const rollbackArmed =
    rollbackConfirmArmed &&
    Boolean(patchIdentityRecord) &&
    patchHealthLoadedForSelectedPatch &&
    !patchScopeWarning;
  const rollbackBlockedReason = !rollbackTarget
    ? "Select a patch from this app first."
    : !patchIdentityRecord
      ? "Load a patch identity before rollback."
      : patchScopeWarning
        ? patchScopeWarning
        : !patchHealthLoadedForSelectedPatch
          ? patchHealthState.status === "loading"
            ? "Loading patch health before rollback."
            : "Load patch health for this patch before rollback."
        : rollbackConfirm.trim() !== rollbackTarget
          ? "Type the exact patch ID to arm rollback."
          : "";
  const latestPatchLabel = latestPatchRecord
    ? `#${formatRecordText(latestPatchRecord, ["number", "patch_number"], "0")}`
    : "none";
  const releaseArtifactRows: Array<{
    name: string;
    platform: string;
    size: string;
    hash: string;
  }> = selectedReleaseRecord
    ? [
        {
          name: "store base",
          platform: platformLabel(formatRecordText(selectedReleaseRecord, ["platform"], "")),
          size: formatBytesLabel(
            getRecordValue(selectedReleaseRecord, [
              "uploaded_artifact_bytes",
              "artifact_bytes",
              "aab_bytes",
              "apk_bytes",
              "size_bytes",
            ]),
          ),
          hash: shortHash(selectedReleaseRecord),
        },
        latestPatchRecord
          ? {
              name: `latest patch ${latestPatchLabel}`,
              platform: platformLabel(formatRecordText(selectedReleaseRecord, ["platform"], "")),
              size: formatBytesLabel(
                getRecordValue(latestPatchRecord, [
                  "bundle_bytes",
                  "code_artifact_bytes",
                  "artifact_bytes",
                  "size_bytes",
                ]),
              ),
              hash: shortHash(latestPatchRecord),
            }
          : null,
      ].filter(
        (row): row is { name: string; platform: string; size: string; hash: string } =>
          Boolean(row),
      )
    : [];
  const rolledBackVisiblePatches = visiblePatches.filter((patch) =>
    recordFlag(patch, ["rolled_back", "rollback", "is_rolled_back"]),
  );
  const activeVisiblePatchCount = Math.max(
    visiblePatches.length - rolledBackVisiblePatches.length,
    0,
  );
  const patchStateBars = [
    {
      label: "Active",
      value: activeVisiblePatchCount,
      helper: "still eligible for patch-check",
      tone: "bg-black",
    },
    {
      label: "Rolled back",
      value: rolledBackVisiblePatches.length,
      helper: "server suppressed",
      tone: "bg-[#55555a]",
    },
    {
      label: "Selected",
      value: patchId.trim() ? 1 : 0,
      helper: "loaded into health/rollback",
      tone: "bg-[#9a9aa1]",
    },
  ];
  const patchStateMax = Math.max(...patchStateBars.map((bar) => bar.value), 1);
  const productView = buildProductReadinessView({
    product: productState.data,
    appCount: appRecords.length,
    releaseCount: releaseRecords.length,
    patchCount: patchRecords.length,
    rolledBackPatchCount: rolledBackVisiblePatches.length,
  });
  const selectedAppMissing = Boolean(
    selectedAppId &&
      authToken &&
      !inventoryLoading &&
      operatorState.status === "ready" &&
      !selectedAppRecord,
  );
  const selectedReleaseMissing = Boolean(
    scopedAppId && selectedReleaseId && !inventoryLoading && !selectedReleaseRecord,
  );
  const scopeSelectionWarning = selectedAppMissing
    ? `App ${selectedAppId} is not visible for ${operatorEmail}. Choose an app from your inventory.`
    : selectedReleaseMissing
      ? `Release ${selectedReleaseId} is not visible for ${selectedAppName}. Choose a release from this app.`
      : "";
  const isLocalOperatorPreview =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";
  const localConfigPreviewError =
    isLocalOperatorPreview &&
    configState.error?.toLowerCase().includes("http 404");
  const visibleConfigError = localConfigPreviewError ? null : configState.error;
  const localPreviewNotice = localConfigPreviewError
    ? "Local preview: hosted auth and inventory run on the Vercel URL."
    : null;
  // Sign-in is only actionable when firebase public config actually carries the
  // essential keys. A 200 with an empty/partial config, or an error response,
  // must surface an explicit diagnostic instead of a silently-disabled button.
  const firebaseConfigReady =
    configState.status === "ready" &&
    Boolean(
      configState.data?.firebase?.apiKey && configState.data?.firebase?.projectId,
    );
  const signInPreparing =
    configState.status === "idle" || configState.status === "loading";
  const signInConfigDiagnostic =
    configState.status === "error" && !localConfigPreviewError
      ? `Sign-in is not configured — ${visibleConfigError || configState.error}`
      : configState.status === "ready" && !firebaseConfigReady
        ? "Sign-in is not configured — Firebase public config is missing required keys (apiKey / projectId)."
        : null;
  const cliLoginPending = Boolean(cliLoginCallback && cliLoginState);
  const isProductSection = isProductLayerTab(operatorTab);
  const appSummaries: AppSummary[] = useMemo(
    () =>
      appRecords
        .map((app) => {
          const id = recordId(app);
          const analytics = fleetAnalytics[id];
          return {
            id,
            name: formatRecordText(app, ["name", "display_name", "app_name"], id),
            platforms: platformsByApp[id] ?? [],
            owner: formatRecordText(app, ["owner_email"], ""),
            analytics,
            view: analytics && analytics.status !== "idle" ? buildAnalyticsView(analytics) : undefined,
          };
        })
        .filter((app) => app.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [appRecords, fleetAnalytics, platformsByApp],
  );
  const appHealthById: Record<string, AppHealth> = Object.fromEntries(
    appSummaries.map((app) => [app.id, digestApp(app).health]),
  );
  const selectedSummary = appSummaries.find((app) => app.id === scopedAppId) ?? null;
  const selectedDigest = digestApp(selectedSummary ?? {});
  const selectedRows = selectedSummary?.view?.rows ?? [];
  const selectedInstalls = selectedSummary?.view?.installs ?? null;
  const releasesNewestFirst = [...visibleReleases].sort((a, b) => recordTimeValue(b) - recordTimeValue(a));
  const releasePlatforms = releasesNewestFirst.map((release) => ({
    id: recordId(release),
    platform: formatRecordText(release, ["platform"], ""),
  }));
  const releaseDigests: ReleaseDigest[] = releasesNewestFirst
    .map((release) => {
      const id = recordId(release);
      const rows = selectedRows.filter((row) => row.releaseId === id);
      const rolledBack = rows.filter((row) => row.rolledBack).length;
      const latest = rows.reduce<(typeof rows)[number] | null>(
        (best, row) => (!best || row.patchNumber > best.patchNumber ? row : best),
        null,
      );
      const platform = formatRecordText(release, ["platform"], "");
      return {
        id,
        version: formatRecordText(release, ["version", "version_name"], id),
        platform,
        createdAt: recordDateLabel(release),
        patches: rows.length,
        live: rows.length - rolledBack,
        rolledBack,
        latest,
        installs: releaseInstalls(selectedInstalls, releasePlatforms, id),
      };
    });
  const releaseVersionById = new Map(
    visibleReleases.map((release) => [recordId(release), formatRecordText(release, ["version", "version_name"], recordId(release))]),
  );
  const deliveryByPatchId = new Map(selectedRows.map((row) => [row.patchId, row]));
  const patchListRows: PatchListRow[] = visiblePatchesNewest.map((patch) => {
    const id = recordId(patch);
    const releaseId = formatRecordText(patch, ["release_id", "release"], "");
    return {
      id,
      number: formatRecordText(patch, ["number", "patch_number"], "?"),
      releaseId,
      releaseVersion: releaseVersionById.get(releaseId) ?? releaseId,
      channel: formatRecordText(patch, ["channel"], "stable"),
      kind: formatRecordText(patch, ["kind", "patch_kind", "type"], "unknown"),
      rollout: formatRecordText(patch, ["rollout_percent"], ""),
      rolledBack: recordFlag(patch, ["rolled_back", "rollback", "is_rolled_back"]),
      createdAt: recordDateLabel(patch),
      delivery: deliveryByPatchId.get(id) ?? null,
    };
  });
  // Live patches for the rollback picker: failing ones first, then newest release first.
  const rollbackChoices = selectedRows
    .filter((row) => !row.rolledBack)
    .sort(
      (a, b) =>
        Number(b.failedDevices > 0) - Number(a.failedDevices > 0) ||
        b.releaseId.localeCompare(a.releaseId) ||
        b.patchNumber - a.patchNumber,
    )
    .map((row) => ({
      id: row.patchId,
      label: `#${row.patchNumber} on ${releaseVersionById.get(row.releaseId) ?? row.releaseId}${
        row.failedDevices ? ` · failing on ${row.failedDevices}` : row.observed ? ` · ${row.successfulDevices} booted` : ""
      }`,
    }));
  const sectionLabels: Record<OperatorTab, string> = {
    overview: "Overview",
    analytics: "Device health",
    releases: "Releases",
    patches: "Patches",
    health: "Patch health",
    rollback: "Roll back",
    ownership: "Access",
    developer: "CLI setup",
    billing: "Plan",
    trust: "Security",
  };
  const crumbs: Crumb[] = isProductSection
    ? [{ label: "Workspace" }, { label: sectionLabels[operatorTab] }]
    : [
        { label: "Apps", onClick: goHome },
        ...(scopedAppId ? [{ label: selectedAppName, onClick: () => selectApp(scopedAppId) }] : []),
        ...(scopedAppId && operatorTab !== "overview" ? [{ label: sectionLabels[operatorTab] }] : []),
        ...(selectedReleaseInScope ? [{ label: selectedReleaseLabel, mono: true }] : []),
      ];
  const inventoryStatusText = inventoryLoading
    ? "Refreshing…"
    : inventoryStale
      ? "May be out of date, refresh"
      : inventoryReceivedAt
        ? `Updated ${new Date(inventoryReceivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "";

  async function deliverCliLogin(
    user: FirebaseAuthUser,
    token: string,
    config: FirebaseConfigResponse,
  ) {
    if (!cliLoginCallback || !cliLoginState || cliLoginDeliveredRef.current) {
      return;
    }

    const callbackURL = new URL(cliLoginCallback);
    const allowedLoopback =
      callbackURL.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(callbackURL.hostname);
    if (!allowedLoopback) {
      throw new Error("CLI login callback must target local loopback HTTP.");
    }

    const response = await fetch(callbackURL.toString(), {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: cliLoginState,
        idToken: token,
        refreshToken: user.refreshToken || "",
        email: user.email || "",
        apiKey: config.firebase.apiKey || "",
        projectId: config.firebase.projectId || "",
      }),
    });
    if (!response.ok) {
      throw new Error(`CLI login callback returned HTTP ${response.status}.`);
    }

    cliLoginDeliveredRef.current = true;
    const params = new URLSearchParams(window.location.search);
    params.delete("cli_login_callback");
    params.delete("cli_login_state");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/operator.html?${query}` : "/operator.html");
  }

  async function fetchOperatorJson<T>(
    path: string,
    tokenOverride?: string,
    init: RequestInit = {},
  ) {
    const token = tokenOverride || (authUser ? await authUser.getIdToken() : authToken);
    if (!token) {
      throw new Error("Sign in as an operator before calling the control plane.");
    }
    if (!tokenOverride && token !== authToken) {
      setAuthToken(token);
    }

    const response = await fetch(path, {
      method: init.method || "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body,
      signal: init.signal,
    });

    return readApiJson<T>(response);
  }

  async function loadControlPlaneHealth(tokenOverride?: string) {
    setHealthState({ status: "loading", data: null, error: null });

    try {
      const data = await fetchOperatorJson<JsonRecord>(
        "/api/operator/healthz",
        tokenOverride,
      );
      setHealthState({
        status: "ready",
        data,
        error: null,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      setHealthState({
        status: "error",
        data: null,
        error: errorMessage(error),
      });
    }
  }

  async function loadProductReadiness(tokenOverride?: string) {
    setProductState({ status: "loading", data: null, error: null });

    try {
      const data = await fetchOperatorJson<JsonRecord>(
        "/api/operator/product-readiness",
        tokenOverride,
      );
      setProductState({
        status: "ready",
        data,
        error: null,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      setProductState({
        status: "error",
        data: null,
        error: errorMessage(error),
      });
    }
  }

  async function loadInventory(
    tokenOverride?: string,
    filters: Partial<{
      appId: string;
      releaseId: string;
      runtimeId: string;
      channel: string;
      patch: string;
    }> = {},
  ) {
    const nextAppId = filters.appId ?? appIdFilter;
    const nextReleaseId = filters.releaseId ?? releaseIdFilter;
    const nextRuntimeId = filters.runtimeId ?? runtimeIdFilter;
    const nextChannel = filters.channel ?? channelFilter;
    const nextPatchId = filters.patch ?? patchId;

    // Cancel any inventory load still in flight so a stale response can never
    // overwrite the newest scope selection.
    inventoryAbortRef.current?.abort();
    const abortController = new AbortController();
    inventoryAbortRef.current = abortController;
    const { signal } = abortController;

    setAppsState({ status: "loading", data: null, error: null });
    setReleasesState({ status: "loading", data: null, error: null });
    setPatchesState({ status: "loading", data: null, error: null });

    try {
      const apps = await fetchOperatorJson<JsonRecord[]>(
        "/api/operator/apps",
        tokenOverride,
        { signal },
      );
      setAppsState({
        status: "ready",
        data: apps,
        error: null,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setAppsState({
        status: "error",
        data: null,
        error: errorMessage(error),
      });
    }

    try {
      const releases = await fetchOperatorJson<JsonRecord[]>(
        operatorPath("/api/operator/releases", { app_id: nextAppId }),
        tokenOverride,
        { signal },
      );
      setReleasesState({
        status: "ready",
        data: releases,
        error: null,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setReleasesState({
        status: "error",
        data: null,
        error: errorMessage(error),
      });
    }

    try {
      const patches = await fetchOperatorJson<JsonRecord[]>(
        operatorPath("/api/operator/patches", {
          app_id: nextAppId,
          release_id: nextReleaseId,
          runtime_id: nextRuntimeId,
          channel: nextChannel,
        }),
        tokenOverride,
        { signal },
      );
      setPatchesState({
        status: "ready",
        data: patches,
        error: null,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setPatchesState({
        status: "error",
        data: null,
        error: errorMessage(error),
      });
    }

    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries({
      app_id: nextAppId,
      release_id: nextReleaseId,
      runtime_id: nextRuntimeId,
      channel: nextChannel,
    })) {
      if (value.trim()) {
        params.set(key, value.trim());
      } else {
        params.delete(key);
      }
    }
    if (nextPatchId.trim()) {
      params.set("patch", nextPatchId.trim());
    } else {
      params.delete("patch");
      params.delete("patch_id");
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/operator.html?${query}` : "/operator.html");
  }

  function refreshOperatorSurface() {
    void loadControlPlaneHealth();
    void loadProductReadiness();
    void loadInventory();
    void loadFleetAnalytics(appRecords.map(recordId).filter(Boolean));
    if (operatorTab === "analytics" && selectedAppId) {
      void loadAnalytics(selectedAppId);
    }
  }

  async function loadFleetAnalytics(appIds: string[]) {
    // Enough for a real workspace; beyond this the list is searched, not scanned.
    const ids = appIds.slice(0, 40);
    await Promise.all(
      ids.map(async (id) => {
        try {
          const data = await fetchOperatorJson<JsonRecord>(
            `/api/operator/analytics?app_id=${encodeURIComponent(id)}`,
          );
          setFleetAnalytics((prev) => ({
            ...prev,
            [id]: { status: "ready", data, error: null, receivedAt: new Date().toISOString() },
          }));
        } catch (error) {
          setFleetAnalytics((prev) => ({
            ...prev,
            [id]: { status: "error", data: null, error: errorMessage(error) },
          }));
        }
      }),
    );
  }

  function goHome() {
    setAppIdFilter("");
    setReleaseIdFilter("");
    setRuntimeIdFilter("");
    setChannelFilter("stable");
    setPatchId("");
    setRollbackConfirm("");
    setPatchHealthState(idleState);
    setRollbackState(idleState);
    setOperatorTab("overview");
    setReleaseTab("overview");
    void loadInventory(undefined, {
      appId: "",
      releaseId: "",
      runtimeId: "",
      channel: "stable",
      patch: "",
    });
  }

  function selectApp(appId: string) {
    setAppIdFilter(appId);
    setReleaseIdFilter("");
    setRuntimeIdFilter("");
    setChannelFilter("stable");
    setPatchId("");
    setRollbackConfirm("");
    setPatchHealthState(idleState);
    setRollbackState(idleState);
    setOperatorTab("overview");
    setReleaseTab("overview");
    void loadInventory(undefined, {
      appId,
      releaseId: "",
      runtimeId: "",
      channel: "stable",
      patch: "",
    });
  }

  function selectRelease(releaseId: string) {
    setReleaseIdFilter(releaseId);
    setPatchId("");
    setRollbackConfirm("");
    setPatchHealthState(idleState);
    setRollbackState(idleState);
    setOperatorTab("releases");
    setReleaseTab("overview");
    void loadInventory(undefined, {
      appId: scopedAppId,
      releaseId,
      patch: "",
    });
  }

  function applyScopeFilters() {
    void loadInventory(undefined, {
      appId: scopedAppId,
      releaseId: releaseIdFilter,
      runtimeId: runtimeIdFilter,
      channel: channelFilter,
      patch: patchId,
    });
  }

  function clearScopeFilters() {
    setReleaseIdFilter("");
    setRuntimeIdFilter("");
    setChannelFilter("stable");
    setPatchId("");
    setRollbackConfirm("");
    setPatchHealthState(idleState);
    setRollbackState(idleState);
    setOperatorTab("overview");
    void loadInventory(undefined, {
      appId: scopedAppId,
      releaseId: "",
      runtimeId: "",
      channel: "stable",
      patch: "",
    });
  }

  function openRollbackFor(targetPatchId: string) {
    setPatchId(targetPatchId);
    setRollbackConfirm("");
    setRollbackState(idleState);
    setOperatorTab("rollback");
    void loadPatchHealth(targetPatchId);
  }

  function selectPatch(nextPatchId: string) {
    setPatchId(nextPatchId);
    setRollbackConfirm("");
    setRollbackState(idleState);
    setOperatorTab("health");
    void loadPatchHealth(nextPatchId);
  }

  // Delivery analytics for the selected app: the control plane derives every number from device boot
  // reports (GET /v1/analytics via /api/operator/analytics); nothing is computed here.
  async function loadAnalytics(appId: string) {
    const trimmedAppId = appId.trim();
    if (!trimmedAppId) {
      return;
    }
    analyticsAbortRef.current?.abort();
    const abortController = new AbortController();
    analyticsAbortRef.current = abortController;
    analyticsLoadedForRef.current = trimmedAppId;
    setAnalyticsState({ status: "loading", data: null, error: null });
    try {
      const data = await fetchOperatorJson<JsonRecord>(
        `/api/operator/analytics?app_id=${encodeURIComponent(trimmedAppId)}`,
        undefined,
        { signal: abortController.signal },
      );
      setAnalyticsState({ status: "ready", data, error: null, receivedAt: new Date().toISOString() });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setAnalyticsState({ status: "error", data: null, error: errorMessage(error) });
    }
  }

  async function loadPatchHealth(patchIdOverride?: string) {
    const trimmedPatchId = (patchIdOverride ?? patchId).trim();
    if (!trimmedPatchId) {
      setPatchHealthState({
        status: "error",
        data: null,
        error: "Enter a known patch ID first.",
      });
      return;
    }

    if (patchIdOverride !== undefined) {
      setPatchId(trimmedPatchId);
    }

    patchHealthAbortRef.current?.abort();
    const abortController = new AbortController();
    patchHealthAbortRef.current = abortController;

    setPatchHealthState({ status: "loading", data: null, error: null });

    try {
      const data = await fetchOperatorJson<JsonRecord>(
        `/api/operator/patch-health?patch_id=${encodeURIComponent(trimmedPatchId)}`,
        undefined,
        { signal: abortController.signal },
      );
      setPatchHealthState({
        status: "ready",
        data,
        error: null,
        receivedAt: new Date().toISOString(),
      });

      const params = new URLSearchParams(window.location.search);
      params.set("patch", trimmedPatchId);
      window.history.replaceState(null, "", `/operator.html?${params.toString()}`);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setPatchHealthState({
        status: "error",
        data: null,
        error: errorMessage(error),
      });
    }
  }

  async function rollbackPatch() {
    const trimmedPatchId = patchId.trim();
    if (!trimmedPatchId) {
      setRollbackState({
        status: "error",
        data: null,
        error: "Select or enter a patch ID before rollback.",
      });
      return;
    }
    if (rollbackConfirm.trim() !== trimmedPatchId) {
      setRollbackState({
        status: "error",
        data: null,
        error: "Type the exact patch ID to arm rollback.",
      });
      return;
    }
    if (!patchIdentityRecord) {
      setRollbackState({
        status: "error",
        data: null,
        error: "Load the patch identity before rollback.",
      });
      return;
    }
    if (patchScopeWarning) {
      setRollbackState({
        status: "error",
        data: null,
        error: patchScopeWarning,
      });
      return;
    }
    if (!patchHealthLoadedForSelectedPatch) {
      setRollbackState({
        status: "error",
        data: null,
        error:
          patchHealthState.status === "loading"
            ? "Loading patch health before rollback."
            : "Load patch health for this patch before rollback.",
      });
      return;
    }

    setRollbackState({ status: "loading", data: null, error: null });

    try {
      const data = await fetchOperatorJson<JsonRecord>(
        `/api/operator/rollback?patch_id=${encodeURIComponent(trimmedPatchId)}`,
        undefined,
        { method: "POST" },
      );
      setRollbackState({
        status: "ready",
        data,
        error: null,
        receivedAt: new Date().toISOString(),
      });
      await loadPatchHealth(trimmedPatchId);
    } catch (error) {
      setRollbackState({
        status: "error",
        data: null,
        error: errorMessage(error),
      });
    }
  }

  async function signIn(provider: "google" | "github") {
    setAuthError(null);

    try {
      if (configState.status !== "ready") {
        throw new Error("Firebase config is not ready yet.");
      }

      const firebase = await loadFirebaseCompat();
      const authProvider =
        provider === "github"
          ? new firebase.auth.GithubAuthProvider()
          : new firebase.auth.GoogleAuthProvider();

      if (provider === "google" && typeof authProvider.setCustomParameters === "function") {
        authProvider.setCustomParameters({ prompt: "select_account" });
      }

      if (provider === "github" && typeof authProvider.addScope === "function") {
        authProvider.addScope("read:user");
      }

      try {
        await firebase.auth().signInWithPopup(authProvider);
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code)
            : "";
        if (
          code === "auth/popup-blocked" ||
          code === "auth/popup-closed-by-user" ||
          code === "auth/cancelled-popup-request"
        ) {
          await firebase.auth().signInWithRedirect(authProvider);
          return;
        }
        throw error;
      }
    } catch (error) {
      setAuthError(errorMessage(error));
    }
  }

  async function signOut() {
    setAuthError(null);

    try {
      await window.firebase?.auth().signOut();
      setAuthToken(null);
      setAuthUser(null);
      setOperatorState(idleState);
      setHealthState(idleState);
      setAppsState(idleState);
      setReleasesState(idleState);
      setPatchesState(idleState);
      setPatchHealthState(idleState);
      setRollbackState(idleState);
      setProductState(idleState);
      setRollbackConfirm("");
      setAppIdFilter("");
      setReleaseIdFilter("");
      setRuntimeIdFilter("");
      setChannelFilter("stable");
      setPatchId("");
      setReleaseTab("overview");
    } catch (error) {
      setAuthError(errorMessage(error));
    }
  }

  useEffect(() => {
    if (operatorTab !== "analytics" || !authToken || !selectedAppId) {
      return;
    }
    if (analyticsLoadedForRef.current === selectedAppId && analyticsState.status !== "idle") {
      return;
    }
    void loadAnalytics(selectedAppId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorTab, authToken, selectedAppId]);

  useEffect(() => {
    const target = patchId.trim();
    if (!authToken || !target || (operatorTab !== "rollback" && operatorTab !== "health")) {
      return;
    }
    if (patchHealthState.status !== "idle") {
      return;
    }
    void loadPatchHealth(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, operatorTab, patchId]);

  const appIdsKey = appRecords.map(recordId).filter(Boolean).sort().join(",");
  useEffect(() => {
    if (!authToken || !appIdsKey) {
      return;
    }
    const missing = appIdsKey.split(",").filter((id) => !fleetAnalytics[id]);
    if (missing.length) {
      void loadFleetAnalytics(missing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, appIdsKey]);

  useEffect(() => {
    if (!releaseRecords.length) {
      return;
    }
    setPlatformsByApp((prev) => {
      const next = { ...prev };
      for (const release of releaseRecords) {
        const appId = formatRecordText(release, ["app_id"], "");
        const platform = formatRecordText(release, ["platform"], "").toLowerCase();
        if (!appId || !platform) continue;
        const seen = new Set(next[appId] ?? []);
        seen.add(platform);
        next[appId] = [...seen].sort();
      }
      return next;
    });
  }, [releaseRecords]);

  useEffect(() => {
    // The analytics page's fresher answer for the open app is the one the rest of the console shows too.
    if (analyticsState.status === "ready" && analyticsLoadedForRef.current) {
      const id = analyticsLoadedForRef.current;
      setFleetAnalytics((prev) => ({ ...prev, [id]: analyticsState }));
    }
  }, [analyticsState]);

  useEffect(() => {
    // The open section is part of the URL, so a link or a reload lands on the same screen.
    const params = new URLSearchParams(window.location.search);
    if (operatorTab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", operatorTab);
    }
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [operatorTab]);

  useEffect(() => {
    setRollbackConfirm("");
    setRollbackState(idleState);
    setRollbackDialogOpen(false);
  }, [patchId]);

  useEffect(() => {
    if (!rollbackDialogOpen) {
      return;
    }
    rollbackConfirmButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRollbackDialogOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rollbackDialogOpen]);

  useEffect(() => {
    window.localStorage.setItem(
      "soroq.operator.releaseNotes",
      JSON.stringify(releaseNotes),
    );
  }, [releaseNotes]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function bootOperatorAuth() {
      setConfigState({ status: "loading", data: null, error: null });

      try {
        const response = await fetch("/api/operator/firebase-config", {
          headers: { Accept: "application/json" },
        });
        const config = await readApiJson<FirebaseConfigResponse>(response);

        if (cancelled) {
          return;
        }

        setConfigState({
          status: "ready",
          data: config,
          error: null,
          receivedAt: new Date().toISOString(),
        });

        const firebase = await loadFirebaseCompat();
        if (!firebase.apps?.length) {
          firebase.initializeApp(config.firebase);
        }

        const auth = firebase.auth();
        if (typeof auth.getRedirectResult === "function") {
          try {
            await auth.getRedirectResult();
          } catch (error) {
            if (!cancelled) {
              setAuthError(errorMessage(error));
            }
          }
        }

        const maybeUnsubscribe = auth.onAuthStateChanged(
          async (user: FirebaseAuthUser | null) => {
            if (cancelled) {
              return;
            }

            setAuthUser(user);
            setAuthError(null);

            if (!user) {
              setAuthToken(null);
              setOperatorState(idleState);
              setHealthState(idleState);
              setAppsState(idleState);
              setReleasesState(idleState);
              setPatchesState(idleState);
              setPatchHealthState(idleState);
              setRollbackState(idleState);
              setProductState(idleState);
              setRollbackConfirm("");
              setAppIdFilter("");
              setReleaseIdFilter("");
              setRuntimeIdFilter("");
              setChannelFilter("stable");
              setPatchId("");
              setReleaseTab("overview");
              return;
            }

            setOperatorState({ status: "loading", data: null, error: null });

            try {
              const token = await user.getIdToken();
              if (cancelled) {
                return;
              }

              setAuthToken(token);
              const profile = await fetchOperatorJson<OperatorProfile>(
                "/api/operator/me",
                token,
              );

              if (cancelled) {
                return;
              }

              setOperatorState({
                status: "ready",
                data: profile,
                error: null,
                receivedAt: new Date().toISOString(),
              });
              await deliverCliLogin(user, token, config);
              await loadControlPlaneHealth(token);
              await loadProductReadiness(token);
              await loadInventory(token);
            } catch (error) {
              if (cancelled) {
                return;
              }

              setAuthToken(null);
              setOperatorState({
                status: "error",
                data: null,
                error: errorMessage(error),
              });
            }
          },
        );

        if (typeof maybeUnsubscribe === "function") {
          unsubscribe = maybeUnsubscribe;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setConfigState({
          status: "error",
          data: null,
          error: errorMessage(error),
        });
      }
    }

    void bootOperatorAuth();

    return () => {
      cancelled = true;
      unsubscribe?.();
      inventoryAbortRef.current?.abort();
      patchHealthAbortRef.current?.abort();
    };
  }, []);

  if (
    isOperatorRoute(window.location.pathname) ||
    window.location.hostname === "console.soroq.dev"
  ) {
    // Primary UX fix: an unauthenticated operator gets a focused sign-in screen,
    // not the full dashboard chrome rendered behind a disabled control. The
    // dashboard (sidebar/topbar/command-center/tiles) is never constructed until
    // an operator token exists.
    if (!authToken) {
      return (
        <main className="operator-backdrop grid min-h-screen place-items-center overflow-x-hidden px-4 py-10 text-[#111111]">
          <section className="operator-panel w-full max-w-md p-6 sm:p-8">
            <a
              href="/"
              className="focus-ring inline-flex items-center gap-3"
              aria-label="Back to soroq.dev home"
            >
              <SoroqMark className="size-9" />
              <span>
                <span className="block text-sm font-semibold tracking-tight">Soroq</span>
                <span className="block text-xs text-[#7a7a80]">Operator console</span>
              </span>
            </a>

            <h1 className="mt-6 text-xl font-semibold tracking-[-0.02em]">
              Sign in to the operator console
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#6d6d72]">
              See how your updates are doing on real devices, find the one that broke something, and roll it back.
            </p>

            {cliLoginPending ? (
              <div className="mt-4">
                <StateNotice
                  tone="warning"
                  message="CLI login in progress — sign in here to return the session to your terminal."
                />
              </div>
            ) : null}

            <Button
              type="button"
              className="focus-ring mt-6 h-10 w-full bg-black px-5 text-white hover:bg-[#2b2b2d]"
              disabled={!firebaseConfigReady}
              aria-disabled={!firebaseConfigReady}
              onClick={() => void signIn("google")}
            >
              {signInPreparing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogIn className="size-4" aria-hidden="true" />
              )}
              {signInPreparing ? "Preparing sign-in…" : "Sign in with Google"}
            </Button>

            <div className="mt-4 grid gap-2">
              {localPreviewNotice ? (
                <StateNotice tone="warning" message={localPreviewNotice} />
              ) : null}
              {signInConfigDiagnostic ? (
                <StateNotice tone="error" message={signInConfigDiagnostic} />
              ) : null}
              {operatorState.error ? (
                <StateNotice tone="error" message={operatorState.error} />
              ) : null}
              {authError ? <StateNotice tone="error" message={authError} /> : null}
            </div>

            <p className="mt-6 border-t border-black/10 pt-4 text-sm text-[#6d6d72]">
              Prefer the terminal? See the{" "}
              <a
                href="https://docs.soroq.dev/cli"
                className="focus-ring font-medium text-black underline underline-offset-4 hover:text-[#2b2b2d]"
              >
                CLI &amp; browser-login docs
              </a>
              .
            </p>
          </section>
        </main>
      );
    }

    return (
      <main className="operator-backdrop min-h-screen overflow-x-clip text-[#111111]">
        <section className="relative z-10 grid min-h-screen min-w-0 grid-cols-[minmax(0,1fr)] content-start lg:grid-cols-[260px_minmax(0,1fr)] lg:content-stretch">
          <ConsoleSidebar
            apps={appSummaries}
            appHealth={appHealthById}
            selectedAppId={scopedAppId}
            operatorTab={operatorTab}
            operatorEmail={operatorEmail}
            signedIn={signedIn}
            configReady={configState.status === "ready"}
            onGoHome={goHome}
            onSelectApp={selectApp}
            onSelectTab={setOperatorTab}
            onSignIn={() => void signIn("google")}
            onSignOut={() => void signOut()}
          />

          <div className="min-w-0 overflow-x-clip">
            <ConsoleTopBar
              crumbs={crumbs}
              apiState={healthState.status}
              statusText={inventoryStatusText}
              statusStale={inventoryStale}
              canRefresh={Boolean(authToken)}
              refreshing={inventoryLoading}
              onRefresh={refreshOperatorSurface}
            />

            <section className="mx-auto grid min-w-0 max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-8 lg:py-8">
              {operatorTab === "analytics" ? (
                <OperatorAnalyticsPage
                  apps={appRecords
                    .map((app) => {
                      const id = recordId(app);
                      return { id, name: formatRecordText(app, ["name", "display_name", "app_name"], id) };
                    })
                    .filter((app) => app.id)
                    .sort((a, b) => a.name.localeCompare(b.name))}
                  selectedAppId={selectedAppId ?? ""}
                  onSelectApp={(appId) => {
                    setAppIdFilter(appId);
                    setReleaseIdFilter("");
                    setRuntimeIdFilter("");
                    setPatchId("");
                    setAnalyticsState(idleState);
                    analyticsLoadedForRef.current = "";
                    const params = new URLSearchParams(window.location.search);
                    if (appId) {
                      params.set("app_id", appId);
                    } else {
                      params.delete("app_id");
                    }
                    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
                  }}
                  state={analyticsState}
                  view={buildAnalyticsView(analyticsState)}
                  canLoad={Boolean(authToken)}
                  onRefresh={() => void loadAnalytics(selectedAppId ?? "")}
                  onOpenRollback={(targetPatchId) => {
                    setPatchId(targetPatchId);
                    setRollbackConfirm("");
                    setRollbackState(idleState);
                    setOperatorTab("rollback");
                  }}
                />
              ) : null}

              {(
                visibleConfigError ||
                localPreviewNotice ||
                authError ||
                operatorState.error ||
                inventoryError ||
                scopeSelectionWarning ||
                productState.error
              ) ? (
                <div className="grid gap-2">
                  {localPreviewNotice ? (
                    <StateNotice tone="warning" message={localPreviewNotice} />
                  ) : null}
                  {visibleConfigError ? (
                    <StateNotice tone="error" message={visibleConfigError} />
                  ) : null}
                  {authError ? <StateNotice tone="error" message={authError} /> : null}
                  {operatorState.error ? (
                    <StateNotice tone="error" message={operatorState.error} />
                  ) : null}
                  {inventoryError ? (
                    <StateNotice tone="error" message={inventoryError} />
                  ) : null}
                  {scopeSelectionWarning ? (
                    <StateNotice tone="warning" message={scopeSelectionWarning} />
                  ) : null}
                  {productState.error ? (
                    <StateNotice tone="error" message={productState.error} />
                  ) : null}
                </div>
              ) : null}

              {isProductSection ? (
                <div className="mt-4">
                  <ProductLayerTabPanel
                    activeTab={operatorTab}
                    productState={productState}
                    view={productView}
                    operatorEmail={operatorEmail}
                    signedIn={signedIn}
                  />
                </div>
              ) : !authToken ? (
                <section className="operator-panel mt-4 p-6 md:p-8">
                  <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                    <span className="grid size-11 place-items-center border border-black bg-black text-white">
                      <LockKeyhole className="size-5" />
                    </span>
                    <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em]">
                      Sign in to load the console.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6d6d72]">
                      Inventory, release health, patch history, and rollback controls stay hidden until an enabled operator signs in.
                    </p>
                    <Button
                      type="button"
                      className="mt-5 h-9 bg-black px-5 text-white hover:bg-[#2b2b2d]"
                      disabled={configState.status !== "ready"}
                      onClick={() => void signIn("google")}
                    >
                      Sign in with Google
                    </Button>
                  </div>
                </section>
              ) : (
              operatorTab === "analytics" ? null : !selectedAppInScope || !selectedSummary ? (
                <AppsHome
                  apps={appSummaries}
                  loading={inventoryLoading || appsState.status === "idle"}
                  search={appSearch}
                  onSearch={setAppSearch}
                  onSelectApp={selectApp}
                  isAdmin={operatorIsAdmin}
                />
              ) : (
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
                {!selectedReleaseInScope ? (
                  <AppHeader
                    app={selectedSummary}
                    digest={selectedDigest}
                    section={operatorTab === "overview" ? undefined : sectionLabels[operatorTab]}
                    actions={
                      operatorTab === "overview" ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 border-black/15 bg-white text-black hover:bg-[#f3f3f4]"
                          onClick={() => setOperatorTab("rollback")}
                        >
                          <RotateCcw className="size-4" />
                          Roll back a patch
                        </Button>
                      ) : null
                    }
                  />
                ) : null}
                {!selectedReleaseInScope && operatorTab === "patches" ? (
                    <form
                      className="flex flex-wrap items-end gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        applyScopeFilters();
                      }}
                    >
                      <label className="grid min-w-[200px] flex-1 gap-1 text-xs text-[#6d6d72]">
                        Release
                        <select
                          value={releaseIdFilter}
                          onChange={(event) => setReleaseIdFilter(event.target.value)}
                          className="focus-ring h-9 rounded-md border border-black/10 bg-white px-2.5 text-sm text-black"
                        >
                          <option value="">All releases</option>
                          {releaseDigests.map((release) => (
                            <option key={release.id} value={release.id}>
                              {release.version} ({release.id})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid w-32 gap-1 text-xs text-[#6d6d72]">
                        Channel
                        <input
                          value={channelFilter}
                          onChange={(event) => setChannelFilter(event.target.value)}
                          placeholder="stable"
                          className="focus-ring h-9 rounded-md border border-black/10 bg-white px-2.5 text-sm text-black outline-none placeholder:text-[#9a9aa1]"
                        />
                      </label>
                      <label className="grid min-w-[160px] flex-1 gap-1 text-xs text-[#6d6d72]">
                        Runtime id
                        <input
                          value={runtimeIdFilter}
                          onChange={(event) => setRuntimeIdFilter(event.target.value)}
                          placeholder="any"
                          className="focus-ring h-9 rounded-md border border-black/10 bg-white px-2.5 font-mono text-xs text-black outline-none placeholder:text-[#9a9aa1]"
                        />
                      </label>
                      <Button
                        type="submit"
                        className="h-9 bg-black px-4 text-white hover:bg-[#2b2b2d]"
                        disabled={!authToken || inventoryLoading}
                      >
                        Apply filters
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 border-black/10 bg-white px-3 text-black hover:bg-[#f3f3f4]"
                        disabled={!authToken || inventoryLoading}
                        onClick={clearScopeFilters}
                      >
                        Reset
                      </Button>
                    </form>
                ) : null}
                  <div className="min-w-0">
                    {selectedReleaseInScope ? (
                      <div className="grid gap-4">
                        <div className="flex flex-col justify-between gap-3 border-b border-black/10 pb-4 md:flex-row md:items-start">
                          <div className="min-w-0">
                            <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#8d8d93]">
                              Release workspace
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">
                              Release {selectedReleaseLabel}
                            </h2>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6d6d72]">
                              {selectedAppName} · {formatRecordText(
                                selectedReleaseRecord,
                                ["flutter_version", "flutter", "runtime_version"],
                                "runtime version not recorded",
                              )} · created {recordDateLabel(selectedReleaseRecord)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 w-fit border-black/10 bg-white text-black hover:bg-[#f3f3f4]"
                            onClick={() => {
                              setReleaseIdFilter("");
                              setReleaseTab("overview");
                              setOperatorTab("releases");
                              void loadInventory(undefined, {
                                appId: scopedAppId,
                                releaseId: "",
                                patch: "",
                              });
                            }}
                          >
                            Back to releases
                          </Button>
                        </div>

                        <div className="flex min-w-0 gap-1 overflow-x-auto border-b border-black/10">
                          {releaseTabs.map(({ key, label, icon: Icon }) => {
                            const active = releaseTab === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`focus-ring flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
                                  active
                                    ? "border-black text-black"
                                    : "border-transparent text-[#6d6d72] hover:text-black"
                                }`}
                                onClick={() => setReleaseTab(key)}
                              >
                                <Icon className="size-4" />
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {releaseTab === "overview" ? (
                          <div className="grid gap-4">
                            <div className="grid gap-3 md:grid-cols-4">
                              <ConsoleMiniStat label="Release" value={selectedReleaseLabel} />
                              <ConsoleMiniStat
                                label="Patches"
                                value={String(visiblePatches.length)}
                              />
                              <ConsoleMiniStat label="Latest" value={latestPatchLabel} />
                              <ConsoleMiniStat
                                label="Channel"
                                value={channelFilter.trim() || "stable"}
                              />
                            </div>

                            <PatchesTable
                              rows={patchListRows}
                              selectedPatchId={patchId.trim()}
                              onInspect={(id) => {
                                selectPatch(id);
                                setReleaseIdFilter("");
                              }}
                              onRollback={(id) => {
                                setReleaseIdFilter("");
                                openRollbackFor(id);
                              }}
                            />
                          </div>
                        ) : null}

                        {releaseTab === "insights" ? (
                          <div className="grid gap-4">
                            <div className="grid gap-3 md:grid-cols-3">
                              {patchMetrics.map((metric) => (
                                <OperatorMetric
                                  key={metric.label}
                                  label={metric.label}
                                  value={formatMetric(metric.value, metric.fallback)}
                                  helper={metric.helper}
                                />
                              ))}
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                              {patchStateBars.slice(0, 2).map((bar) => (
                                <div key={bar.label} className="operator-panel-soft p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="text-sm font-semibold text-black">
                                        Patch {bar.label.toLowerCase()}
                                      </p>
                                      <p className="mt-1 text-xs text-[#6d6d72]">
                                        {bar.helper}
                                      </p>
                                    </div>
                                    <Download className="size-4 text-[#6d6d72]" />
                                  </div>
                                  <p className="mt-5 text-4xl font-semibold tracking-[-0.04em]">
                                    {bar.value}
                                  </p>
                                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e5e5e7]">
                                    <div
                                      className={`h-full rounded-full ${bar.tone}`}
                                      style={{
                                        width: `${Math.max(
                                          bar.value ? 8 : 0,
                                          Math.round((bar.value / patchStateMax) * 100),
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            {!patchRecord ? (
                              <ConsoleEmpty
                                title="Not enough receipt data yet"
                                body="Select a patch from the release overview to load patch-health receipts."
                              />
                            ) : null}
                          </div>
                        ) : null}

                        {releaseTab === "artifacts" ? (
                          <div className="operator-table-shell overflow-x-auto">
                            <div className="grid min-w-[720px] grid-cols-[minmax(220px,1fr)_140px_140px_160px] gap-3 border-b border-black/10 bg-[#f7f7f8] px-4 py-2.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
                              <span>Name</span>
                              <span>Platform</span>
                              <span>Size</span>
                              <span>Hash</span>
                            </div>
                            {releaseArtifactRows.length ? (
                              releaseArtifactRows.map((artifact) => (
                                <div
                                  key={`${artifact.name}-${artifact.hash}`}
                                  className="operator-table-row grid min-w-[720px] grid-cols-[minmax(220px,1fr)_140px_140px_160px] gap-3 border-b border-black/10 px-4 py-3 last:border-b-0"
                                >
                                  <span className="text-sm font-semibold text-black">
                                    {artifact.name}
                                  </span>
                                  <span className="text-sm text-[#6d6d72]">
                                    {artifact.platform}
                                  </span>
                                  <span className="font-mono text-xs text-[#4d4d52]">
                                    {artifact.size}
                                  </span>
                                  <span className="font-mono text-xs text-[#4d4d52]">
                                    {artifact.hash}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-4">
                                <ConsoleEmpty
                                  title="No artifact metadata"
                                  body="The release exists, but artifact size or hash metadata is not available in the operator record."
                                />
                              </div>
                            )}
                          </div>
                        ) : null}

                        {releaseTab === "notes" ? (
                          <div className="grid gap-3">
                            <label className="grid gap-2">
                              <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
                                Private release note
                              </span>
                              <textarea
                                value={selectedReleaseNote}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setReleaseNotes((notes) => ({
                                    ...notes,
                                    [selectedReleaseId]: value,
                                  }));
                                }}
                                placeholder="Add notes for this release on this browser."
                                className="focus-ring min-h-32 border border-black/10 bg-white px-3 py-3 text-sm leading-6 text-black outline-none placeholder:text-[#9a9aa1]"
                              />
                            </label>
                            <p className="text-xs text-[#6d6d72]">
                              Notes are saved locally in this browser until hosted organization notes are added.
                            </p>
                          </div>
                        ) : null}

                        {releaseTab === "settings" ? (
                          <div className="grid gap-4">
                            <div className="grid gap-3 md:grid-cols-3">
                              <ConsoleMiniStat
                                label="App"
                                value={scopedAppId || "not selected"}
                              />
                              <ConsoleMiniStat
                                label="Release ID"
                                value={selectedReleaseId || "not selected"}
                              />
                              <ConsoleMiniStat
                                label="Runtime"
                                value={shortRecord(selectedRuntimeId) || "pending"}
                              />
                            </div>
                            <StateNotice
                              tone="warning"
                              message="Destructive release deletion is not exposed from this console until the backend has a guarded delete API."
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

	                    {!selectedReleaseInScope && operatorTab === "overview" ? (
                      <AppOverview
                        digest={selectedDigest}
                        releases={releaseDigests}
                        installs={selectedInstalls}
                        installsUnavailable={selectedSummary?.view?.installsUnavailable ?? ""}
                        onOpenAnalytics={() => setOperatorTab("analytics")}
                        onOpenRelease={selectRelease}
                        onOpenPatches={() => setOperatorTab("patches")}
                        onOpenRollback={openRollbackFor}
                      />
                    ) : null}

	                    {!selectedReleaseInScope && operatorTab === "releases" ? (
                      <div>
                        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                          <div>
                            <h2 className="text-lg font-semibold tracking-tight">
                              Releases
                            </h2>
	                            <p className="mt-1 text-sm text-[#6d6d72]">
                              Store bases available for this app.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
	                            className="h-9 w-fit rounded-xl border-black/10 bg-white text-black hover:bg-[#f3f3f4]"
                            disabled={!authToken || inventoryLoading}
                            onClick={refreshOperatorSurface}
                          >
                            <RefreshCcw className="size-4" />
                            Refresh
                          </Button>
                        </div>
                        <div className="operator-table-shell overflow-x-auto">
		                          <div className="grid min-w-[760px] grid-cols-[minmax(220px,1fr)_160px_140px_120px] gap-3 border-b border-black/10 bg-[#f7f7f8] px-4 py-2.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
	                            <span>Release</span>
	                            <span>Runtime</span>
                              <span>Channel</span>
                              <span>Patches</span>
	                          </div>
	                          {visibleReleases.length ? (
	                            visibleReleases.map((release) => {
	                              const id = recordId(release);
                                const releasePatchCount = visiblePatches.filter(
                                  (patch) =>
                                    formatRecordText(patch, ["release_id", "release"], "") === id,
                                ).length;
	                              return (
	                                <button
	                                  key={id || JSON.stringify(release)}
	                                  type="button"
		                                  className="operator-table-row grid min-w-[760px] w-full grid-cols-[minmax(220px,1fr)_160px_140px_120px] gap-3 border-b border-black/10 bg-transparent px-4 py-3.5 text-left last:border-b-0"
	                                  disabled={!id}
	                                  onClick={() => selectRelease(id)}
	                                >
	                                  <div>
	                                    <p className="text-sm font-semibold">
                                      {formatRecordText(
                                        release,
                                        ["version", "version_name", "id", "release_id"],
                                        id || "Release",
                                      )}
                                    </p>
	                                    <p className="mt-1 break-all font-mono text-[0.68rem] text-[#7a7a80]">
	                                      {id}
	                                    </p>
	                                  </div>
                                    <span className="break-all font-mono text-xs text-[#6d6d72]">
                                      {formatRecordText(release, ["runtime_id", "runtime"], "runtime pending")}
                                    </span>
                                    <span className="text-sm text-[#6d6d72]">
                                      {formatRecordText(release, ["channel", "track"], channelFilter.trim() || "stable")}
                                    </span>
                                    <span className="text-sm font-semibold text-black">
                                      {releasePatchCount}
                                    </span>
	                                </button>
	                              );
	                            })
	                          ) : (
                            <ConsoleEmpty
                              title="No releases loaded"
                              body="Refresh inventory after selecting an app."
                            />
                          )}
                        </div>
                      </div>
                    ) : null}

                    {!selectedReleaseInScope && operatorTab === "patches" ? (
                      <PatchesTable
                        rows={patchListRows}
                        selectedPatchId={patchId.trim()}
                        onInspect={selectPatch}
                        onRollback={openRollbackFor}
                      />
                    ) : null}

                    {!selectedReleaseInScope && operatorTab === "health" ? (
                      <div className="grid gap-4">
                        {patchScopeWarning ? <StateNotice tone="warning" message={patchScopeWarning} /> : null}
                        <PatchHealthPanel
                          patchId={patchId.trim()}
                          delivery={deliveryByPatchId.get(patchId.trim()) ?? null}
                          identity={patchIdentityRows.map((row) => ({ label: row.label, value: row.value }))}
                          loading={patchHealthState.status === "loading"}
                          error={patchHealthState.error ?? ""}
                          raw={patchRecord}
                          onRollback={() => openRollbackFor(patchId.trim())}
                          onOpenDeviceHealth={() => setOperatorTab("analytics")}
                        />
                      </div>
                    ) : null}

                    {!selectedReleaseInScope && operatorTab === "rollback" ? (
                      <div className="grid gap-4">
	                        <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
	                          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
	                            <div>
                              <h3 className="text-base font-semibold">Withdraw a patch from every device</h3>
                              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6d6d72]">
                                Devices stop receiving it and return to the previous good version on their next launch. Pick the patch, check it is the right one, then type its id to confirm.
                              </p>
                              <label className="mt-4 grid max-w-2xl gap-1 text-xs text-[#6d6d72]">
                                Patch
                                <select
                                  value={patchId}
                                  onChange={(event) => {
                                    if (event.target.value) {
                                      openRollbackFor(event.target.value);
                                    } else {
                                      setPatchId("");
                                    }
                                  }}
                                  className="focus-ring h-9 rounded-md border border-black/10 bg-white px-2.5 text-sm text-black"
                                >
                                  <option value="">Choose a live patch…</option>
                                  {patchId.trim() && !rollbackChoices.some((choice) => choice.id === patchId.trim()) ? (
                                    <option value={patchId.trim()}>{patchId.trim()} (not live)</option>
                                  ) : null}
                                  {rollbackChoices.map((choice) => (
                                    <option key={choice.id} value={choice.id}>
                                      {choice.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                                    {patchIdentityRows.slice(0, 6).map((row) => (
                                      <ConsoleMiniStat
                                        key={row.label}
                                        label={row.label}
                                        value={row.value}
                                      />
                                    ))}
                                  </div>
                                  {rollbackBlockedReason ? (
                                    <div className="mt-4">
                                      <StateNotice
                                        tone={patchScopeWarning ? "error" : "warning"}
                                        message={rollbackBlockedReason}
                                      />
                                    </div>
                                  ) : null}
	                              <input
	                                value={rollbackConfirm}
	                                onChange={(event) =>
	                                  setRollbackConfirm(event.target.value)
	                                }
                                placeholder={rollbackTarget ? `Type ${rollbackTarget}` : "Choose a patch first"}
	                                className="focus-ring mt-4 h-9 w-full border border-black/10 bg-white px-3 font-mono text-sm text-black outline-none placeholder:text-[#9a9aa1]"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
	                              className="focus-ring h-9 border-[#c0392b] bg-[#c0392b] px-5 text-white hover:bg-[#a53125] hover:text-white disabled:border-black/10 disabled:bg-[#e9e9eb] disabled:text-[#8d8d93]"
                              disabled={!rollbackArmed}
                              onClick={() => setRollbackDialogOpen(true)}
                            >
                              {rollbackState.status === "loading" ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <RotateCcw className="size-4" />
                              )}
                              Roll back
                            </Button>
                          </div>
                        </div>

                        {rollbackState.error ? (
                          <StateNotice tone="error" message={rollbackState.error} />
                        ) : null}
                        {rollbackRecord ? (
                          <JsonPreview
                            data={rollbackRecord}
                            empty="Rollback response will appear here."
                          />
                        ) : null}
                        

                        {rollbackDialogOpen ? (
                          <div
                            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
                            onClick={() => setRollbackDialogOpen(false)}
                          >
                            <div
                              role="dialog"
                              aria-modal="true"
                              aria-labelledby="rollback-dialog-title"
                              className="operator-panel w-full max-w-md p-5"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <h2
                                id="rollback-dialog-title"
                                className="text-base font-semibold tracking-[-0.01em]"
                              >
                                Confirm rollback
                              </h2>
                              <p className="mt-2 text-sm leading-6 text-[#6d6d72]">
                                This suppresses future patch-check delivery for patch{" "}
                                <span className="break-all font-mono text-black">
                                  {rollbackTarget}
                                </span>
                                {selectedAppInScope ? ` in ${selectedAppName}` : ""}. This
                                action cannot be undone from the console.
                              </p>
                              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="focus-ring h-9 border-black/10 bg-white px-4 text-black hover:bg-[#f3f3f4]"
                                  onClick={() => setRollbackDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  ref={rollbackConfirmButtonRef}
                                  type="button"
                                  className="focus-ring h-9 bg-black px-5 text-white hover:bg-[#2b2b2d]"
                                  disabled={!rollbackArmed}
                                  onClick={() => {
                                    setRollbackDialogOpen(false);
                                    void rollbackPatch();
                                  }}
                                >
                                  Confirm rollback
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
              </div>
              )
              )}
            </section>
          </div>
        </section>
      </main>
    );
  }

}
