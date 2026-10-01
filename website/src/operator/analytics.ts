// OTA DELIVERY, AS THE CONTROL PLANE COUNTED IT.
//
// Every number here is read out of the payload. Nothing is summed, averaged or inferred in the browser,
// because a total computed in two places is a total that can disagree with itself and no one can tell
// which half is wrong.
//
// TWO DISTINCTIONS THIS MODULE EXISTS TO KEEP.
//
// ABSENT IS NOT ZERO. A patch nobody has reported on has no adoption figure at all. Rendering it as
// "0%" is a claim about devices that were never heard from, and an operator reading a wall of 0% cannot
// tell a failed rollout from a fleet that has not checked in yet.
//
// UNVERIFIED IS NOT VERIFIED. Boot reports carry no device credential -- a fielded app has none to give
// -- so anyone who knows an app's identifiers can post one. The counts are still worth showing and are
// not worth trusting silently, so the share that arrived without a credential is named on every screen
// that shows a total.

import type { ApiState, JsonRecord } from "./types";

export type PatchDeliveryRow = {
  patchId: string;
  patchNumber: number;
  releaseId: string;
  channel: string;
  track: string;
  rolledBack: boolean;
  /** False when NO device has ever reported on this patch. Every number below is then meaningless. */
  observed: boolean;
  successfulDevices: number;
  failedDevices: number;
  verifiedSuccessfulDevices: number;
  verifiedFailedDevices: number;
  unverifiedDevices: number;
  /**
   * The share of reporting devices that installed the patch, as a percentage string -- or the reason
   * there is no figure. NEVER "0%" for a patch nobody reported on.
   */
  adoption: string;
  failureClasses: Array<{ label: string; title: string; count: number }>;
};

/** One platform's share of an install group, as the server counted it. */
export type InstallCount = { devices: number; active24h: number; active7d: number };

/**
 * Installs of one build (runtime + channel), from the update checks devices make on every launch. A
 * runtime is shared by the Android and iOS releases of one version, so a group names every release it
 * covers, and the server splits it by the platform each install checked in from.
 */
export type InstallGroup = {
  runtimeId: string;
  channel: string;
  version: string;
  releaseIds: string[];
  devices: number;
  active24h: number;
  active7d: number;
  lastSeen: string;
  /**
   * Per platform, as the server sent it. A platform the server did not list has NO entry -- not a zero
   * entry. `null` when the server predates the split.
   */
  platforms: { android?: InstallCount; ios?: InstallCount; unknown?: InstallCount } | null;
};

export type AnalyticsView = {
  /** Set when the payload could not be read. Not an empty fleet, and not a failing one. */
  unavailable: string;
  rows: PatchDeliveryRow[];
  /**
   * Installs per build. `null` when the server sent no device section at all (it predates install
   * counting, or the read failed -- then `installsUnavailable` says so). An empty list means no device
   * has checked in yet.
   */
  installs: InstallGroup[] | null;
  installsUnavailable: string;
  totals: {
    patches: number;
    observedPatches: number;
    successfulDevices: number;
    failedDevices: number;
    unverifiedDevices: number;
    rolledBackPatches: number;
  };
  /** The server's caveat about unverified telemetry, verbatim. Empty when there is none. */
  notice: string;
  /** A one-line summary that says what was NOT observed, rather than implying it was fine. */
  summary: string;
};

function num(record: JsonRecord | null, key: string): number {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(record: JsonRecord | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

// adoptionLabel is the one derived value in this module, and it is derived only from two numbers that
// came from the same payload. It refuses to produce a percentage there is no basis for.
/** Plain-language names for the failure classes devices report; unknown classes show their raw code. */
export const FAILURE_CLASS_TITLES: Record<string, string> = {
  crash_before_first_frame: "Crashed before first frame (rolled back on device)",
  crash_after_launch: "Crashed after launch",
  anr_after_launch: "Froze after launch (ANR)",
  signature_refused: "Refused: signature",
  hash_mismatch: "Refused: corrupt download",
  activation_failed: "Could not activate",
  patch_rejected: "Refused: invalid patch",
  patch_missing: "Patch missing on device",
  launch_failed: "Launch failed",
  unspecified: "Failed (no reason reported)",
};

function adoptionLabel(observed: boolean, successful: number, failed: number): string {
  if (!observed) {
    return "no telemetry";
  }
  const reporting = successful + failed;
  if (reporting === 0) {
    // Observed, but with no install outcome either way: a server-rollback notice reaches this state.
    return "no install reported";
  }
  return `${Math.round((successful / reporting) * 100)}%`;
}

export function buildAnalyticsView(state: ApiState<JsonRecord>): AnalyticsView {
  const empty: AnalyticsView["totals"] = {
    patches: 0,
    observedPatches: 0,
    successfulDevices: 0,
    failedDevices: 0,
    unverifiedDevices: 0,
    rolledBackPatches: 0,
  };
  if (state.status === "error") {
    return {
      unavailable: state.error || "Delivery analytics could not be read.",
      rows: [],
      installs: null,
      installsUnavailable: "",
      totals: empty,
      notice: "",
      summary: "",
    };
  }

  const payload = state.data;
  const rawRows = Array.isArray(payload?.patches) ? payload.patches : [];
  const rows: PatchDeliveryRow[] = rawRows
    .map(asRecord)
    .filter((row): row is JsonRecord => row !== null)
    .map((row) => {
      const observed = row.observed === true;
      const successfulDevices = num(row, "successful_devices");
      const failedDevices = num(row, "failed_devices");
      const classes = asRecord(row.failure_classes) ?? {};
      return {
        patchId: str(row, "patch_id"),
        patchNumber: num(row, "patch_number"),
        releaseId: str(row, "release_id"),
        channel: str(row, "channel"),
        track: str(row, "track"),
        rolledBack: row.rolled_back === true,
        observed,
        successfulDevices,
        failedDevices,
        verifiedSuccessfulDevices: num(row, "verified_successful_devices"),
        verifiedFailedDevices: num(row, "verified_failed_devices"),
        unverifiedDevices: num(row, "unverified_devices"),
        adoption: adoptionLabel(observed, successfulDevices, failedDevices),
        failureClasses: Object.entries(classes)
          .map(([label, count]) => ({
            label,
            title: FAILURE_CLASS_TITLES[label] ?? label,
            count: typeof count === "number" && Number.isFinite(count) ? count : 0,
          }))
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      };
    })
    .sort((a, b) => b.patchNumber - a.patchNumber);

  const serverTotals = asRecord(payload?.totals);
  const totals: AnalyticsView["totals"] = {
    patches: num(serverTotals, "patches"),
    observedPatches: num(serverTotals, "observed_patches"),
    successfulDevices: num(serverTotals, "successful_devices"),
    failedDevices: num(serverTotals, "failed_devices"),
    unverifiedDevices: num(serverTotals, "unverified_devices"),
    rolledBackPatches: num(serverTotals, "rolled_back_patches"),
  };

  return {
    unavailable: "",
    rows,
    installs: parseInstalls(payload?.devices),
    installsUnavailable: str(payload, "devices_unavailable"),
    totals,
    notice: str(payload, "notice"),
    summary: summarise(totals),
  };
}

function installCount(record: JsonRecord): InstallCount {
  return { devices: num(record, "devices"), active24h: num(record, "active_24h"), active7d: num(record, "active_7d") };
}

function parseInstalls(raw: unknown): InstallGroup[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  return raw
    .map(asRecord)
    .filter((row): row is JsonRecord => row !== null)
    .map((row) => {
      const releaseIds = Array.isArray(row.release_ids)
        ? row.release_ids.filter((id): id is string => typeof id === "string" && id.trim() !== "")
        : [];
      const single = str(row, "release_id");
      let platforms: InstallGroup["platforms"] = null;
      if (Array.isArray(row.platforms)) {
        platforms = {};
        for (const entry of row.platforms.map(asRecord)) {
          const name = str(entry, "platform");
          if (entry && (name === "android" || name === "ios" || name === "unknown")) {
            platforms[name] = installCount(entry);
          }
        }
      }
      return {
        runtimeId: str(row, "runtime_id"),
        channel: str(row, "channel"),
        version: str(row, "version"),
        releaseIds: releaseIds.length ? releaseIds : single ? [single] : [],
        devices: num(row, "devices"),
        active24h: num(row, "active_24h"),
        active7d: num(row, "active_7d"),
        lastSeen: str(row, "last_seen"),
        platforms,
      };
    });
}

function summarise(totals: AnalyticsView["totals"]): string {
  if (totals.patches === 0) {
    return "No patches have been published for this app yet.";
  }
  const silent = totals.patches - totals.observedPatches;
  if (silent === totals.patches) {
    // The whole point of the observed/absent split. "0% adoption across 4 patches" would be a claim
    // about devices that have never been heard from.
    return `None of the ${totals.patches} patches has been reported on by any device.`;
  }
  const parts = [`${totals.observedPatches} of ${totals.patches} patches reported on`];
  if (silent > 0) {
    parts.push(`${silent} with no telemetry`);
  }
  if (totals.rolledBackPatches > 0) {
    parts.push(`${totals.rolledBackPatches} rolled back`);
  }
  return `${parts.join(", ")}.`;
}
