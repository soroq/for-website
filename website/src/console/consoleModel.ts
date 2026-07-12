// Pure, dependency-free decision logic for the operator console hierarchy
// (App -> Platform -> Channel -> Release -> Patch), plus deep-link scope
// resolution and rollback-scope validation.
//
// This module is deliberately import-free so it can be unit-tested with the
// Node built-in test runner (no framework, no DOM, no `@/` alias). The React
// page (OperatorConsolePage.tsx) is the only runtime consumer; it adapts these
// results to the existing record helpers.

export type JsonRecord = Record<string, unknown>;

export type PlatformKey = "android" | "ios" | "unknown";

// Discriminated platform classification. `known` is the gate callers use before
// enabling destructive actions — an unknown/unsupported platform is never
// silently treated as Android.
export interface PlatformClass {
  key: PlatformKey;
  label: string;
  known: boolean;
}

// --- minimal, local record accessors (mirror of @/operator/records so this
// module stays dependency-free) ---

function fieldValue(
  record: JsonRecord | null | undefined,
  keys: string[],
): unknown {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function fieldText(record: JsonRecord | null | undefined, keys: string[]): string {
  const value = fieldValue(record, keys);
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

// Mirrors records.recordId key order so the resolved id matches what the page
// renders and links against.
export function recordId(record: JsonRecord | null | undefined): string {
  return fieldText(record, ["id", "patch_id", "release_id", "app_id"]);
}

// Requirement 4: recognize the literal backend values "android"/"ios"
// (case-insensitive, trimmed). Everything else — empty, macos, linux, windows,
// garbage — is classified unknown/unsupported, NOT Android.
export function normalizePlatform(value: unknown): PlatformClass {
  const raw = typeof value === "string" ? value.trim() : "";
  const lower = raw.toLowerCase();
  if (lower === "android") {
    return { key: "android", label: "Android", known: true };
  }
  if (lower === "ios") {
    return { key: "ios", label: "iOS", known: true };
  }
  return {
    key: "unknown",
    label: raw ? `Unsupported (${raw})` : "Unknown",
    known: false,
  };
}

export function releasePlatform(record: JsonRecord | null | undefined): PlatformClass {
  return normalizePlatform(fieldValue(record, ["platform"]));
}

export function releaseChannel(record: JsonRecord | null | undefined): string {
  return fieldText(record, ["channel"]);
}

function comparePlatform(a: PlatformClass, b: PlatformClass): number {
  if (a.key === b.key) {
    return 0;
  }
  // Android first, then iOS, unknown/unsupported last.
  if (a.key === "android") return -1;
  if (b.key === "android") return 1;
  if (a.key === "unknown") return 1;
  if (b.key === "unknown") return -1;
  return a.label.localeCompare(b.label);
}

// Distinct, ordered platforms present in a set of releases.
export function deriveAvailablePlatforms(
  releases: JsonRecord[],
): PlatformClass[] {
  const byKey = new Map<PlatformKey, PlatformClass>();
  for (const release of releases) {
    const platform = releasePlatform(release);
    if (!byKey.has(platform.key)) {
      byKey.set(platform.key, platform);
    }
  }
  return Array.from(byKey.values()).sort(comparePlatform);
}

// Requirement 1: Channel is a real ordered level derived from the releases of
// the selected app+platform — the distinct release.channel values.
export function deriveChannels(
  releases: JsonRecord[],
  platformKey: PlatformKey | "",
): string[] {
  const channels = new Set<string>();
  for (const release of releases) {
    if (platformKey && releasePlatform(release).key !== platformKey) {
      continue;
    }
    const channel = releaseChannel(release);
    if (channel) {
      channels.add(channel);
    }
  }
  return Array.from(channels).sort((a, b) => {
    if (a === b) return 0;
    if (a === "stable") return -1;
    if (b === "stable") return 1;
    return a.localeCompare(b);
  });
}

// Requirement 1: the Release list is filtered by BOTH platform AND channel.
export function filterReleasesByPlatformAndChannel(
  releases: JsonRecord[],
  platformKey: PlatformKey | "",
  channel: string,
): JsonRecord[] {
  const wantedChannel = channel.trim();
  return releases.filter((release) => {
    if (platformKey && releasePlatform(release).key !== platformKey) {
      return false;
    }
    if (!wantedChannel) {
      return true;
    }
    const releaseChan = releaseChannel(release);
    // A release with no channel value falls through so a legacy release is not
    // hidden; a release with a differing channel is excluded.
    return !releaseChan || releaseChan === wantedChannel;
  });
}

export interface DeepLinkScopeInput {
  releases: JsonRecord[]; // releases belonging to the selected app
  platformParam: string;
  channelParam: string;
  releaseParam: string;
}

export interface DeepLinkScope {
  platformKey: PlatformKey | "";
  channel: string;
  releaseId: string;
  conflicts: string[];
}

// Requirement 1: restore the COMPLETE hierarchy from a URL, but FAIL VISIBLY on
// a conflicting deep link — a release_id whose platform/channel disagrees with
// the platform/channel params must NOT silently switch scope. On conflict the
// explicit params win and the release is not adopted.
export function resolveDeepLinkScope(input: DeepLinkScopeInput): DeepLinkScope {
  const { releases, platformParam, channelParam, releaseParam } = input;
  const available = deriveAvailablePlatforms(releases);
  const paramClass = normalizePlatform(platformParam);
  const paramPlatformAvailable =
    paramClass.known && available.some((p) => p.key === paramClass.key);
  const trimmedChannelParam = channelParam.trim();

  const release = releaseParam
    ? releases.find((r) => recordId(r) === releaseParam) || null
    : null;
  const releasePlat = release ? releasePlatform(release) : null;
  const releaseChan = release ? releaseChannel(release) : "";

  const conflicts: string[] = [];
  if (release) {
    if (paramPlatformAvailable && releasePlat && releasePlat.key !== paramClass.key) {
      conflicts.push(
        `release platform (${releasePlat.label}) does not match platform=${paramClass.label} in the link`,
      );
    }
    if (trimmedChannelParam && releaseChan && releaseChan !== trimmedChannelParam) {
      conflicts.push(
        `release channel (${releaseChan}) does not match channel=${trimmedChannelParam} in the link`,
      );
    }
  } else if (releaseParam) {
    conflicts.push(`release_id ${releaseParam} is not a release of this app`);
  }

  const hasConflict = conflicts.length > 0;

  let platformKey: PlatformKey | "";
  if (paramPlatformAvailable) {
    platformKey = paramClass.key;
  } else if (release && releasePlat && releasePlat.known && !hasConflict) {
    // No explicit platform param — adopt the deep-linked release's platform so
    // a shared release URL lands in scope. This is a restore, not a switch.
    platformKey = releasePlat.key;
  } else {
    platformKey = available[0]?.key ?? "";
  }

  let channel = trimmedChannelParam;
  if (!channel && release && !hasConflict) {
    channel = releaseChan;
  }

  const releaseId = release && !hasConflict ? recordId(release) : "";

  return { platformKey, channel, releaseId, conflicts };
}

export interface ScopeState {
  app: string;
  platform: string;
  channel: string;
  release: string;
  patch: string;
}

export type ScopeLevel = "app" | "platform" | "channel" | "release" | "patch";

// Requirement 1 cascade clearing, expressed as a pure reducer so the clearing
// rules are directly testable (the select* handlers consume this).
export function scopeAfterSelect(
  level: ScopeLevel,
  prev: ScopeState,
  value: string,
): ScopeState {
  switch (level) {
    case "app":
      return { app: value, platform: "", channel: "", release: "", patch: "" };
    case "platform":
      return { ...prev, platform: value, channel: "", release: "", patch: "" };
    case "channel":
      return { ...prev, channel: value, release: "", patch: "" };
    case "release":
      return { ...prev, release: value, patch: "" };
    case "patch":
      return { ...prev, patch: value };
  }
}

export interface RollbackScopeInput {
  patch: JsonRecord | null;
  releases: JsonRecord[]; // releases used to resolve the patch's base release
  selectedAppId: string;
  selectedPlatformKey: PlatformKey | "";
  selectedChannel: string;
  selectedReleaseId: string;
}

export interface RollbackScopeResult {
  allowed: boolean;
  reason: string;
  verified: {
    appId: string;
    platform: PlatformClass;
    channel: string;
    releaseId: string;
  };
}

const UNKNOWN_PLATFORM: PlatformClass = {
  key: "unknown",
  label: "Unknown",
  known: false,
};

// Requirement 3: rollback is platform-safe and fail-closed. The target patch's
// platform is derived from its OWN base release (patches carry no platform).
// If the release/platform cannot be resolved, or the platform is unknown, or
// app/platform/channel/release disagree with the visible scope, rollback is not
// allowed and is never defaulted to Android.
export function validateRollbackScope(
  input: RollbackScopeInput,
): RollbackScopeResult {
  const {
    patch,
    releases,
    selectedAppId,
    selectedPlatformKey,
    selectedChannel,
    selectedReleaseId,
  } = input;

  if (!patch) {
    return {
      allowed: false,
      reason: "Load the patch identity before rollback.",
      verified: {
        appId: "",
        platform: UNKNOWN_PLATFORM,
        channel: "",
        releaseId: "",
      },
    };
  }

  const patchAppId = fieldText(patch, ["app_id", "app"]);
  const patchReleaseId = fieldText(patch, ["release_id", "release"]);
  const patchChannel = fieldText(patch, ["channel"]);
  const release = patchReleaseId
    ? releases.find((r) => recordId(r) === patchReleaseId) || null
    : null;
  const platform = release ? releasePlatform(release) : UNKNOWN_PLATFORM;
  const verified = {
    appId: patchAppId,
    platform,
    channel: patchChannel,
    releaseId: patchReleaseId,
  };

  // Fail-closed: an unresolved release or an unknown/unsupported platform must
  // disable rollback rather than assume a store target.
  if (!release || !platform.known) {
    return {
      allowed: false,
      reason:
        "Cannot resolve this patch's release/platform — rollback is disabled.",
      verified,
    };
  }

  if (selectedPlatformKey && platform.key !== selectedPlatformKey) {
    return {
      allowed: false,
      reason: `Patch platform (${platform.label}) does not match the selected platform.`,
      verified,
    };
  }

  if (selectedAppId && patchAppId && patchAppId !== selectedAppId) {
    return {
      allowed: false,
      reason: `Patch app ${patchAppId} does not match the selected app.`,
      verified,
    };
  }

  if (
    selectedReleaseId &&
    patchReleaseId &&
    patchReleaseId !== selectedReleaseId
  ) {
    return {
      allowed: false,
      reason: `Patch release ${patchReleaseId} does not match the selected release.`,
      verified,
    };
  }

  if (
    selectedChannel &&
    patchChannel &&
    patchChannel !== selectedChannel
  ) {
    return {
      allowed: false,
      reason: `Patch channel ${patchChannel} does not match the selected channel.`,
      verified,
    };
  }

  return { allowed: true, reason: "", verified };
}

// Requirement 5 (case 12): a Firebase-authenticated account that is not on the
// operator allowlist returns HTTP 403 from /api/operator/me — a distinct
// "denied" state, not a generic error.
export function classifyAuthError(status: number | null): "denied" | "error" {
  return status === 403 ? "denied" : "error";
}
