import { describe, expect, it } from "vitest";
import type { InstallGroup, PatchDeliveryRow } from "@/operator/analytics";
import { parsePatches, parseReleases, type Patch } from "./model";
import { activeShares, buildVersionRows, versionOfRelease } from "./versions";
import { rollbackGuard, type RollbackGuardInput } from "./rollback";
import { HOME_ROUTE, parseRoute, routeToSearch } from "./route";

const releases = parseReleases([
  { id: "a-43", app_id: "app", version: "1.0.43+59", platform: "android", runtime_id: "rt43", channel: "stable", created_at: "2026-09-30T07:00:00Z" },
  { id: "i-43", app_id: "app", version: "1.0.43+59", platform: "ios", runtime_id: "rt43", channel: "stable", created_at: "2026-09-30T06:57:00Z" },
  { id: "a-41", app_id: "app", version: "1.0.41+57", platform: "android", runtime_id: "rt41", channel: "stable", created_at: "2026-09-27T14:50:00Z" },
  { id: "a-41-r2", app_id: "app", version: "1.0.41+57", platform: "android", runtime_id: "rt41", channel: "stable", created_at: "2026-09-27T14:54:00Z" },
  { id: "i-44", app_id: "app", version: "1.0.44+60", platform: "ios", runtime_id: "rt44", channel: "stable", created_at: "2026-10-01T09:00:00Z" },
]);

const installs: InstallGroup[] = [
  {
    runtimeId: "rt43", channel: "stable", version: "1.0.43+59", releaseIds: ["a-43", "i-43"],
    devices: 7202, active24h: 7197, active7d: 7202, lastSeen: "2026-10-01T07:00:00Z",
    platforms: {
      android: { devices: 6781, active24h: 6781, active7d: 6781 },
      ios: { devices: 227, active24h: 227, active7d: 227 },
      unknown: { devices: 194, active24h: 189, active7d: 194 },
    },
  },
  {
    runtimeId: "rt41", channel: "stable", version: "1.0.41+57", releaseIds: ["a-41", "a-41-r2"],
    devices: 100, active24h: 3, active7d: 50, lastSeen: "", platforms: null,
  },
];

const patches = parsePatches([
  { id: "p1", app_id: "app", release_id: "a-43", number: 1, channel: "stable", kind: "experimental_native_aot", rolled_back: true, created_at: "2026-10-01T01:00:00Z" },
  { id: "p2", app_id: "app", release_id: "a-43", number: 2, channel: "stable", kind: "experimental_native_aot", rolled_back: false, created_at: "2026-10-01T02:00:00Z" },
  { id: "p3", app_id: "app", release_id: "i-43", number: 1, channel: "stable", kind: "ios_engine", rolled_back: false, created_at: "2026-10-01T03:00:00Z" },
]);

const delivery = (patchId: string, failed: number): PatchDeliveryRow => ({
  patchId, patchNumber: 1, releaseId: "", channel: "stable", track: "", rolledBack: false, observed: true,
  successfulDevices: 10, failedDevices: failed, verifiedSuccessfulDevices: 0, verifiedFailedDevices: 0,
  unverifiedDevices: 0, adoption: "", failureClasses: [],
});

describe("versions", () => {
  const rows = buildVersionRows({ releases, patches, installs, delivery: [delivery("p3", 2)] });

  it("gives each build one row, newest version first, holding every release of that build", () => {
    expect(rows.map((r) => r.version)).toEqual(["1.0.44+60", "1.0.43+59", "1.0.41+57"]);
    expect(rows[1].releases.map((r) => r.id)).toEqual(["a-43", "i-43"]);
    expect(rows[1].platforms).toEqual(["android", "ios"]);
    // Re-registered on one platform: still one build, one row, installs counted once.
    expect(rows[2].releases.map((r) => r.id).sort()).toEqual(["a-41", "a-41-r2"]);
  });

  it("reports installs once per build, split by platform as the server counted them", () => {
    const v43 = rows[1].installs!;
    expect([v43.android?.devices, v43.ios?.devices, v43.unattributed, v43.total]).toEqual([6781, 227, 194, 7202]);
    expect(v43.split).toBe(true);
    // A server without the split: totals only, platform figures absent rather than zero.
    expect(rows[2].installs).toMatchObject({ split: false, android: null, ios: null, total: 100 });
    // Registered, but no phone has checked in yet: a row with no install figure at all.
    expect(rows[0].installs).toBeNull();
  });

  it("counts a build's patches across its platforms and keeps the newest", () => {
    expect(rows[1].patches).toMatchObject({ total: 3, live: 2, rolledBack: 1, failing: 1 });
    expect(rows[1].patches.latest?.patch.id).toBe("p3");
    expect(rows[1].patches.latest?.delivery?.failedDevices).toBe(2);
  });

  it("finds the build a release belongs to", () => {
    expect(versionOfRelease(rows, "i-43")?.key).toBe(rows[1].key);
    expect(versionOfRelease(rows, "nope")).toBeNull();
  });

  it("names the share of today's phones on each build, and invents none when nobody was active", () => {
    const shares = activeShares(rows)!;
    expect(shares.get(rows[1].key)).toBeCloseTo(7197 / 7200);
    expect(activeShares([rows[0]])).toBeNull();
  });

  it("tells two builds with one version string apart", () => {
    const twin = parseReleases([
      { id: "x1", version: "2.0.0", platform: "android", runtime_id: "aaaaaaaaaaaa1", created_at: "2026-01-01T00:00:00Z" },
      { id: "x2", version: "2.0.0", platform: "android", runtime_id: "bbbbbbbbbbbb2", created_at: "2026-01-02T00:00:00Z" },
    ]);
    const out = buildVersionRows({ releases: twin, patches: [], installs: null, delivery: [] });
    expect(out.map((r) => r.disambiguator).sort()).toEqual(["aaaaaaaa", "bbbbbbbb"]);
  });
});

describe("rollback guard", () => {
  const base: RollbackGuardInput = {
    appId: "app",
    appName: "Campus",
    target: "p2",
    confirmation: "p2",
    appPatches: patches as Patch[],
    health: { status: "ready", patchId: "p2" },
    signedIn: true,
    submitting: false,
  };

  it("arms only when every condition holds", () => {
    expect(rollbackGuard(base)).toMatchObject({ armed: true, reason: "" });
  });

  it("refuses a patch that is not this app's, as an error", () => {
    const g = rollbackGuard({ ...base, target: "other-app-patch", confirmation: "other-app-patch" });
    expect(g).toMatchObject({ armed: false, tone: "error" });
    expect(g.reason).toContain("not one of Campus's patches");
  });

  it("refuses an already rolled back patch", () => {
    expect(rollbackGuard({ ...base, target: "p1", confirmation: "p1", health: { status: "ready", patchId: "p1" } }).reason).toContain(
      "already rolled back",
    );
  });

  it("waits for device health loaded for THIS patch", () => {
    expect(rollbackGuard({ ...base, health: { status: "ready", patchId: "p3" } }).armed).toBe(false);
    expect(rollbackGuard({ ...base, health: { status: "loading", patchId: "p2" } }).armed).toBe(false);
    expect(rollbackGuard({ ...base, health: { status: "error", patchId: "p2" } })).toMatchObject({ armed: false, tone: "error" });
  });

  it("needs the exact id typed, and no request in flight", () => {
    expect(rollbackGuard({ ...base, confirmation: "p" }).armed).toBe(false);
    expect(rollbackGuard({ ...base, confirmation: " p2 " }).armed).toBe(true);
    expect(rollbackGuard({ ...base, submitting: true }).armed).toBe(false);
    expect(rollbackGuard({ ...base, signedIn: false }).armed).toBe(false);
    expect(rollbackGuard({ ...base, target: "" }).reason).toBe("Choose a patch first.");
  });
});

describe("route", () => {
  it("reads the console's existing link format, old patch_id included", () => {
    expect(parseRoute("?app_id=app&tab=rollback&patch_id=p2")).toEqual({ tab: "rollback", appId: "app", releaseId: "", patchId: "p2" });
    expect(parseRoute("?tab=nonsense")).toEqual(HOME_ROUTE);
  });

  it("writes only what it owns and keeps the CLI login handshake", () => {
    const search = routeToSearch(
      { tab: "releases", appId: "app", releaseId: "a-43", patchId: "" },
      "?cli_login_callback=x&cli_login_state=y&patch=old&channel=beta",
    );
    const params = new URLSearchParams(search);
    expect(params.get("cli_login_callback")).toBe("x");
    expect(params.get("cli_login_state")).toBe("y");
    expect(params.get("patch")).toBeNull();
    expect(params.get("channel")).toBeNull();
    expect(parseRoute(search)).toEqual({ tab: "releases", appId: "app", releaseId: "a-43", patchId: "" });
    expect(routeToSearch(HOME_ROUTE)).toBe("");
  });
});
