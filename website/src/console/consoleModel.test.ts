// Deterministic regression coverage for the operator-console decision logic.
//
// Mechanism: Node's built-in `node:test` runner (zero new dependencies, no test
// framework). The `.js` import specifier is required because the project
// tsconfig uses `moduleResolution: Bundler` without `allowImportingTsExtensions`
// (a `.ts` specifier would break `tsc -b` / `npm run build`, which cannot be
// fixed inside the allowed files). Run standalone (see the header of the Worker
// report): compile both files with `npx tsc ... --module nodenext` to /tmp and
// `node --test` the emitted JS. All fixtures are inline — no network.

// Types for the Node built-in test/assert modules come from the sibling
// consoleTestShims.d.ts (the project tsconfig does not auto-include @types/node
// for `node:` imports, and tsconfig is outside this task's allowed files).
// Runtime is provided by Node itself.
import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyAuthError,
  deriveAvailablePlatforms,
  deriveChannels,
  filterReleasesByPlatformAndChannel,
  normalizePlatform,
  resolveDeepLinkScope,
  scopeAfterSelect,
  validateRollbackScope,
  type JsonRecord,
} from "./consoleModel.js";

// --- fixtures -------------------------------------------------------------

const androidStable: JsonRecord = {
  id: "rel-a1",
  app_id: "app-1",
  platform: "android",
  channel: "stable",
  version: "1.0.0",
};
const androidBeta: JsonRecord = {
  id: "rel-a2",
  app_id: "app-1",
  platform: "android",
  channel: "beta",
  version: "1.1.0",
};
const iosStable: JsonRecord = {
  id: "rel-i1",
  app_id: "app-1",
  platform: "ios",
  channel: "stable",
  version: "1.0.0",
};

const androidOnly = [androidStable, androidBeta];
const iosOnly = [iosStable];
const bothPlatforms = [androidStable, androidBeta, iosStable];

const emptyScope = {
  app: "app-1",
  platform: "android",
  channel: "stable",
  release: "rel-a1",
  patch: "patch-9",
};

// --- case 1: Android-only app --------------------------------------------

test("case 1: Android-only app exposes only the Android platform", () => {
  const platforms = deriveAvailablePlatforms(androidOnly);
  assert.deepEqual(
    platforms.map((p) => p.key),
    ["android"],
  );
  assert.equal(platforms[0].known, true);
});

// --- case 2: iOS-only app -------------------------------------------------

test("case 2: iOS-only app exposes only the iOS platform", () => {
  const platforms = deriveAvailablePlatforms(iosOnly);
  assert.deepEqual(
    platforms.map((p) => p.key),
    ["ios"],
  );
});

// --- case 3: app with BOTH platforms -------------------------------------

test("case 3: app with both platforms lists Android first, then iOS", () => {
  const platforms = deriveAvailablePlatforms(bothPlatforms);
  assert.deepEqual(
    platforms.map((p) => p.key),
    ["android", "ios"],
  );
});

// --- case 4: multiple channels on one platform ---------------------------

test("case 4: multiple channels on one platform are derived (stable first)", () => {
  const channels = deriveChannels(androidOnly, "android");
  assert.deepEqual(channels, ["stable", "beta"]);
  // Channel derivation is platform-scoped: iOS has no beta here.
  assert.deepEqual(deriveChannels(bothPlatforms, "ios"), ["stable"]);
});

// --- case 5: platform switch clears dependent state ----------------------

test("case 5: switching platform clears channel + release + patch", () => {
  const next = scopeAfterSelect("platform", emptyScope, "ios");
  assert.deepEqual(next, {
    app: "app-1",
    platform: "ios",
    channel: "",
    release: "",
    patch: "",
  });
});

// --- case 6: channel switch clears release/patch -------------------------

test("case 6: switching channel clears release + patch but keeps app/platform", () => {
  const next = scopeAfterSelect("channel", emptyScope, "beta");
  assert.deepEqual(next, {
    app: "app-1",
    platform: "android",
    channel: "beta",
    release: "",
    patch: "",
  });
  // Selecting an app clears everything below it.
  assert.deepEqual(scopeAfterSelect("app", emptyScope, "app-2"), {
    app: "app-2",
    platform: "",
    channel: "",
    release: "",
    patch: "",
  });
});

// --- case 7: valid deep link ---------------------------------------------

test("case 7: a valid deep link restores the full hierarchy with no conflict", () => {
  const scope = resolveDeepLinkScope({
    releases: bothPlatforms,
    platformParam: "android",
    channelParam: "beta",
    releaseParam: "rel-a2",
  });
  assert.deepEqual(scope.conflicts, []);
  assert.equal(scope.platformKey, "android");
  assert.equal(scope.channel, "beta");
  assert.equal(scope.releaseId, "rel-a2");
});

test("case 7b: a release-only deep link adopts the release's own platform/channel", () => {
  const scope = resolveDeepLinkScope({
    releases: bothPlatforms,
    platformParam: "",
    channelParam: "",
    releaseParam: "rel-i1",
  });
  assert.deepEqual(scope.conflicts, []);
  assert.equal(scope.platformKey, "ios");
  assert.equal(scope.channel, "stable");
  assert.equal(scope.releaseId, "rel-i1");
});

// --- case 8: conflicting platform/release deep link ----------------------

test("case 8: a conflicting platform/release deep link fails visibly and does NOT switch scope", () => {
  // platform=ios but release rel-a2 is an Android release.
  const scope = resolveDeepLinkScope({
    releases: bothPlatforms,
    platformParam: "ios",
    channelParam: "stable",
    releaseParam: "rel-a2",
  });
  assert.equal(scope.conflicts.length >= 1, true);
  // Explicit platform param wins; the Android release is NOT adopted.
  assert.equal(scope.platformKey, "ios");
  assert.equal(scope.releaseId, "");
});

test("case 8b: a conflicting channel deep link is flagged and the release is dropped", () => {
  const scope = resolveDeepLinkScope({
    releases: bothPlatforms,
    platformParam: "android",
    channelParam: "beta",
    releaseParam: "rel-a1", // rel-a1 is stable, not beta
  });
  assert.equal(scope.conflicts.length >= 1, true);
  assert.equal(scope.releaseId, "");
});

// --- case 9: unknown platform --------------------------------------------

test("case 9: unknown/unsupported platforms are never classified as Android", () => {
  for (const raw of ["", "macos", "linux", "windows", "  ", "garbage"]) {
    const p = normalizePlatform(raw);
    assert.equal(p.key, "unknown");
    assert.equal(p.known, false);
    assert.notEqual(p.key, "android");
  }
  // Known values keep current behavior (case-insensitive, trimmed).
  assert.deepEqual(normalizePlatform(" Android "), {
    key: "android",
    label: "Android",
    known: true,
  });
  assert.deepEqual(normalizePlatform("iOS"), {
    key: "ios",
    label: "iOS",
    known: true,
  });
  assert.equal(normalizePlatform("macos").label, "Unsupported (macos)");
});

// --- case 10: rollback platform mismatch ---------------------------------

test("case 10: a patch whose release platform != selected platform is NOT rollback-able", () => {
  const patch: JsonRecord = {
    id: "patch-1",
    app_id: "app-1",
    release_id: "rel-i1", // iOS release
    channel: "stable",
  };
  const result = validateRollbackScope({
    patch,
    releases: bothPlatforms,
    selectedAppId: "app-1",
    selectedPlatformKey: "android", // operator is browsing Android
    selectedChannel: "stable",
    selectedReleaseId: "",
  });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /platform/i);
  // The dialog would show the VERIFIED platform derived from the patch's release.
  assert.equal(result.verified.platform.key, "ios");
});

// --- case 11: manually-entered patch outside visible scope ---------------

test("case 11: a manually-entered patch outside the visible scope is NOT rollback-able", () => {
  // Right platform, wrong release.
  const wrongRelease: JsonRecord = {
    id: "patch-2",
    app_id: "app-1",
    release_id: "rel-a2",
    channel: "beta",
  };
  const mismatchRelease = validateRollbackScope({
    patch: wrongRelease,
    releases: bothPlatforms,
    selectedAppId: "app-1",
    selectedPlatformKey: "android",
    selectedChannel: "beta",
    selectedReleaseId: "rel-a1", // operator selected a different release
  });
  assert.equal(mismatchRelease.allowed, false);
  assert.match(mismatchRelease.reason, /release/i);

  // Fail-closed: a patch whose base release cannot be resolved is disabled and
  // its platform is never defaulted to Android.
  const unresolved: JsonRecord = {
    id: "patch-3",
    app_id: "app-1",
    release_id: "rel-does-not-exist",
    channel: "stable",
  };
  const unresolvedResult = validateRollbackScope({
    patch: unresolved,
    releases: bothPlatforms,
    selectedAppId: "app-1",
    selectedPlatformKey: "android",
    selectedChannel: "stable",
    selectedReleaseId: "",
  });
  assert.equal(unresolvedResult.allowed, false);
  assert.equal(unresolvedResult.verified.platform.key, "unknown");
  assert.notEqual(unresolvedResult.verified.platform.key, "android");

  // A fully in-scope patch on a resolvable release IS allowed.
  const inScope: JsonRecord = {
    id: "patch-4",
    app_id: "app-1",
    release_id: "rel-a1",
    channel: "stable",
  };
  const ok = validateRollbackScope({
    patch: inScope,
    releases: bothPlatforms,
    selectedAppId: "app-1",
    selectedPlatformKey: "android",
    selectedChannel: "stable",
    selectedReleaseId: "rel-a1",
  });
  assert.equal(ok.allowed, true);
  assert.equal(ok.verified.platform.key, "android");
});

// --- case 12: 403 allowlist-denied classification ------------------------

test("case 12: HTTP 403 classifies as allowlist-denied, other statuses as error", () => {
  assert.equal(classifyAuthError(403), "denied");
  assert.equal(classifyAuthError(500), "error");
  assert.equal(classifyAuthError(null), "error");
});

// --- extra: release filtering by platform AND channel --------------------

test("extra: releases are filtered by both platform and channel", () => {
  const androidStableReleases = filterReleasesByPlatformAndChannel(
    bothPlatforms,
    "android",
    "stable",
  );
  assert.deepEqual(androidStableReleases.map((r) => r.id), ["rel-a1"]);

  const iosStableReleases = filterReleasesByPlatformAndChannel(
    bothPlatforms,
    "ios",
    "stable",
  );
  assert.deepEqual(iosStableReleases.map((r) => r.id), ["rel-i1"]);
});
