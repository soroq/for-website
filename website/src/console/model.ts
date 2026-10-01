// THE CONSOLE'S DOMAIN MODEL.
//
// The control plane answers with plain JSON. Each record is parsed exactly once, here, into a typed
// value; every screen works with these types and never reaches into a raw record. A field the server
// did not send becomes "" or 0 (or null where absence must stay visible), never a guess.

import type { JsonRecord } from "@/operator/types";

export type Platform = "android" | "ios" | "other";

export type App = {
  id: string;
  name: string;
  owner: string;
  createdAt: number;
};

export type Release = {
  id: string;
  appId: string;
  version: string;
  platform: Platform;
  /** The platform exactly as the server sent it, for display when it is neither Android nor iOS. */
  platformRaw: string;
  runtimeId: string;
  channel: string;
  arch: string;
  toolchainId: string;
  engineRevision: string;
  flutterRevision: string;
  createdAt: number;
};

export type Patch = {
  id: string;
  appId: string;
  releaseId: string;
  runtimeId: string;
  number: number;
  channel: string;
  kind: string;
  rolloutPercent: number;
  rolledBack: boolean;
  createdAt: number;
};

function str(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function num(record: JsonRecord, key: string): number {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function time(record: JsonRecord, key: string): number {
  const value = record[key];
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function records(data: unknown): JsonRecord[] {
  return Array.isArray(data)
    ? data.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

export function toPlatform(raw: string): Platform {
  const p = raw.trim().toLowerCase();
  if (p === "android") return "android";
  if (p === "ios") return "ios";
  return "other";
}

export function platformName(platform: Platform, raw = ""): string {
  return platform === "android" ? "Android" : platform === "ios" ? "iOS" : raw || "Other";
}

export function parseApps(data: unknown): App[] {
  return records(data)
    .map((r) => {
      const id = str(r, "id") || str(r, "app_id");
      return {
        id,
        name: str(r, "display_name") || str(r, "name") || id,
        owner: str(r, "owner_email"),
        createdAt: time(r, "created_at"),
      };
    })
    .filter((app) => app.id);
}

export function parseReleases(data: unknown): Release[] {
  return records(data)
    .map((r) => {
      const platformRaw = str(r, "platform");
      const id = str(r, "id") || str(r, "release_id");
      return {
        id,
        appId: str(r, "app_id"),
        version: str(r, "version") || id,
        platform: toPlatform(platformRaw),
        platformRaw,
        runtimeId: str(r, "runtime_id"),
        channel: str(r, "channel") || "stable",
        arch: str(r, "arch"),
        toolchainId: str(r, "toolchain_id"),
        engineRevision: str(r, "soroq_engine_revision"),
        flutterRevision: str(r, "flutter_revision"),
        createdAt: time(r, "created_at"),
      };
    })
    .filter((release) => release.id);
}

export function parsePatches(data: unknown): Patch[] {
  return records(data)
    .map((r) => ({
      id: str(r, "id") || str(r, "patch_id"),
      appId: str(r, "app_id"),
      releaseId: str(r, "release_id"),
      runtimeId: str(r, "runtime_id"),
      number: num(r, "number") || num(r, "patch_number"),
      channel: str(r, "channel") || "stable",
      kind: str(r, "kind"),
      rolloutPercent: r.rollout_percent === undefined ? 100 : num(r, "rollout_percent"),
      rolledBack: r.rolled_back === true,
      createdAt: time(r, "created_at"),
    }))
    .filter((patch) => patch.id);
}

const KIND_LABELS: Record<string, string> = {
  ios_engine: "Dart code",
  experimental_native_aot: "Dart code",
  native_aot: "Dart code",
  code: "Dart code",
  asset: "Assets",
  config: "Config",
};

export function patchKindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? (kind ? kind.replace(/_/g, " ") : "Unknown");
}

/** Orders versions like 1.0.43+59 newest first: numeric runs compare as numbers. */
export function compareVersionsDesc(a: string, b: string): number {
  const parts = (v: string) => v.split(/[^0-9]+/).filter(Boolean).map(Number);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] ?? -1) - (pa[i] ?? -1);
    if (d !== 0) return d;
  }
  return b.localeCompare(a);
}

export function formatDateTime(ms: number): string {
  if (!ms) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function shortId(value: string, length = 12): string {
  return value.length > length ? value.slice(0, length) : value;
}
