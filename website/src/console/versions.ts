// ONE ROW PER STORE VERSION.
//
// A store version is one build: the Android and iOS releases of 1.0.43 share a runtime, and phones report
// the build they run, not the release record. So installs belong to the version, and the console shows
// them once, per version, split by platform -- never again per release, where the same phones would be
// counted a second time.
//
// The join is done here, once, from three server answers:
//   releases  -- the registrations (one per platform, sometimes re-registered: 1.0.41 has two Android ones)
//   installs  -- the server's install groups (runtime + channel), each naming the releases it covers
//   patches   -- with their delivery health from device reports
// A release no install group names still gets a row (no phone has checked in on it yet), keyed by its own
// runtime, so a fresh store build shows up the moment it is registered.

import type { InstallGroup, PatchDeliveryRow } from "@/operator/analytics";
import { healthOf } from "./health";
import { compareVersionsDesc, shortId, type Patch, type Platform, type Release } from "./model";

export type PlatformInstalls = { devices: number; active24h: number; active7d: number };

export type VersionInstalls = {
  android: PlatformInstalls | null;
  ios: PlatformInstalls | null;
  /** Phones counted before installs were split by platform; they move to a platform on their next launch. */
  unattributed: number;
  /** Distinct phones on this build, as the server counted them (includes the unattributed). */
  total: number;
  active24h: number;
  active7d: number;
  lastSeen: string;
  /** False when the server predates the platform split: only the totals are known. */
  split: boolean;
};

export type VersionPatches = {
  total: number;
  live: number;
  rolledBack: number;
  failing: number;
  /** The newest patch on this version, with what devices reported about it (null if none reported). */
  latest: { patch: Patch; delivery: PatchDeliveryRow | null } | null;
};

export type VersionRow = {
  key: string;
  version: string;
  /** Set when two builds share a version string (re-registered): the short runtime tells them apart. */
  disambiguator: string;
  channel: string;
  runtimeId: string;
  releases: Release[];
  platforms: Platform[];
  installs: VersionInstalls | null;
  patches: VersionPatches;
  /** When the first release of this build was registered. */
  registeredAt: number;
};

function groupKey(runtimeId: string, channel: string, version: string): string {
  return runtimeId ? `rt:${runtimeId}|${channel}` : `v:${version}|${channel}`;
}

function installsOf(group: InstallGroup): VersionInstalls {
  const p = group.platforms;
  return {
    android: p ? (p.android ?? { devices: 0, active24h: 0, active7d: 0 }) : null,
    ios: p ? (p.ios ?? { devices: 0, active24h: 0, active7d: 0 }) : null,
    unattributed: p?.unknown?.devices ?? 0,
    total: group.devices,
    active24h: group.active24h,
    active7d: group.active7d,
    lastSeen: group.lastSeen,
    split: p !== null,
  };
}

export function buildVersionRows(input: {
  releases: Release[];
  patches: Patch[];
  installs: InstallGroup[] | null;
  delivery: PatchDeliveryRow[];
}): VersionRow[] {
  const releaseById = new Map(input.releases.map((r) => [r.id, r]));
  const deliveryByPatch = new Map(input.delivery.map((d) => [d.patchId, d]));
  const rows = new Map<string, VersionRow>();
  const assigned = new Set<string>();

  const ensure = (key: string, version: string, channel: string, runtimeId: string): VersionRow => {
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        version,
        disambiguator: "",
        channel,
        runtimeId,
        releases: [],
        platforms: [],
        installs: null,
        patches: { total: 0, live: 0, rolledBack: 0, failing: 0, latest: null },
        registeredAt: 0,
      };
      rows.set(key, row);
    }
    return row;
  };

  for (const group of input.installs ?? []) {
    const members = group.releaseIds.map((id) => releaseById.get(id)).filter((r): r is Release => Boolean(r));
    const version = group.version || members[0]?.version || "Unregistered build";
    const row = ensure(groupKey(group.runtimeId, group.channel, version), version, group.channel || "stable", group.runtimeId);
    row.installs = installsOf(group);
    for (const release of members) {
      if (!assigned.has(release.id)) {
        row.releases.push(release);
        assigned.add(release.id);
      }
    }
  }

  for (const release of input.releases) {
    if (assigned.has(release.id)) continue;
    const row = ensure(
      groupKey(release.runtimeId, release.channel, release.version),
      release.version,
      release.channel,
      release.runtimeId,
    );
    row.releases.push(release);
    assigned.add(release.id);
  }

  const rowByRelease = new Map<string, VersionRow>();
  for (const row of rows.values()) {
    for (const release of row.releases) rowByRelease.set(release.id, row);
    row.releases.sort((a, b) => a.platform.localeCompare(b.platform) || b.createdAt - a.createdAt);
    row.platforms = [...new Set(row.releases.map((r) => r.platform))].sort();
    row.registeredAt = row.releases.reduce((min, r) => (r.createdAt && (!min || r.createdAt < min) ? r.createdAt : min), 0);
  }

  for (const patch of input.patches) {
    const row = rowByRelease.get(patch.releaseId);
    if (!row) continue;
    const delivery = deliveryByPatch.get(patch.id) ?? null;
    row.patches.total += 1;
    if (patch.rolledBack) row.patches.rolledBack += 1;
    else row.patches.live += 1;
    if (delivery && !patch.rolledBack && healthOf(delivery) === "failing") row.patches.failing += 1;
    const latest = row.patches.latest?.patch;
    if (!latest || patch.createdAt > latest.createdAt || (patch.createdAt === latest.createdAt && patch.number > latest.number)) {
      row.patches.latest = { patch, delivery };
    }
  }

  const list = [...rows.values()].sort(
    (a, b) => compareVersionsDesc(a.version, b.version) || b.registeredAt - a.registeredAt,
  );
  const seen = new Map<string, number>();
  for (const row of list) seen.set(row.version, (seen.get(row.version) ?? 0) + 1);
  for (const row of list) {
    if ((seen.get(row.version) ?? 0) > 1) row.disambiguator = row.runtimeId ? shortId(row.runtimeId, 8) : row.channel;
  }
  return list;
}

/**
 * Each version's share of the phones opened in the last 24 hours. Approximate by nature: a phone that
 * moved to a new version today was counted on both builds, so the shares are labelled as approximate
 * wherever they are shown. Null when no phone was active, so no share is invented.
 */
export function activeShares(rows: VersionRow[]): Map<string, number> | null {
  const total = rows.reduce((sum, row) => sum + (row.installs?.active24h ?? 0), 0);
  if (!total) return null;
  return new Map(rows.map((row) => [row.key, (row.installs?.active24h ?? 0) / total]));
}

/** The version of `releaseId`, if any row holds it. */
export function versionOfRelease(rows: VersionRow[], releaseId: string): VersionRow | null {
  return rows.find((row) => row.releases.some((r) => r.id === releaseId)) ?? null;
}
