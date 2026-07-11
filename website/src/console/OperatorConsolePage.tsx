import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  AlertCircle,
  BarChart3,
  ChevronRight,
  CircleGauge,
  Download,
  FileArchive,
  FileCode2,
  Home,
  ListChecks,
  Loader2,
  LockKeyhole,
  LogIn,
  PackageCheck,
  RadioTower,
  RefreshCcw,
  RotateCcw,
  Search,
  Server,
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
  OperatorSummaryTile,
  StateNotice,
} from "@/operator/components/ConsolePrimitives";
import {
  OperatorCommandCenter,
  type ScopeFact,
} from "@/operator/components/OperatorCommandCenter";
import { OperatorOverviewPanel } from "@/operator/components/OperatorOverviewPanel";
import { OperatorSidebar } from "@/operator/components/OperatorSidebar";
import { OperatorTopBar } from "@/operator/components/OperatorTopBar";
import {
  ProductLayerTabPanel,
  isProductLayerTab,
} from "@/operator/components/ProductLayerTabs";
import { buildProductReadinessView } from "@/operator/productReadiness";
import {
  apiList,
  collectRecentClients,
  formatMetric,
  formatReceivedAt,
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

function hasAuthProvider(providerConfig: string | undefined, provider: "google" | "github") {
  const providers = (providerConfig || "google")
    .split(/[,\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return providers.includes(provider) || providers.includes("all");
}

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
    const error = new Error(
      extractApiError(payload) || `Request failed with HTTP ${response.status}`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return payload as T;
}

export function errorStatus(error: unknown) {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : null;
  }
  return null;
}

// Platform is a real, populated release field (ios vs android). The App →
// Platform → Channel → Release → Patch hierarchy is derived entirely from these
// existing responses — no backend contract change. Empty/legacy platform values
// default to Android, so an app with only Android releases correctly shows only
// Android.
export function normalizePlatform(value: unknown): "iOS" | "Android" {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  return text === "ios" ? "iOS" : "Android";
}

export function releasePlatform(record: JsonRecord | null | undefined) {
  return normalizePlatform(getRecordValue(record, ["platform"]));
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
  key: Extract<OperatorTab, "overview" | "releases" | "patches" | "health" | "rollback">;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "releases", label: "Releases", icon: TerminalSquare },
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
  const [authUser, setAuthUser] = useState<FirebaseAuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  // Firebase-authenticated but /api/operator/me returned 403: the account is not
  // on the operator allowlist. This is a distinct state from logged-out.
  const [authDenied, setAuthDenied] = useState(false);
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
  const [platformFilter, setPlatformFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("platform") || "";
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
  const [appListLimit, setAppListLimit] = useState(24);
  const [operatorTab, setOperatorTab] = useState<OperatorTab>("overview");
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
  const healthRecord = healthState.data;
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
  const recentClients = collectRecentClients(patchRecord);
  const selectedPatchRecord =
    patchRecords.find((patch) => recordId(patch) === patchId.trim()) ?? null;
  const patchIdentityRecord = mergeRecords(patchRecord, selectedPatchRecord);
  // Patches carry no platform of their own — derive it from the patch's base
  // release so the rollback scope can never be mistaken for another platform.
  const patchReleaseId = formatRecordText(
    patchIdentityRecord,
    ["release_id", "release"],
    "",
  );
  const patchReleaseRecord = patchReleaseId
    ? releaseRecords.find((release) => recordId(release) === patchReleaseId) || null
    : null;
  const patchPlatform = releasePlatform(patchReleaseRecord);
  const patchAppId = formatRecordText(patchIdentityRecord, ["app_id", "app"], "");
  const patchAppRecord = patchAppId
    ? appRecords.find((app) => recordId(app) === patchAppId) || null
    : null;
  const patchReleaseLabel =
    formatRecordText(patchReleaseRecord, ["version", "version_name"], "") ||
    (patchReleaseId
      ? shortRecord(patchReleaseId)
      : patchIdentityRecord
        ? "unknown"
        : "not loaded");
  const patchChannelLabel = formatRecordText(
    patchIdentityRecord,
    ["channel"],
    patchIdentityRecord ? "unknown" : "not loaded",
  );
  const patchAppLabel =
    formatRecordText(patchAppRecord, ["name", "display_name", "app_name"], "") ||
    patchAppId ||
    (patchIdentityRecord ? "unknown" : "not loaded");
  const patchIdentityRows = [
    {
      label: "Patch",
      value: patchId.trim()
        ? `#${formatRecordText(patchIdentityRecord, ["patch_number", "number"], "?")}`
        : "select a patch",
      helper: "rollback target",
    },
    {
      label: "Platform",
      value: patchIdentityRecord ? patchPlatform : "not loaded",
      helper: "store target",
    },
    {
      label: "Channel",
      value: patchChannelLabel,
      helper: "delivery channel",
    },
    {
      label: "Release",
      value: patchReleaseLabel,
      helper: "base release",
    },
    {
      label: "App",
      value: patchAppLabel,
      helper: "owning app",
    },
  ];
  // Raw internal identifiers live only in this advanced affordance, never as
  // primary UI. Alternate keys preserved for response fallback handling.
  const patchTechnicalRows = [
    {
      label: "Patch ID",
      value:
        patchId.trim() ||
        formatRecordText(patchIdentityRecord, ["patch_id", "id"], "not loaded"),
    },
    {
      label: "Release ID",
      value: formatRecordText(
        patchIdentityRecord,
        ["release_id", "release"],
        "not loaded",
      ),
    },
    {
      label: "Runtime ID",
      value: formatRecordText(
        patchIdentityRecord,
        ["runtime_id", "runtime"],
        "not recorded",
      ),
    },
    {
      label: "App ID",
      value: formatRecordText(
        patchIdentityRecord,
        ["app_id", "app"],
        "not loaded",
      ),
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
  const lastPatchSignal = getRecordValue(patchRecord, [
    "last_event",
    "last_report",
    "last_seen",
    "updated_at",
    "created_at",
  ]);
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
  const selectedAppPackage = formatRecordText(
    selectedAppRecord,
    ["package_id", "package", "android_package", "bundle_id"],
    "package not recorded",
  );
  const appSearchQuery = appSearch.trim().toLowerCase();
  const visibleApps = appRecords.filter((app) => {
    const haystack = [
      recordId(app),
      formatRecordText(app, ["name", "display_name", "app_name"], ""),
      formatRecordText(app, ["package_id", "package", "android_package", "bundle_id"], ""),
      formatRecordText(app, ["platform"], ""),
      formatRecordText(app, ["owner_email", "operator_email", "account"], ""),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(appSearchQuery);
  });
  const visibleAppRows = visibleApps.slice(0, appListLimit);
  const hiddenVisibleAppCount = Math.max(visibleApps.length - visibleAppRows.length, 0);
  const appReleases = scopedAppId
    ? releaseRecords.filter((release) => {
        return recordBelongsToApp(release, scopedAppId);
      })
    : [];
  const selectedReleaseId = releaseIdFilter.trim();
  // Group the app's releases by platform (client-side, from release.platform).
  const availablePlatforms = Array.from(
    new Set(appReleases.map((release) => releasePlatform(release))),
  ).sort((a, b) => (a === "Android" ? -1 : b === "Android" ? 1 : a.localeCompare(b)));
  const requestedPlatform = platformFilter.trim();
  // A deep-linked release adopts its own platform so a shared URL lands in scope.
  const deepLinkReleaseRecord = selectedReleaseId
    ? appReleases.find((release) => recordId(release) === selectedReleaseId) || null
    : null;
  const selectedPlatform =
    requestedPlatform &&
    availablePlatforms.includes(requestedPlatform as "iOS" | "Android")
      ? (requestedPlatform as "iOS" | "Android")
      : deepLinkReleaseRecord
        ? releasePlatform(deepLinkReleaseRecord)
        : availablePlatforms[0] || "";
  const platformInScope = Boolean(selectedPlatform);
  const visibleReleases = platformInScope
    ? appReleases.filter((release) => releasePlatform(release) === selectedPlatform)
    : [];
  const platformReleaseIds = new Set(
    visibleReleases.map((release) => recordId(release)).filter(Boolean),
  );
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
    if (!scopedAppId || !platformInScope) {
      return false;
    }
    const appId = formatRecordText(patch, ["app_id"], "");
    const releaseId = formatRecordText(patch, ["release_id", "release"], "");
    const channel = formatRecordText(patch, ["channel"], "");
    const expectedChannel = channelFilter.trim();

    return (
      appId === scopedAppId &&
      // Patches carry no platform — keep them only if their base release is in
      // the selected platform (releaseless patches fall through as a fallback).
      (!releaseId || platformReleaseIds.has(releaseId)) &&
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
  const inventoryScopeLabel = operatorIsAdmin ? "Admin inventory" : "Your apps";
  const inventoryScopeHelper = operatorIsAdmin
    ? "All apps visible to this admin operator."
    : "Apps owned by this signed-in operator.";
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
  const latestPatchId = latestPatchRecord ? recordId(latestPatchRecord) : "";
  const latestPatchLabel = latestPatchRecord
    ? `#${formatRecordText(latestPatchRecord, ["number", "patch_number"], "0")}`
    : "none";
  const releaseArtifactRows: Array<{
    name: string;
    platform: "iOS" | "Android";
    size: string;
    hash: string;
  }> = selectedReleaseRecord
    ? [
        {
          name: "base build",
          platform: releasePlatform(selectedReleaseRecord),
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
              platform: releasePlatform(selectedReleaseRecord),
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
        (row): row is { name: string; platform: "iOS" | "Android"; size: string; hash: string } =>
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
  const patchKindCounts = visiblePatches.reduce<Record<string, number>>(
    (counts, patch) => {
      const rawKind = formatRecordText(
        patch,
        ["kind", "patch_kind", "type"],
        "unknown",
      ).toLowerCase();
      const kind = rawKind.includes("config")
        ? "config"
        : rawKind.includes("asset")
          ? "asset"
          : rawKind.includes("code") || rawKind.includes("aot")
            ? "code"
            : "unknown";
      counts[kind] = (counts[kind] || 0) + 1;
      return counts;
    },
    {},
  );
  const patchKindRows = Object.entries(patchKindCounts).sort((a, b) => b[1] - a[1]);
  const releaseLaneRows = visibleReleases.slice(0, 5).map((release) => {
    const releaseId = recordId(release);
    const releasePatches = visiblePatches.filter(
      (patch) =>
        formatRecordText(patch, ["release_id", "release"], "") === releaseId,
    );
    const rolledBack = releasePatches.filter((patch) =>
      recordFlag(patch, ["rolled_back", "rollback", "is_rolled_back"]),
    ).length;

    return {
      id: releaseId,
      label: formatRecordText(
        release,
        ["version", "version_name", "id", "release_id"],
        releaseId || "Release",
      ),
      runtime: shortRecord(formatRecordText(release, ["runtime_id", "runtime"], "")),
      patches: releasePatches.length,
      active: Math.max(releasePatches.length - rolledBack, 0),
      rolledBack,
    };
  });
  const consoleHealthScore =
    !authToken
      ? 12
      : operatorState.status === "error" || healthState.status === "error"
        ? 34
        : inventoryError
          ? 58
          : patchHealthState.status === "ready"
            ? 94
            : healthState.status === "ready"
              ? 82
              : 64;
  const consoleHealthLabel =
    !authToken
      ? "auth required"
      : operatorState.status === "error" || healthState.status === "error"
        ? "service attention"
        : inventoryError
          ? "inventory attention"
          : patchHealthState.status === "ready"
            ? "patch receipt loaded"
            : "inventory ready";
  const operatorQueueRows = [
    {
      label: "Auth",
      value: operatorState.status === "ready" ? "verified" : "required",
      detail: operatorEmail,
    },
    {
      label: "API",
      value: healthState.status === "ready" ? "reachable" : healthState.status,
      detail: `checked ${formatReceivedAt(healthState.receivedAt)}`,
    },
    {
      label: "Inventory",
      value: `${visiblePatches.length} patches`,
      detail: `${visibleReleases.length} releases in scope`,
    },
    {
      label: "Rollback",
      value: rollbackArmed ? "armed" : "guarded",
      detail: rollbackTarget || "select a patch first",
    },
  ];
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
  const commandState = !authToken
    ? "Sign in required"
    : inventoryLoading
      ? "Syncing inventory"
      : selectedAppMissing
        ? "App unavailable"
        : selectedReleaseMissing
          ? "Release unavailable"
      : !selectedAppInScope
        ? "Choose an app"
      : visiblePatches.length
        ? "Ready to inspect"
        : "No patches in scope";
  const scopeFacts: ScopeFact[] = [
    selectedAppInScope
      ? { label: "App", value: selectedAppName }
      : { label: inventoryScopeLabel, value: `${appRecords.length} apps visible` },
    {
      label: "Platform",
      value: selectedAppInScope
        ? selectedPlatform || (availablePlatforms.length ? "choose platform" : "no releases")
        : "select app first",
    },
    {
      label: "Release",
      value: selectedReleaseInScope
        ? selectedReleaseLabel
        : selectedReleaseMissing
          ? "not visible"
          : "select app first",
    },
    { label: "Latest patch", value: selectedAppInScope ? latestPatchLabel : "after app select" },
  ];
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
  const productSectionLabel = isProductSection
    ? {
        ownership: "Ownership",
        developer: "Developer experience",
        billing: "Billing and pricing",
        trust: "Trust layer",
      }[operatorTab]
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
      throw new Error("Sign in as an operator first.");
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
      platform: string;
    }> = {},
  ) {
    const nextAppId = filters.appId ?? appIdFilter;
    const nextReleaseId = filters.releaseId ?? releaseIdFilter;
    const nextRuntimeId = filters.runtimeId ?? runtimeIdFilter;
    const nextChannel = filters.channel ?? channelFilter;
    const nextPatchId = filters.patch ?? patchId;
    // Platform is a client-side hierarchy level only — it is synced to the URL
    // but never sent to any API request (the API contract is unchanged).
    const nextPlatform = filters.platform ?? platformFilter;

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
      platform: nextPlatform,
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
  }

  function goHome() {
    setAppIdFilter("");
    setPlatformFilter("");
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
      platform: "",
      releaseId: "",
      runtimeId: "",
      channel: "stable",
      patch: "",
    });
  }

  function selectApp(appId: string) {
    setAppIdFilter(appId);
    // Selecting an app clears Platform + Channel + Release + Patch.
    setPlatformFilter("");
    setReleaseIdFilter("");
    setRuntimeIdFilter("");
    setChannelFilter("stable");
    setPatchId("");
    setRollbackConfirm("");
    setPatchHealthState(idleState);
    setRollbackState(idleState);
    setOperatorTab("releases");
    setReleaseTab("overview");
    void loadInventory(undefined, {
      appId,
      platform: "",
      releaseId: "",
      runtimeId: "",
      channel: "stable",
      patch: "",
    });
  }

  function selectPlatform(nextPlatform: string) {
    setPlatformFilter(nextPlatform);
    // Selecting a platform clears Channel + Release + Patch.
    setReleaseIdFilter("");
    setRuntimeIdFilter("");
    setChannelFilter("stable");
    setPatchId("");
    setRollbackConfirm("");
    setPatchHealthState(idleState);
    setRollbackState(idleState);
    setOperatorTab("releases");
    setReleaseTab("overview");
    void loadInventory(undefined, {
      appId: scopedAppId,
      platform: nextPlatform,
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
      platform: selectedPlatform,
      releaseId: releaseIdFilter,
      runtimeId: runtimeIdFilter,
      channel: channelFilter,
      patch: patchId,
    });
  }

  function clearScopeFilters() {
    // Keep app + platform; clear Channel + Release + Patch below them.
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
      platform: selectedPlatform,
      releaseId: "",
      runtimeId: "",
      channel: "stable",
      patch: "",
    });
  }

  function selectPatch(nextPatchId: string) {
    setPatchId(nextPatchId);
    setRollbackConfirm("");
    setRollbackState(idleState);
    setOperatorTab("health");
    void loadPatchHealth(nextPatchId);
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
      setAuthDenied(false);
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
      setPlatformFilter("");
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
            setAuthDenied(false);

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
              setPlatformFilter("");
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
              // HTTP 403 from /api/operator/me means the account authenticated
              // with Firebase but is not on the operator allowlist — a distinct,
              // designed state (not logged-out, not a generic error).
              setAuthDenied(errorStatus(error) === 403);
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
    // Firebase-authenticated but not on the operator allowlist (/me → 403): a
    // distinct, designed state. We never render the dashboard behind a broken
    // signed-out flag — the operator gets a clear "not authorized" screen with a
    // way to switch accounts.
    if (authUser && authDenied) {
      return (
        <main className="operator-backdrop grid min-h-screen place-items-center overflow-x-hidden px-4 py-10 text-[#111111]">
          <section className="operator-panel w-full max-w-md p-6 sm:p-8">
            <a
              href="/"
              className="focus-ring inline-flex items-center gap-3"
              aria-label="Back to soroq.dev home"
            >
              <SoroqMark className="size-9" textClassName="text-sm" />
              <span>
                <span className="block text-sm font-semibold tracking-tight">Soroq</span>
                <span className="block text-xs text-[#7a7a80]">Operator console</span>
              </span>
            </a>

            <span className="mt-6 grid size-11 place-items-center border border-black bg-black text-white">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-semibold tracking-[-0.02em]">
              Your account isn&rsquo;t authorized for this console
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#6d6d72]">
              You signed in as{" "}
              <span className="font-medium text-black">
                {authUser.email || "this account"}
              </span>
              , but it is not on the operator allowlist. Ask an existing operator
              to grant access, or switch to an authorized account.
            </p>

            <Button
              type="button"
              className="focus-ring mt-6 h-10 w-full bg-black px-5 text-white hover:bg-[#2b2b2d]"
              onClick={() => void signOut()}
            >
              <LogIn className="size-4" aria-hidden="true" />
              Sign in with a different account
            </Button>

            <p className="mt-6 border-t border-black/10 pt-4 text-sm text-[#6d6d72]">
              Need help? See the{" "}
              <a
                href="https://docs.soroq.dev/cli"
                className="focus-ring font-medium text-black underline underline-offset-4 hover:text-[#2b2b2d]"
              >
                operator access docs
              </a>
              .
            </p>
          </section>
        </main>
      );
    }

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
              <SoroqMark className="size-9" textClassName="text-sm" />
              <span>
                <span className="block text-sm font-semibold tracking-tight">Soroq</span>
                <span className="block text-xs text-[#7a7a80]">Operator console</span>
              </span>
            </a>

            <h1 className="mt-6 text-xl font-semibold tracking-[-0.02em]">
              Sign in to the operator console
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#6d6d72]">
              Inspect your app inventory, release health, and patch receipts, and
              guard rollbacks — all behind an enabled operator sign-in.
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
      <main className="operator-backdrop min-h-screen overflow-x-hidden text-[#111111]">
        <section className="relative z-10 grid min-h-screen min-w-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-[236px_minmax(0,1fr)]">
          <OperatorSidebar
            operatorTab={operatorTab}
            operatorEmail={operatorEmail}
            operatorState={operatorState}
            signedIn={signedIn}
            configReady={configState.status === "ready"}
            onSelectTab={setOperatorTab}
            onSignIn={() => void signIn("google")}
            onSignOut={() => void signOut()}
          />

          <div className="min-w-0 overflow-x-hidden">
            <OperatorTopBar
              healthState={healthState}
              selectedAppId={scopedAppId}
              selectedAppName={selectedAppName}
              selectedReleaseId={selectedReleaseInScope ? selectedReleaseId : ""}
              appSearch={appSearch}
              inventoryLoading={inventoryLoading}
              inventoryReceivedAt={inventoryReceivedAt}
              inventoryStale={inventoryStale}
              canRefresh={Boolean(authToken)}
              productSectionLabel={productSectionLabel}
              onSearchChange={(value) => {
                setAppSearch(value);
                setAppListLimit(24);
              }}
              onRefresh={refreshOperatorSurface}
              onSelectTab={setOperatorTab}
            />

            <section className="mx-auto min-w-0 max-w-[1280px] px-4 py-4 sm:px-6 lg:py-5">
              {!isProductSection ? (
                <>
                  <OperatorCommandCenter
                    commandState={commandState}
                    latestPatchId={latestPatchId}
                    scopeFacts={scopeFacts}
                    signedIn={Boolean(authToken)}
                    configReady={configState.status === "ready"}
                    githubSignInEnabled={hasAuthProvider(configState.data?.provider, "github")}
                    onSignIn={() => void signIn("google")}
                    onGithubSignIn={() => void signIn("github")}
                    onSignOut={() => void signOut()}
                  />

                  <div className="operator-panel operator-summary-grid overflow-hidden">
                    <OperatorSummaryTile
                      icon={LockKeyhole}
                      label="Auth"
                      value={operatorState.status === "ready" ? "Verified" : "Required"}
                      helper={operatorEmail}
                    />
                    <OperatorSummaryTile
                      icon={Server}
                      label="API"
                      value={healthState.status === "ready" ? "Reachable" : "Check"}
                      helper={`last checked ${formatReceivedAt(healthState.receivedAt)}`}
                    />
                    <OperatorSummaryTile
                      icon={PackageCheck}
                      label={selectedAppInScope ? "Selected app" : inventoryScopeLabel}
                      value={selectedAppInScope ? selectedAppName : `${appRecords.length} apps`}
                      helper={
                        selectedAppInScope
                          ? `${visibleReleases.length} releases · ${visiblePatches.length} patches`
                          : inventoryScopeHelper
                      }
                    />
                    <OperatorSummaryTile
                      icon={RadioTower}
                      label="Channel"
                      value={channelFilter.trim() || "stable"}
                      helper={
                        selectedReleaseInScope
                          ? "release scoped"
                          : selectedAppInScope
                            ? "app scoped"
                            : "choose an app"
                      }
                    />
                  </div>
                </>
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
                <div className="operator-panel mt-3 p-2.5">
                  <div className="mb-2 flex items-center gap-2 px-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#7a7a80]">
                    <AlertCircle className="size-3.5" />
                    Notice
                  </div>
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
              <div
                className={`mt-4 grid min-w-0 gap-4 ${
                  selectedAppInScope ? "xl:grid-cols-[minmax(0,1fr)]" : ""
                }`}
              >
                <section className="operator-panel overflow-hidden">
		                  <div className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-3">
                    <div>
		                      <p className="text-sm font-semibold text-black">{inventoryScopeLabel}</p>
		                      <p className="mt-0.5 text-xs text-[#7a7a80]">
                            Select an app before inspecting releases, patches, artifacts, or rollback state.
                          </p>
                    </div>
		                    <span className="rounded-full border border-black/10 bg-[#f7f7f8] px-2.5 py-1 text-xs font-medium text-[#6d6d72]">
	                      {visibleApps.length} shown
                    </span>
                  </div>

                  <div className="p-3.5">
                    <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#6d6d72]">
                      <span>
                        {appSearchQuery
                          ? `Filtered by "${appSearch.trim()}"`
                          : inventoryScopeHelper}
                      </span>
                      {appSearchQuery ? (
                        <button
                          type="button"
                          className="font-medium text-black underline-offset-4 hover:underline"
                          onClick={() => {
                            setAppSearch("");
                            setAppListLimit(24);
                          }}
                        >
                          Clear search
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-2">
                      {(appsState.status === "loading" || appsState.status === "idle") &&
                      !appRecords.length ? (
                        <ul className="grid gap-2" aria-hidden="true">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <li
                              key={index}
                              className="h-[68px] animate-pulse border border-black/10 bg-[#f4f4f5]"
                            />
                          ))}
                        </ul>
                      ) : visibleApps.length ? (
                        visibleAppRows.map((app) => {
                          const id = recordId(app);
                          const appReleaseCount = releaseRecords.filter(
                            (release) =>
                              formatRecordText(release, ["app_id"], "") === id,
                          ).length;
                          const appPatchCount = patchRecords.filter(
                            (patch) => formatRecordText(patch, ["app_id"], "") === id,
                          ).length;

                          return (
                            <button
                              key={id || JSON.stringify(app)}
                              type="button"
                              aria-pressed={id === selectedAppId}
	                              className={`focus-ring group border px-3 py-3 text-left transition hover:border-black/20 hover:bg-[#f4f4f5] ${
	                                id === selectedAppId
	                                  ? "border-black bg-black text-white shadow-sm"
	                                  : "border-black/10 bg-white text-black"
	                              }`}
                              disabled={!id}
                              onClick={() => selectApp(id)}
                            >
                              <div className="flex items-center gap-3">
	                                <span className={`grid size-9 shrink-0 place-items-center border font-mono text-xs font-semibold transition ${
                                      id === selectedAppId
                                        ? "border-white/20 bg-white text-black"
                                        : "border-black/10 bg-[#f7f7f8] text-black group-hover:border-black/20"
                                    }`}>
                                  {(formatRecordText(
                                    app,
                                    ["name", "display_name", "app_name", "id", "app_id"],
                                    id || "AP",
                                  )
                                    .slice(0, 2)
                                    .toUpperCase())}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold">
                                    {formatRecordText(
                                      app,
                                      ["name", "display_name", "app_name"],
                                      id || "Untitled app",
                                    )}
                                  </p>
	                                  <p className={`mt-0.5 truncate font-mono text-[0.68rem] ${
                                      id === selectedAppId ? "text-white/70" : "text-[#7a7a80]"
                                    }`}>
                                    {id || "missing app id"}
                                  </p>
                                </div>
                              </div>
	                              <div className={`mt-3 flex gap-2 text-xs ${
                                  id === selectedAppId ? "text-white/70" : "text-[#6d6d72]"
                                }`}>
                                <span>{appReleaseCount} releases</span>
                                <span>·</span>
	                                <span>{appPatchCount} patches</span>
	                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <ConsoleEmpty
                          title={signedIn ? "No apps found" : "Auth required"}
                          body={
                            signedIn
                              ? "Refresh inventory or clear the search field."
                              : "Sign in to load your Soroq app inventory."
                          }
                        />
                      )}
                    </div>
                    {hiddenVisibleAppCount ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 h-9 w-full border-black/10 bg-white text-black hover:bg-[#f3f3f4]"
                        onClick={() => setAppListLimit((limit) => limit + 24)}
                      >
                        Show {Math.min(24, hiddenVisibleAppCount)} more apps
                      </Button>
                    ) : null}
                  </div>
                </section>

                {selectedAppInScope ? (
                <section className="operator-panel min-w-0 overflow-hidden">
	                  <div className="border-b border-black/10 p-4">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#7a7a80]">
                      <button
                        type="button"
                        className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 font-medium text-black hover:bg-[#f4f4f5]"
                        onClick={goHome}
                      >
                        <Home className="size-3.5" />
                        Apps
                      </button>
                      <ChevronRight className="size-3.5" />
                      <span className="max-w-[42ch] truncate font-medium text-black">
                        {selectedAppName}
                      </span>
                      {selectedPlatform ? (
                        <>
                          <ChevronRight className="size-3.5" />
                          <span className="font-medium text-[#4d4d52]">
                            {selectedPlatform}
                          </span>
                        </>
                      ) : null}
                      {selectedReleaseInScope ? (
                        <>
                          <ChevronRight className="size-3.5" />
                          <span className="font-medium text-[#4d4d52]">
                            {selectedReleaseLabel}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {availablePlatforms.length ? (
                      <div className="mb-4">
                        <p
                          className="mb-1.5 text-[0.65rem] font-medium uppercase tracking-[0.13em] text-[#8d8d93]"
                          id="operator-platform-label"
                        >
                          Platform
                        </p>
                        <div
                          className="flex flex-wrap gap-2"
                          role="group"
                          aria-labelledby="operator-platform-label"
                        >
                          {availablePlatforms.map((platform) => {
                            const active = platform === selectedPlatform;
                            const platformReleaseCount = appReleases.filter(
                              (release) => releasePlatform(release) === platform,
                            ).length;
                            return (
                              <button
                                key={platform}
                                type="button"
                                aria-pressed={active}
                                className={`focus-ring inline-flex items-center gap-2 border px-3 py-1.5 text-sm font-medium transition ${
                                  active
                                    ? "border-black bg-black text-white"
                                    : "border-black/15 bg-white text-black hover:bg-[#f4f4f5]"
                                }`}
                                onClick={() => selectPlatform(platform)}
                              >
                                {platform}
                                <span
                                  className={`text-xs ${active ? "text-white/70" : "text-[#8d8d93]"}`}
                                >
                                  {platformReleaseCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div className="flex min-w-0 gap-3">
	                        <span className="grid size-11 shrink-0 place-items-center border border-black bg-black text-white">
                          <PackageCheck className="size-5" />
                        </span>
                        <div className="min-w-0">
		                          <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#8d8d93]">
	                            Selected app workspace
	                          </p>
	                          <h1 className="mt-1 break-words text-2xl font-semibold tracking-[-0.025em]">
	                            {selectedAppName}
	                          </h1>
                              <p className="mt-2 break-all font-mono text-xs text-[#4d4d52]">
                                {selectedAppId || "No app selected"}
                              </p>
		                          <p className="mt-2 flex flex-wrap gap-2 text-sm text-[#6d6d72]">
	                            <span>{operatorEmail}</span>
	                            <span>·</span>
	                            <span>
	                              {selectedPlatform ||
	                                (availablePlatforms.length
	                                  ? availablePlatforms.join(" & ")
	                                  : "no releases yet")}
	                            </span>
	                            <span>·</span>
	                            <span>{selectedAppPackage}</span>
	                          </p>
	                        </div>
	                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <ConsoleMiniStat label="Releases" value={String(visibleReleases.length)} />
                        <ConsoleMiniStat label="Patches" value={String(visiblePatches.length)} />
                        <ConsoleMiniStat
                          label="Latest"
                          value={
                            latestPatchRecord
                              ? `#${formatRecordText(
                                  latestPatchRecord,
                                  ["number", "patch_number"],
                                  "0",
                                )}`
                              : "none"
                          }
                        />
                        <ConsoleMiniStat
                          label="Channel"
                          value={channelFilter.trim() || "stable"}
                        />
                      </div>
                    </div>

                    {!selectedReleaseInScope ? (
                    <form
                      className="operator-table-shell mt-4 grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_150px_auto_auto]"
                      onSubmit={(event) => {
                        event.preventDefault();
                        applyScopeFilters();
                      }}
                    >
                      <label className="grid min-w-0 gap-1.5">
	                        <span className="text-[0.65rem] font-medium uppercase tracking-[0.13em] text-[#8d8d93]">
                          Release
                        </span>
                        <input
                          list="operator-release-options"
                          value={releaseIdFilter}
                          onChange={(event) => setReleaseIdFilter(event.target.value)}
                          placeholder="pick a release"
                          aria-label="Filter by release"
	                          className="focus-ring h-9 border border-black/10 bg-white px-3 font-mono text-xs text-black outline-none placeholder:text-[#9a9aa1]"
                        />
                      </label>
                      <label className="grid min-w-0 gap-1.5">
	                        <span className="text-[0.65rem] font-medium uppercase tracking-[0.13em] text-[#8d8d93]">
                          Channel
                        </span>
                        <input
                          value={channelFilter}
                          onChange={(event) => setChannelFilter(event.target.value)}
                          placeholder="stable"
                          aria-label="Filter by channel"
	                          className="focus-ring h-9 border border-black/10 bg-white px-3 text-sm text-black outline-none placeholder:text-[#9a9aa1]"
                        />
                      </label>
                      <Button
                        type="submit"
	                        className="h-9 self-end bg-black px-4 text-white hover:bg-[#2b2b2d]"
                        disabled={!authToken || inventoryLoading}
                      >
                        Apply scope
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
	                        className="h-9 self-end border-black/10 bg-white px-4 text-black hover:bg-[#f3f3f4]"
                        disabled={!authToken || inventoryLoading}
                        onClick={clearScopeFilters}
                      >
                        Clear
                      </Button>
                      <datalist id="operator-release-options">
                        {releaseRecords.map((release) => {
                          const id = recordId(release);
                          return id ? <option key={id} value={id} /> : null;
                        })}
                      </datalist>
                    </form>
                    ) : null}
                    {!selectedReleaseInScope ? (
                      <div className="mt-4 flex min-w-0 gap-1 overflow-x-auto border-t border-black/10 pt-3">
                        {appWorkspaceTabs.map(({ key, label, icon: Icon }) => {
                          const active = operatorTab === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`focus-ring flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
                                active
                                  ? "border-black text-black"
                                  : "border-transparent text-[#6d6d72] hover:text-black"
                              }`}
                              onClick={() => setOperatorTab(key)}
                            >
                              <Icon className="size-4" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

	                  <div className="p-4">
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
                              {selectedAppName} · {releasePlatform(selectedReleaseRecord)} · {formatRecordText(
                                selectedReleaseRecord,
                                ["flutter_version", "flutter", "runtime_version"],
                                "version not recorded",
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
                              <ConsoleMiniStat label="Platform" value={releasePlatform(selectedReleaseRecord)} />
                              <ConsoleMiniStat
                                label="Patches"
                                value={String(visiblePatches.length)}
                              />
                              <ConsoleMiniStat
                                label="Rolled back"
                                value={String(rolledBackVisiblePatches.length)}
                              />
                              <ConsoleMiniStat
                                label="Signature / hash"
                                value={
                                  shortHash(selectedReleaseRecord) === "not recorded"
                                    ? "not recorded"
                                    : "recorded"
                                }
                              />
                            </div>

                            <div className="operator-table-shell overflow-hidden">
                              <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-[#f7f7f8] px-4 py-3">
                                <div>
                                  <h3 className="text-sm font-semibold text-black">
                                    Patches on this release
                                  </h3>
                                  <p className="mt-1 text-xs text-[#6d6d72]">
                                    Grouped by the selected channel and exact base release.
                                  </p>
                                </div>
                                <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-[#4d4d52]">
                                  {visiblePatches.length} patches
                                </span>
                              </div>
                              {visiblePatchesNewest.length ? (
                                visiblePatchesNewest.map((patch) => {
                                  const id = recordId(patch);
                                  const rolledBack = recordFlag(patch, [
                                    "rolled_back",
                                    "rollback",
                                    "is_rolled_back",
                                  ]);
                                  return (
                                    <button
                                      key={id || JSON.stringify(patch)}
                                      type="button"
                                      className="operator-table-row grid w-full gap-3 border-b border-black/10 px-4 py-3 text-left last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_120px_140px]"
                                      disabled={!id || patchHealthState.status === "loading"}
                                      onClick={() => {
                                        selectPatch(id);
                                        setReleaseTab("insights");
                                      }}
                                    >
                                      <span className="min-w-0">
                                        <span className="block text-sm font-semibold">
                                          Patch #
                                          {formatRecordText(
                                            patch,
                                            ["number", "patch_number"],
                                            "0",
                                          )}
                                        </span>
                                        <span className="mt-1 block break-all font-mono text-[0.68rem] text-[#7a7a80]">
                                          {id}
                                        </span>
                                      </span>
                                      <span className="rounded-full border border-black/10 bg-[#f7f7f8] px-2.5 py-1 text-xs text-[#4d4d52]">
                                        {formatRecordText(patch, ["channel"], "stable")}
                                      </span>
                                      <span className="text-xs font-medium text-[#4d4d52]">
                                        {formatRecordText(
                                          patch,
                                          ["kind", "patch_kind", "type"],
                                          "unknown",
                                        )}
                                      </span>
                                      <span
                                        className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                                          rolledBack
                                            ? "border border-black/20 bg-[#efeff0] text-black"
                                            : "border border-black bg-black text-white"
                                        }`}
                                      >
                                        {rolledBack ? "Rolled back" : "Latest eligible"}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="p-4">
                                  <ConsoleEmpty
                                    title="No patches on this release"
                                    body="This release is registered, but no visible patch is tied to it in the selected channel."
                                  />
                                </div>
                              )}
                            </div>
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
                                value={selectedAppName}
                              />
                              <ConsoleMiniStat
                                label="Platform"
                                value={releasePlatform(selectedReleaseRecord)}
                              />
                              <ConsoleMiniStat
                                label="Release"
                                value={selectedReleaseLabel}
                              />
                            </div>
                            <details className="operator-panel-soft p-4">
                              <summary className="focus-ring cursor-pointer text-sm font-medium text-black">
                                Technical identifiers (advanced)
                              </summary>
                              <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <ConsoleMiniStat
                                  label="App ID"
                                  value={scopedAppId || "not selected"}
                                />
                                <ConsoleMiniStat
                                  label="Release ID"
                                  value={selectedReleaseId || "not selected"}
                                />
                                <ConsoleMiniStat
                                  label="Runtime ID"
                                  value={selectedRuntimeId || "not recorded"}
                                />
                              </div>
                            </details>
                            <StateNotice
                              tone="warning"
                              message="Destructive release deletion is not exposed from this console until the backend has a guarded delete API."
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

	                    {!selectedReleaseInScope && operatorTab === "overview" ? (
	                      <OperatorOverviewPanel
                        consoleHealthLabel={consoleHealthLabel}
                        consoleHealthScore={consoleHealthScore}
                        operatorQueueRows={operatorQueueRows}
                        patchStateBars={patchStateBars}
                        patchStateMax={patchStateMax}
                        releaseLaneRows={releaseLaneRows}
                        releaseCount={visibleReleases.length}
                        patchKindRows={patchKindRows}
                        canRefresh={Boolean(authToken)}
                        inventoryLoading={inventoryLoading}
                        latestPatchId={latestPatchId}
                        selectedPatchId={patchId}
                        onRefresh={refreshOperatorSurface}
                        onSelectPatch={selectPatch}
                        onSelectRelease={selectRelease}
                        onSelectTab={setOperatorTab}
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
                              Base builds available on{" "}
                              {selectedPlatform || "this platform"}.
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
	                            <span>Platform</span>
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
                                    <span className="text-sm text-[#6d6d72]">
                                      {releasePlatform(release)}
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
                      <div>
	                        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
	                          <div>
	                            <h2 className="text-lg font-semibold tracking-tight">
	                              Patch registry
	                            </h2>
	                            <p className="mt-1 text-sm text-[#6d6d72]">
	                              Current patches for the selected app and release.
	                            </p>
	                          </div>
		                          <span className="w-fit rounded-full border border-black/10 bg-[#f7f7f8] px-3 py-1.5 text-xs font-medium text-[#6d6d72]">
	                            {visiblePatches.length} visible
	                          </span>
	                        </div>
		                          <div className="operator-table-shell overflow-x-auto">
			                          <div className="grid min-w-[860px] grid-cols-[minmax(260px,1fr)_170px_120px_120px_130px] gap-3 border-b border-black/10 bg-[#f7f7f8] px-4 py-2.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
		                            <span>Patch</span>
		                            <span>Release</span>
		                            <span>Channel</span>
                                <span>Kind</span>
		                            <span>Status</span>
		                          </div>
                          {visiblePatches.length ? (
                            visiblePatchesNewest.map((patch) => {
	                              const id = recordId(patch);
	                              const rolledBack = recordFlag(patch, [
                                  "rolled_back",
                                  "rollback",
                                  "is_rolled_back",
                                ]);
                                const rollout = formatRecordText(
                                  patch,
                                  ["rollout_percent", "rollout", "percentage"],
                                  "",
                                );
	                              return (
	                                <button
	                                  key={id || JSON.stringify(patch)}
	                                  type="button"
			                                  className="operator-table-row grid min-w-[860px] w-full grid-cols-[minmax(260px,1fr)_170px_120px_120px_130px] items-center gap-3 border-b border-black/10 bg-transparent px-4 py-3.5 text-left last:border-b-0"
	                                  disabled={!id || patchHealthState.status === "loading"}
	                                  onClick={() => selectPatch(id)}
	                                >
	                                  <span>
	                                    <span className="block text-sm font-semibold">
                                      Patch #
                                      {formatRecordText(
                                        patch,
                                        ["number", "patch_number"],
                                        "0",
                                      )}
                                    </span>
		                                    <span className="mt-1 block break-all font-mono text-[0.68rem] text-[#7a7a80]">
	                                      {id}
	                                    </span>
		                                    <span className="mt-1 block text-xs text-[#7a7a80]">
	                                      rollout {rollout || "default"} · app{" "}
                                        {formatRecordText(patch, ["app_id"], scopedAppId || "unknown")}
	                                    </span>
	                                  </span>
			                                  <span className="break-all font-mono text-xs text-[#6d6d72]">
		                                    {shortRecord(
		                                      formatRecordText(
		                                        patch,
		                                        ["release_id", "release"],
		                                        selectedReleaseId || "release",
	                                      ),
	                                    )}
	                                  </span>
			                                  <span className="rounded-full border border-black/10 bg-[#f7f7f8] px-2.5 py-1 text-xs text-[#4d4d52]">
		                                    {formatRecordText(patch, ["channel"], "stable")}
		                                  </span>
                                  <span className="text-xs font-medium text-[#4d4d52]">
                                    {formatRecordText(patch, ["kind", "patch_kind", "type"], "unknown")}
                                  </span>
	                                  <span
	                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
	                                      rolledBack
	                                        ? "border border-black/20 bg-[#efeff0] text-black"
	                                        : "border border-black bg-black text-white"
	                                    }`}
	                                  >
	                                    {rolledBack ? "Rolled back" : "Inspect"}
	                                  </span>
	                                </button>
	                              );
	                            })
                          ) : (
                            <ConsoleEmpty
                              title="No patches in this view"
                              body="Clear filters or publish a patch for this app/release."
                            />
                          )}
                        </div>
                      </div>
                    ) : null}

                    {!selectedReleaseInScope && operatorTab === "health" ? (
                      <div className="grid gap-4">
                        <form
                          className="grid gap-3 md:grid-cols-[1fr_auto]"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void loadPatchHealth();
                          }}
                        >
                          <label className="grid gap-2">
	                            <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
                              Patch ID
                            </span>
                            <input
                              value={patchId}
                              onChange={(event) => setPatchId(event.target.value)}
                              placeholder="paste or select patch ID"
	                              className="focus-ring h-9 border border-black/10 bg-white px-3 font-mono text-sm text-black outline-none placeholder:text-[#9a9aa1]"
                            />
                          </label>
                          <Button
                            type="submit"
	                            className="h-9 self-end bg-black text-white hover:bg-[#2b2b2d]"
                            disabled={!authToken || patchHealthState.status === "loading"}
                          >
                            {patchHealthState.status === "loading" ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Search className="size-4" />
                            )}
                            Check patch
                          </Button>
                        </form>

	                        {patchHealthState.error ? (
	                          <StateNotice tone="error" message={patchHealthState.error} />
	                        ) : null}
                          {patchScopeWarning ? (
                            <StateNotice tone="warning" message={patchScopeWarning} />
                          ) : null}

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

                        <div className="operator-panel-soft p-4">
                          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                            <div>
	                              <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
                                selected patch identity
                              </p>
                              <h3 className="mt-2 text-lg font-semibold">
                                Know exactly which patch this receipt belongs to.
                              </h3>
	                              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d6d72]">
                                Pair this hosted identity with SDK status like Device Phase and
                                Device Patch before rollback.
                              </p>
                            </div>
	                            <span className="w-fit rounded-full border border-black/10 bg-[#f7f7f8] px-3 py-1.5 text-xs font-medium text-[#6d6d72]">
                              exact patch id
                            </span>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {patchIdentityRows.map((row) => (
                              <ConsoleMiniStat
                                key={row.label}
                                label={row.label}
                                value={row.value}
                              />
                            ))}
                          </div>
                          <details className="mt-4">
                            <summary className="focus-ring cursor-pointer text-sm font-medium text-black">
                              Technical identifiers (advanced)
                            </summary>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {patchTechnicalRows.map((row) => (
                                <ConsoleMiniStat
                                  key={row.label}
                                  label={row.label}
                                  value={row.value}
                                />
                              ))}
                            </div>
                          </details>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                          <div className="operator-panel-soft p-4">
	                            <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
                              Last signal
                            </p>
                            <p className="mt-3 break-words text-xl font-semibold">
                              {formatMetric(lastPatchSignal, "none yet")}
                            </p>
                            {recentClients.length ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {recentClients.map((client) => (
                                  <span
                                    key={client}
	                                    className="rounded-full border border-black/10 bg-[#f7f7f8] px-3 py-1.5 font-mono text-xs text-[#4d4d52]"
                                  >
                                    {client}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <details className="min-w-0">
                            <summary className="focus-ring cursor-pointer text-sm font-medium text-black">
                              Technical receipt (advanced)
                            </summary>
                            <div className="mt-3">
                              <JsonPreview
                                data={patchRecord}
                                empty="Receipt details appear here after a successful lookup."
                              />
                            </div>
                          </details>
                        </div>
                      </div>
                    ) : null}

                    {!selectedReleaseInScope && operatorTab === "rollback" ? (
                      <div className="grid gap-4">
	                        <div className="overflow-hidden border border-black/15 bg-white">
	                          <div className="border-b border-black/10 bg-[#f7f7f8] px-4 py-3">
	                            <h2 className="text-sm font-semibold text-black">
                              Rollback guard
                            </h2>
                          </div>
	                          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
	                            <div>
	                              <h3 className="text-base font-semibold">Roll back patch</h3>
		                              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d6d72]">
	                                Type the exact patch ID only after the selected patch identity matches this app workspace.
	                              </p>
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
                                placeholder={
                                  rollbackTarget || "select a patch from Patches first"
                                }
	                                className="focus-ring mt-4 h-9 w-full border border-black/10 bg-white px-3 font-mono text-sm text-black outline-none placeholder:text-[#9a9aa1]"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
	                              className="focus-ring h-9 border-black bg-black px-5 text-white hover:bg-[#2b2b2d]"
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
                        <details>
                          <summary className="focus-ring cursor-pointer text-sm font-medium text-black">
                            Technical response (advanced)
                          </summary>
                          <div className="mt-3 grid gap-3">
                            {rollbackRecord ? (
                              <JsonPreview
                                data={rollbackRecord}
                                empty="Rollback response will appear here."
                              />
                            ) : null}
                            <JsonPreview
                              data={healthRecord}
                              empty="System health details appear after sign-in."
                            />
                          </div>
                        </details>

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
                                This suppresses future delivery of patch{" "}
                                <span className="break-all font-mono text-black">
                                  {rollbackTarget}
                                </span>
                                . This action cannot be undone from the console.
                              </p>
                              <dl className="mt-4 grid gap-2 border border-black/10 bg-[#f7f7f8] p-3 text-sm">
                                {[
                                  { label: "App", value: selectedAppInScope ? selectedAppName : patchAppLabel },
                                  { label: "Platform", value: patchPlatform },
                                  { label: "Channel", value: patchChannelLabel },
                                  { label: "Release", value: patchReleaseLabel },
                                ].map((row) => (
                                  <div
                                    key={row.label}
                                    className="flex items-center justify-between gap-3"
                                  >
                                    <dt className="text-[#7a7a80]">{row.label}</dt>
                                    <dd className="min-w-0 truncate text-right font-medium text-black">
                                      {row.value}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
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
                </section>
                ) : null}
              </div>
              )}
            </section>
          </div>
        </section>
      </main>
    );
  }

}
