// Soroq documentation content registry — the single source of truth for the
// docs system. PURE DATA (no JSX, no React) so scripts/gen-search-index.mjs can
// transpile and walk it at build time. All version-bearing strings come from
// PRODUCT so the content guard stays green and nothing drifts.

import { PRODUCT } from "@/lib/productConstants";
import type { DocPage, NavGroup } from "./types";

const API = PRODUCT.apiBaseUrl;
const ANDROID_TC = PRODUCT.androidToolchainId;
const IOS_TC = PRODUCT.iosToolchainId;
const FRONTEND = PRODUCT.frontendId;

// Public installer + PATH + version check. One canonical block reused across
// pages so the install story never diverges.
export const installCommand = `curl --proto '=https' --tlsv1.2 ${PRODUCT.installScriptUrl} -sSf | bash
export PATH="$HOME/.soroq/bin:$PATH"
soroq version   # -> soroq ${PRODUCT.cliVersion}`;

// slug(heading) -> stable, deep-linkable anchor.
export function anchorFor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Nav groups, in sidebar order.
export const NAV_GROUPS: NavGroup[] = [
  { label: "Start", order: 1 },
  { label: "Guides", order: 2 },
  { label: "Reference", order: 3 },
];

const pages: DocPage[] = [
  // ---------------------------------------------------------------- getting-started
  {
    slug: "getting-started",
    title: "Getting started",
    group: "Start",
    order: 3,
    summary:
      "Install the CLI, pick a platform, install just that toolchain, run doctor, then log in only to publish.",
    status: "experimental",
    metadata: {
      audience: "New Soroq users",
      requires: "macOS or Linux",
      login: "Only needed to publish",
    },
    sections: [
      {
        heading: "Before you begin",
        anchor: "before-you-begin",
        intro:
          "Soroq delivers hard over-the-air patches to Flutter apps: cut a base release, ship a code (Android) or engine (iOS) patch, watch it stage and activate, and roll back on demand. Installs and doctor work with no account — only publishing needs a login.",
        callouts: [
          {
            tone: "experimental",
            title: "Experimental",
            body: `Both platforms are experimental. Android is fresh-user proven (${PRODUCT.tiers.android}). iOS is ${PRODUCT.tiers.ios}. macOS and Linux are supported; Windows is pending.`,
          },
        ],
      },
      {
        heading: "1. Install the Soroq CLI",
        anchor: "1-install-the-soroq-cli",
        intro:
          "Run the public installer, add the bin directory to your PATH, and confirm the version. This installs both soroq and soroqctl. No login required.",
        cwd: "~",
        commands: [installCommand],
        output: `soroq ${PRODUCT.cliVersion}`,
        next: "Choose your platform and install its toolchain.",
        callouts: [
          {
            tone: "note",
            body: "Prefer to build it yourself? Clone github.com/soroq/install and run make build in backend/. Full install, checksum verification, and quarantine steps are on the CLI page.",
          },
        ],
      },
      {
        heading: "2. Choose a platform and install its toolchain",
        anchor: "2-choose-a-platform-and-install-its-toolchain",
        intro:
          "Pick Android or iOS with the selector above, then pin the frontend and only that platform's toolchain. You do not install both. Finish with doctor. None of these steps require a login.",
        cwd: "~",
        codeTabs: [
          {
            platform: "android",
            label: "Android",
            code: `soroq frontend install ${FRONTEND} --api ${API}
soroq toolchain install ${ANDROID_TC} --api ${API}
soroq toolchain doctor`,
          },
          {
            platform: "ios",
            label: "iOS",
            code: `soroq frontend install ${FRONTEND} --api ${API}
soroq toolchain install ${IOS_TC} --api ${API}
soroq toolchain doctor`,
          },
        ],
        output: "toolchain doctor: frontend + toolchain present and consistent",
        next: "Log in — but only when you are ready to publish.",
        callouts: [
          {
            tone: "verified",
            body: "soroq toolchain doctor reports whether the frontend and the toolchain you installed are present and consistent before you build anything.",
          },
          {
            tone: "note",
            title: "Download size",
            body: "The frontend archive is about 1.06 GiB (1,140,170,246 bytes, measured from its /archive endpoint). Toolchain archive sizes are not published (their /archive HEAD is not served over the API), so expect an additional download on first install. Have a solid connection and some disk headroom.",
          },
        ],
      },
      {
        heading: "3. Log in (only to publish)",
        anchor: "3-log-in-only-to-publish",
        intro:
          "Authenticate against the hosted surface, then confirm your identity. You only need this immediately before you publish a release or a patch — installs and doctor never ask for it.",
        cwd: "~",
        commands: [
          `soroq login --hosted-surface ${PRODUCT.hostedLoginUrl} --api ${API}`,
          `soroq whoami --api ${API}`,
        ],
        output: "logged in as <your-operator-email>",
        next: "Follow the Android or iOS quickstart for a full base -> patch -> rollback cycle.",
      },
      {
        heading: "4. Ship your first patch",
        anchor: "4-ship-your-first-patch",
        intro:
          "Everything is installed. Follow the platform quickstart to run a complete cycle: cut a base release, publish a visible patch at full rollout, verify it, then roll back.",
      },
    ],
    related: [
      { label: "Install the CLI", slug: "cli" },
      { label: "Android quickstart", slug: "android-quickstart" },
      { label: "iOS quickstart", slug: "ios-quickstart" },
      { label: "Troubleshooting", slug: "troubleshooting" },
    ],
  },

  // ---------------------------------------------------------------- android-quickstart
  {
    slug: "android-quickstart",
    title: "Android quickstart",
    group: "Guides",
    order: 1,
    platform: "android",
    status: "experimental",
    summary:
      "Take a stock Flutter APK to a signed code patch at full rollout, verify it, then roll it back.",
    metadata: {
      platform: "Android",
      tier: PRODUCT.tiers.android,
      cycle: "base -> patch -> rollback",
    },
    sections: [
      {
        heading: "Set up your identifiers",
        anchor: "set-up-your-identifiers",
        intro:
          "Export these once so every command below reads them instead of a bare <id>. Each line says where its value comes from — you pick most of them; Soroq returns status under the ids you provide.",
        cwd: "~",
        env: [
          {
            name: "SOROQ_API",
            example: API,
            origin: "constant",
            note: "The Soroq control-plane API. Always this value for the hosted service.",
          },
          {
            name: "SOROQ_APP_ID",
            example: "com.example.my_app",
            origin: "you-choose",
            note: "A stable identifier you pick for the app. Reuse it across every release and patch.",
          },
          {
            name: "SOROQ_CHANNEL",
            example: "stable",
            origin: "you-choose",
            note: "The release channel devices subscribe to, e.g. stable or beta.",
          },
          {
            name: "SOROQ_RELEASE_ID",
            example: "base-1.0.0",
            origin: "you-choose",
            note: "A label for the base release this patch targets. Soroq records it under this id.",
          },
          {
            name: "SOROQ_PATCH_ID",
            example: "patch-001",
            origin: "you-choose",
            note: "A label you pick for this patch. Soroq returns its rollout + verification status under this id.",
          },
        ],
        next: "Create the app and register Soroq.",
      },
      {
        heading: "1. Create the app and add Soroq",
        anchor: "1-create-the-app-and-add-soroq",
        intro:
          "Scaffold a stock Flutter app, add the runtime package, and initialize Soroq with the identifiers you exported.",
        cwd: "~",
        commands: [
          `flutter create my_app
cd my_app
flutter pub add soroq_flutter   # soroq_flutter ${PRODUCT.packages.soroqFlutter}
soroq init --app-id "$SOROQ_APP_ID" --channel "$SOROQ_CHANNEL" --api "$SOROQ_API"`,
        ],
        output: "soroq.yaml written; app registered on the channel",
        next: "Install the frontend and the Android toolchain.",
      },
      {
        heading: "2. Install the frontend and Android toolchain",
        anchor: "2-install-the-frontend-and-android-toolchain",
        intro:
          "Pin the shared frontend and the Android toolchain, then run doctor. These are downloads, not a login — no account is needed yet. Skip this only if doctor already reports both present.",
        cwd: "~/my_app",
        commands: [
          `soroq frontend install ${FRONTEND} --api "$SOROQ_API"
soroq toolchain install ${ANDROID_TC} --api "$SOROQ_API"
soroq toolchain doctor`,
        ],
        output: "toolchain doctor: frontend + Android toolchain present and consistent",
        next: "Cut the base release.",
        callouts: [
          {
            tone: "note",
            title: "Download size",
            body: "The frontend archive is about 1.06 GiB (1,140,170,246 bytes). Expect an additional toolchain download on first install, so keep some disk headroom.",
          },
        ],
      },
      {
        heading: "3. Cut the base release",
        anchor: "3-cut-the-base-release",
        intro:
          "Register the stock APK as the base the patch will target. The stock app shows the default counter value (42). Run this from inside my_app.",
        cwd: "~/my_app",
        commands: [
          `soroq release android \\
  --toolchain ${ANDROID_TC} \\
  --artifact-type apk --api "$SOROQ_API" \\
  --app-id "$SOROQ_APP_ID" --release-id "$SOROQ_RELEASE_ID" \\
  --version 1.0.0+1 --channel "$SOROQ_CHANNEL"`,
        ],
        output: "base release accepted for $SOROQ_RELEASE_ID (version 1.0.0+1)",
        next: "Change visible code and publish a patch.",
      },
      {
        heading: "4. Change visible code and patch",
        anchor: "4-change-visible-code-and-patch",
        intro:
          "Edit a lib/ Dart file so a visible value changes (for example a counter that reads 42 -> 91), then publish a code patch at 100% rollout.",
        cwd: "~/my_app",
        commands: [
          `soroq patch android \\
  --release-id "$SOROQ_RELEASE_ID" --patch-id "$SOROQ_PATCH_ID" \\
  --toolchain ${ANDROID_TC} \\
  --artifact-type apk --api "$SOROQ_API" \\
  --channel "$SOROQ_CHANNEL" --track "$SOROQ_CHANNEL" \\
  --kind code --rollout 100`,
        ],
        output: "patch $SOROQ_PATCH_ID published at 100% rollout",
        next: "Confirm the patch staged and activated on device.",
        callouts: [
          {
            tone: "staged",
            title: "Two-cold-start model",
            body: "The first launch after a patch is published stages it (downloads + verifies). The NEXT cold start activates it. A single launch never both stages and activates.",
          },
        ],
      },
      {
        heading: "5. Confirm the patch status on device",
        anchor: "5-confirm-the-patch-status-on-device",
        intro:
          "Cold-start the app once to stage the patch, then cold-start again to activate it. The visible value flips from 42 to 91 on the second launch. In code, read getAutoUpdateState() after the check completes (not the immediate return of runAutoUpdateNow()) to confirm the patch is staged then active before you move on.",
        cwd: "~/my_app",
        output: "auto-update state: patch $SOROQ_PATCH_ID active; app shows value 91",
        next: "Roll back to the base.",
        callouts: [
          {
            tone: "verified",
            body: "Once the second cold start shows the patched value, the patch is live at 100% rollout on the channel. That on-device value is the ground-truth status.",
          },
        ],
      },
      {
        heading: "6. Roll back",
        anchor: "6-roll-back",
        intro: "Revert to the base with a server-side rollback and verify it landed.",
        cwd: "~/my_app",
        commands: [`soroq rollback --patch-id "$SOROQ_PATCH_ID" --api "$SOROQ_API" --verify`],
        output: "rollback verified for $SOROQ_PATCH_ID",
        callouts: [
          {
            tone: "rollback",
            title: "Rollback nuance",
            body: "An already-running process may still show patched code for that launch. The NEXT cold start serves the base. Rollback is a server-side decision; --verify confirms it landed.",
          },
        ],
      },
      {
        heading: "Proven flow",
        anchor: "proven-flow",
        intro:
          "This exact cycle has been exercised end to end on the experimental hard-OTA tier.",
        rows: [
          { term: "Base", detail: "app shows value 42" },
          { term: "Patch", detail: "app shows value 91 after activation" },
          { term: "Rollback", detail: "next cold start returns to 42" },
          { term: "Tamper", detail: "a tampered patch is refused (fail-closed)" },
        ],
      },
    ],
    related: [
      { label: "Getting started", slug: "getting-started" },
      { label: "Install the CLI", slug: "cli" },
      { label: "iOS quickstart", slug: "ios-quickstart" },
      { label: "Troubleshooting", slug: "troubleshooting" },
    ],
  },

  // ---------------------------------------------------------------- ios-quickstart
  {
    slug: "ios-quickstart",
    title: "iOS quickstart",
    group: "Guides",
    order: 2,
    platform: "ios",
    status: "experimental",
    summary:
      "Patch a running Flutter engine on a physical iPhone, then roll back. Device-only, signing required.",
    metadata: {
      platform: "iOS",
      tier: PRODUCT.tiers.ios,
      requirement: "Physical iPhone + Apple signing",
    },
    sections: [
      {
        heading: "Requirements",
        anchor: "requirements",
        intro:
          "iOS hard OTA is experimental and runs on a physical device only. It does not run on the simulator, and Apple signing is required to install and run on device.",
        callouts: [
          {
            tone: "device",
            title: "Physical iPhone only",
            body: "The simulator is not supported. You need a real device, Apple signing set up, and the experimental iOS engine/toolchain tier.",
          },
        ],
      },
      {
        heading: "Set up your identifiers",
        anchor: "set-up-your-identifiers",
        intro:
          "Export these once so no command carries a bare <id>. The manifest signing keypair is generated for you — you never export the private seed.",
        cwd: "~",
        env: [
          {
            name: "SOROQ_API",
            example: API,
            origin: "constant",
            note: "The Soroq control-plane API. Always this value for the hosted service.",
          },
          {
            name: "SOROQ_APP_ID",
            example: "com.example.my_app",
            origin: "you-choose",
            note: "A stable identifier you pick for the app. Reuse it across releases and patches.",
          },
          {
            name: "SOROQ_CHANNEL",
            example: "stable",
            origin: "you-choose",
            note: "The release channel devices subscribe to, e.g. stable or beta.",
          },
          {
            name: "SOROQ_RELEASE_ID",
            example: "base-1.0.0",
            origin: "you-choose",
            note: "A label for the base engine release this patch targets. Soroq records it under this id.",
          },
          {
            name: "SOROQ_PATCH_ID",
            example: "patch-001",
            origin: "you-choose",
            note: "A label you pick for this engine patch. Soroq returns its status under this id.",
          },
        ],
        callouts: [
          {
            tone: "note",
            title: "manifest_trust is generated",
            body: "Soroq scaffolds manifest_trust for you: only the public key is written into your project. The private seed is stored at mode 0600 and gitignored — it is generated, never something you set.",
          },
        ],
        next: "Create the app and install the frontend + iOS toolchain.",
      },
      {
        heading: "1. Create the app and install frontend + toolchain",
        anchor: "1-create-the-app-and-install-frontend-toolchain",
        cwd: "~",
        commands: [
          `flutter create my_app && cd my_app
flutter pub add soroq_flutter   # soroq_flutter ${PRODUCT.packages.soroqFlutter}
soroq frontend install ${FRONTEND} --api "$SOROQ_API"
soroq toolchain install ${IOS_TC} --api "$SOROQ_API"`,
        ],
        output: "frontend + iOS toolchain installed",
        next: "Declare the functions the engine may patch.",
      },
      {
        heading: "2. Declare patchable functions in soroq.yaml",
        anchor: "2-declare-patchable-functions-in-soroq-yaml",
        intro:
          "List the functions the engine is allowed to patch under ios_engine, using the lib/<file>.dart#<function> form.",
        cwd: "~/my_app",
        commands: [
          `ios_engine:
  enabled: true
  patchable:
    - "lib/foo.dart#myFn"`,
        ],
        next: "Build the signed base release.",
      },
      {
        heading: "3. Build the signed base release",
        anchor: "3-build-the-signed-base-release",
        cwd: "~/my_app",
        commands: [
          `soroq release ios --engine --build \\
  --toolchain ${IOS_TC} \\
  --app-id "$SOROQ_APP_ID" --release-id "$SOROQ_RELEASE_ID" \\
  --channel "$SOROQ_CHANNEL" --api "$SOROQ_API"`,
        ],
        output: "signed base engine release built for $SOROQ_RELEASE_ID",
        next: "Publish an engine patch.",
      },
      {
        heading: "4. Publish an engine patch",
        anchor: "4-publish-an-engine-patch",
        cwd: "~/my_app",
        commands: [
          `soroq patch ios --engine \\
  --toolchain ${IOS_TC} \\
  --app-id "$SOROQ_APP_ID" --release-id "$SOROQ_RELEASE_ID" \\
  --patch-id "$SOROQ_PATCH_ID" \\
  --channel "$SOROQ_CHANNEL" --api "$SOROQ_API"`,
        ],
        output: "engine patch $SOROQ_PATCH_ID published",
        next: "Confirm the patched value on device, then roll back.",
        callouts: [
          {
            tone: "staged",
            title: "Relaunch to activate, then read the status",
            body: "Cold-start the app on the iPhone to stage the engine patch, then cold-start again to activate it: the device value flips from the base to the patched value. That on-device value is the ground-truth status before you roll back.",
          },
          {
            tone: "note",
            body: "A patch may only direct-call retained or manifest-listed symbols. Calls into symbols that were stripped are not available to the patch.",
          },
        ],
      },
      {
        heading: "5. Roll back",
        anchor: "5-roll-back",
        cwd: "~/my_app",
        commands: [
          `soroq rollback ios-engine --patch-id "$SOROQ_PATCH_ID" --api "$SOROQ_API" --verify`,
        ],
        output: "rollback verified for $SOROQ_PATCH_ID",
      },
      {
        heading: "Expected values",
        anchor: "expected-values",
        rows: [
          { term: "Base", detail: "device shows the base value" },
          { term: "Patch", detail: "device shows the patched value" },
          { term: "Rollback", detail: "device returns to the base value" },
          {
            term: "Tamper",
            detail: "refused: sig=FAIL, bad manifest signature (fail-closed)",
          },
        ],
      },
    ],
    related: [
      { label: "Getting started", slug: "getting-started" },
      { label: "Install the CLI", slug: "cli" },
      { label: "Android quickstart", slug: "android-quickstart" },
      { label: "Troubleshooting", slug: "troubleshooting" },
    ],
  },

  // ---------------------------------------------------------------- cli
  {
    slug: "cli",
    title: "CLI reference",
    group: "Reference",
    order: 1,
    summary:
      "Install on macOS or Linux, build from source, verify the download, and run soroq + soroqctl.",
    metadata: {
      version: PRODUCT.cliVersion,
      platforms: "macOS + Linux (Windows pending)",
      binaries: "soroq, soroqctl",
    },
    sections: [
      {
        heading: "Install on macOS or Linux",
        anchor: "install-on-macos-or-linux",
        intro:
          "Run the public installer, add the bin directory to your PATH, and check the version. install.sh auto-detects OS + architecture; macOS (Apple Silicon + Intel) and Linux (amd64 + arm64) are supported.",
        cwd: "~",
        commands: [installCommand],
        output: `soroq ${PRODUCT.cliVersion}`,
        callouts: [
          {
            tone: "note",
            body: "macOS and Linux are supported and smoke-tested — Linux is natively validated in CI, not under emulation. Windows is pending (see the Windows acceptance checklist). Building from source is supported on all three.",
          },
        ],
      },
      {
        heading: "Build from source",
        anchor: "build-from-source",
        intro:
          "backend/ is the public CLI source — the same client code shipped in the binary releases, exported deterministically (operator-only publishing and private control-plane code are excluded). No private module, private Git dependency, or local path is required.",
        cwd: "~",
        commands: [
          `git clone ${PRODUCT.installRepo}
cd install/backend
make build        # stamps ./VERSION -> ./soroq + ./soroqctl
./soroq version   # -> soroq ${PRODUCT.cliVersion}
# or plainly, without the Makefile:
go build ./cmd/soroq ./cmd/soroqctl
go test ./...`,
        ],
        output: `soroq ${PRODUCT.cliVersion}`,
        callouts: [
          {
            tone: "note",
            body: "The two operator-only commands (frontend publish, toolchain publish) are intentionally not in this build; every normal developer command (install/doctor, login/whoami/logout, init, release, patch, rollback) is present.",
          },
        ],
      },
      {
        heading: "Verify the download (SHA256)",
        anchor: "verify-the-download-sha256",
        intro:
          "install.sh verifies the SHA256 automatically. To check manually, download the release tarball and checksums.txt from the public release, then verify.",
        cwd: "~/Downloads",
        commands: ["shasum -a 256 -c checksums.txt"],
        output: "soroq: OK",
      },
      {
        heading: "Clear the macOS quarantine",
        anchor: "clear-the-macos-quarantine",
        intro:
          "If Gatekeeper blocks the binaries, remove the quarantine attribute, then re-run the version check.",
        cwd: "~",
        commands: [
          `xattr -dr com.apple.quarantine "$HOME/.soroq/bin/soroq" "$HOME/.soroq/bin/soroqctl"
soroq version   # -> soroq ${PRODUCT.cliVersion}`,
        ],
        output: `soroq ${PRODUCT.cliVersion}`,
      },
    ],
    related: [
      { label: "Getting started", slug: "getting-started" },
      { label: "Android quickstart", slug: "android-quickstart" },
      { label: "iOS quickstart", slug: "ios-quickstart" },
      { label: "Troubleshooting", slug: "troubleshooting" },
    ],
  },

  // ---------------------------------------------------------------- troubleshooting
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    group: "Reference",
    order: 6,
    summary:
      "Fix the errors you are most likely to hit: install, login, stale status, and fail-closed signatures.",
    metadata: {
      scope: "Install, login, platforms, versions, signatures",
    },
    sections: [
      {
        heading: "Login and identity",
        anchor: "login-and-identity",
        rows: [
          {
            term: "Keychain not found",
            detail:
              "On a fresh or sandboxed HOME the token falls back to ~/.soroq/config.json at mode 0600. Verify with soroq whoami.",
          },
        ],
      },
      {
        heading: "Missing frontend or toolchain",
        anchor: "missing-frontend-or-toolchain",
        rows: [
          {
            term: "Frontend missing",
            detail: `soroq frontend install ${FRONTEND} --api ${API}`,
          },
          {
            term: "Toolchain missing",
            detail: `soroq toolchain install <toolchain> --api ${API} (Android: ${ANDROID_TC}, iOS: ${IOS_TC})`,
          },
        ],
      },
      {
        heading: "Android",
        anchor: "android",
        rows: [
          {
            term: "Status looks stale after a check",
            detail:
              "Read getAutoUpdateState() after the check completes, not only the immediate return value of runAutoUpdateNow().",
          },
          {
            term: "Rollback still shows patched code",
            detail:
              "An already-running process may keep patched code for that launch. The NEXT cold start serves the base.",
          },
        ],
      },
      {
        heading: "iOS",
        anchor: "ios",
        rows: [
          {
            term: "Nothing happens on the simulator",
            detail:
              "Hard OTA is physical-device only. The simulator is not supported.",
          },
          {
            term: "App will not install or run",
            detail: "Apple signing is required to install and run on device.",
          },
        ],
      },
      {
        heading: "Platforms",
        anchor: "platforms",
        rows: [
          {
            term: "Windows",
            detail:
              "Windows is pending. install.sh does not offer it and install.ps1 stays gated behind SOROQ_INSTALL_ALLOW_WINDOWS=1. It becomes supported only after the interactive gates pass; see the Windows acceptance checklist.",
          },
          {
            term: "Prefer building from source",
            detail: `Supported on macOS and Linux (Windows pending): clone ${PRODUCT.installRepo}, cd install/backend, make build (or go build ./cmd/soroq ./cmd/soroqctl) -> soroq ${PRODUCT.cliVersion}.`,
          },
        ],
      },
      {
        heading: "Versions and signatures",
        anchor: "versions-and-signatures",
        rows: [
          {
            term: "Version bump / runtime_id mismatch",
            detail:
              "Patches are version and runtime specific. A version bump needs a new base release and a new patch built against it.",
          },
          {
            term: "manifest_signature_invalid / tamper error",
            detail:
              "This is fail-closed: the patch is NOT applied. Rebuild and re-sign from a trusted manifest.",
          },
        ],
      },
    ],
    related: [
      { label: "Getting started", slug: "getting-started" },
      { label: "Install the CLI", slug: "cli" },
      { label: "Android quickstart", slug: "android-quickstart" },
      { label: "iOS quickstart", slug: "ios-quickstart" },
    ],
  },

  // ---------------------------------------------------------------- what-is-soroq
  {
    slug: "what-is-soroq",
    title: "What is Soroq",
    group: "Start",
    order: 1,
    status: "experimental",
    summary:
      "A release-control layer that delivers hard over-the-air patches to eligible Flutter code, assets, and the iOS engine — not native or store-level changes.",
    metadata: {
      role: "Concept",
      updates: "Eligible Flutter code/assets + iOS engine",
      tier: "Experimental",
    },
    sections: [
      {
        heading: "What Soroq is",
        anchor: "what-soroq-is",
        intro:
          "Soroq is a release-control layer for Flutter apps. You cut a signed base release, ship a hard over-the-air patch against it, watch the patch stage and activate on a cold start, and roll back on demand. On Android it delivers a code patch; on iOS it patches the running Flutter engine. Installs and doctor need no account — only publishing a release or patch requires a login.",
        callouts: [
          {
            tone: "experimental",
            title: "Experimental on both platforms",
            body: `Android is ${PRODUCT.tiers.android}. iOS is ${PRODUCT.tiers.ios}. macOS and Linux are supported for the CLI; Windows is pending.`,
          },
        ],
      },
      {
        heading: "What it updates",
        anchor: "what-it-updates",
        intro:
          "A patch replaces eligible application content built against a specific base release and runtime.",
        rows: [
          { term: "Android", detail: "Eligible Flutter/Dart code and bundled assets, delivered as a code patch against a base APK release." },
          { term: "iOS", detail: "The running Flutter engine: functions you declare as patchable under ios_engine, against a signed base engine release." },
          { term: "Always signed", detail: "Every patch is delivered under a signed manifest and is version- and runtime-specific to the base it targets." },
        ],
      },
      {
        heading: "What it does not touch",
        anchor: "what-it-does-not-touch",
        intro:
          "Soroq does not replace the platform release process. It does not update native (Kotlin/Swift/Objective-C) code, embedded native libraries, app entitlements, or anything that requires a new store submission. It is not a store-distribution channel.",
        callouts: [
          {
            tone: "note",
            body: "A version bump or any native change still needs a fresh base release cut with the toolchain, and a new patch built against that base.",
          },
        ],
      },
    ],
    related: [
      { label: "Before you begin", slug: "before-you-begin" },
      { label: "Getting started", slug: "getting-started" },
      { label: "Compatibility & limitations", slug: "compatibility-limitations" },
      { label: "Product status", slug: "product-status" },
    ],
  },

  // ---------------------------------------------------------------- before-you-begin
  {
    slug: "before-you-begin",
    title: "Before you begin",
    group: "Start",
    order: 2,
    status: "experimental",
    summary:
      "Prerequisites: Flutter, a pub.dev-published app, macOS or Linux for the CLI, and — for iOS — a physical iPhone with Apple signing.",
    metadata: {
      cli: "macOS or Linux (Windows pending)",
      ios: "Physical iPhone + macOS/Xcode + Apple signing",
      disk: "~1.06 GiB for the frontend",
    },
    sections: [
      {
        heading: "For every platform",
        anchor: "for-every-platform",
        intro:
          "You need a working Flutter toolchain, a Flutter app that pulls in soroq_flutter from pub.dev, and a machine that can run the Soroq CLI.",
        rows: [
          { term: "Flutter", detail: "A current stable Flutter SDK on your PATH (flutter --version works)." },
          { term: "A pub.dev app", detail: `A Flutter app that depends on soroq_flutter (${PRODUCT.packages.soroqFlutter}) from pub.dev — add it with flutter pub add soroq_flutter.` },
          { term: "CLI host", detail: "macOS or Linux to run the soroq CLI. Windows is pending; building from source is supported on macOS and Linux." },
          { term: "Disk", detail: "Room for the shared frontend archive: about 1.06 GiB (1,140,170,246 bytes), plus a per-platform toolchain download." },
        ],
      },
      {
        heading: "Additional requirements for iOS",
        anchor: "additional-requirements-for-ios",
        intro:
          "iOS hard OTA is experimental and physical-device only. It does not run on the simulator.",
        callouts: [
          {
            tone: "device",
            title: "iOS is device-only",
            body: "You need a physical iPhone, macOS with Xcode, and Apple code signing set up to install and run on device. The simulator is not supported.",
          },
        ],
      },
    ],
    related: [
      { label: "What is Soroq", slug: "what-is-soroq" },
      { label: "Installation", slug: "installation" },
      { label: "Getting started", slug: "getting-started" },
      { label: "iOS quickstart", slug: "ios-quickstart" },
    ],
  },

  // ---------------------------------------------------------------- installation
  {
    slug: "installation",
    title: "Installation",
    group: "Start",
    order: 4,
    status: "experimental",
    summary:
      "Install the CLI, pin the shared frontend, add the platform toolchain you need, or build the CLI from source. Windows is pending.",
    metadata: {
      cli: PRODUCT.cliVersion,
      frontend: "~1.06 GiB archive",
      platforms: "macOS + Linux (Windows pending)",
    },
    sections: [
      {
        heading: "1. Install the CLI",
        anchor: "1-install-the-cli",
        intro:
          "Run the public installer, add the bin directory to your PATH, and confirm the version. This installs both soroq and soroqctl. No login required.",
        cwd: "~",
        commands: [installCommand],
        output: `soroq ${PRODUCT.cliVersion}`,
        next: "Install the shared frontend.",
      },
      {
        heading: "2. Install the frontend",
        anchor: "2-install-the-frontend",
        intro:
          "Pin the shared Flutter frontend both platforms build against. This is a one-time download of about 1.06 GiB.",
        cwd: "~",
        commands: [`soroq frontend install ${FRONTEND} --api ${API}`],
        output: "frontend installed",
        next: "Install the toolchain for your platform.",
        callouts: [
          {
            tone: "note",
            title: "Download size",
            body: "The frontend archive is about 1.06 GiB (1,140,170,246 bytes, measured from its /archive endpoint). Toolchain archive sizes are not published, so expect an extra download on first toolchain install.",
          },
        ],
      },
      {
        heading: "3. Install a platform toolchain",
        anchor: "3-install-a-platform-toolchain",
        intro:
          "Install only the toolchain for the platform you are shipping, then run doctor to confirm the frontend and toolchain are consistent.",
        cwd: "~",
        codeTabs: [
          {
            platform: "android",
            label: "Android",
            code: `soroq toolchain install ${ANDROID_TC} --api ${API}
soroq toolchain doctor`,
          },
          {
            platform: "ios",
            label: "iOS",
            code: `soroq toolchain install ${IOS_TC} --api ${API}
soroq toolchain doctor`,
          },
        ],
        output: "toolchain doctor: frontend + toolchain present and consistent",
        next: "Optionally build the CLI from source.",
      },
      {
        heading: "Build from source",
        anchor: "build-from-source",
        intro:
          "backend/ is the public CLI source. Clone it and build — no private module, private Git dependency, or local path is required.",
        cwd: "~",
        commands: [
          `git clone ${PRODUCT.installRepo}
cd install/backend
make build        # stamps ./VERSION -> ./soroq + ./soroqctl
./soroq version   # -> soroq ${PRODUCT.cliVersion}`,
        ],
        output: `soroq ${PRODUCT.cliVersion}`,
        callouts: [
          {
            tone: "note",
            title: "Windows is pending",
            body: "install.sh does not offer Windows and install.ps1 stays gated behind an explicit opt-in. Building from source is supported on macOS and Linux; Windows becomes supported only after the acceptance gates pass.",
          },
        ],
      },
    ],
    related: [
      { label: "Before you begin", slug: "before-you-begin" },
      { label: "Authentication", slug: "authentication" },
      { label: "CLI reference", slug: "cli" },
      { label: "Getting started", slug: "getting-started" },
    ],
  },

  // ---------------------------------------------------------------- authentication
  {
    slug: "authentication",
    title: "Authentication",
    group: "Start",
    order: 5,
    status: "experimental",
    summary:
      "Log in through the browser only when you are ready to publish. Tokens live in the OS keychain, or a mode-0600 file when no keychain is available.",
    metadata: {
      when: "Only to publish a release or patch",
      commands: "login, whoami, logout",
      storage: "Keychain or ~/.soroq/config.json (0600)",
    },
    sections: [
      {
        heading: "When you need to log in",
        anchor: "when-you-need-to-log-in",
        intro:
          "Installs and doctor never ask for an account. You only authenticate immediately before you publish a release or a patch. Logging in opens the hosted surface in your browser and returns an operator identity to the CLI.",
        callouts: [
          {
            tone: "note",
            body: "Browser login is the primary path. Do not wire a raw operator token into your environment as the normal way to authenticate — use soroq login.",
          },
        ],
      },
      {
        heading: "Log in, check identity, log out",
        anchor: "log-in-check-identity-log-out",
        cwd: "~",
        commands: [
          `soroq login --hosted-surface ${PRODUCT.hostedLoginUrl} --api ${API}
soroq whoami --api ${API}
soroq logout`,
        ],
        output: "logged in as <your-operator-email>",
      },
      {
        heading: "Where the token is stored",
        anchor: "where-the-token-is-stored",
        intro:
          "The CLI prefers the operating system keychain. On a fresh or sandboxed HOME where no keychain is available, it falls back to a plain file at mode 0600.",
        rows: [
          { term: "Keychain", detail: "The default and preferred store when the OS keychain is reachable." },
          { term: "0600 file fallback", detail: "~/.soroq/config.json at mode 0600 when the keychain is unavailable. Verify either way with soroq whoami." },
        ],
      },
    ],
    related: [
      { label: "Installation", slug: "installation" },
      { label: "Getting started", slug: "getting-started" },
      { label: "Security model", slug: "security-model" },
      { label: "Troubleshooting", slug: "troubleshooting" },
    ],
  },

  // ---------------------------------------------------------------- soroq-yaml-reference
  {
    slug: "soroq-yaml-reference",
    title: "soroq.yaml reference",
    group: "Reference",
    order: 2,
    status: "experimental",
    summary:
      "The keys soroq init writes and the ones you edit: app_id, channel, the ios_engine block, and the auto-scaffolded manifest_trust.",
    metadata: {
      written_by: "soroq init",
      keys: "app_id, channel, ios_engine, manifest_trust",
      location: "Project root",
    },
    sections: [
      {
        heading: "Keys",
        anchor: "keys",
        intro:
          "soroq init writes soroq.yaml at your project root. These are the keys it uses.",
        rows: [
          { term: "app_id", detail: "The stable identifier you pick for the app, reused across every release and patch (e.g. com.example.my_app)." },
          { term: "channel", detail: "The release channel devices subscribe to, e.g. stable or beta." },
          { term: "ios_engine.enabled", detail: "Set true to enable iOS engine patching for this app." },
          { term: "ios_engine.patchable", detail: "The list of functions the engine may patch, each in lib/<file>.dart#<function> form." },
          { term: "manifest_trust", detail: "Auto-scaffolded signing trust. soroq writes only the public key here; the private seed is stored separately at mode 0600 and gitignored." },
        ],
      },
      {
        heading: "Example",
        anchor: "example",
        intro:
          "A minimal soroq.yaml for an app that ships iOS engine patches. manifest_trust is generated for you — you never paste in a private seed.",
        cwd: "~/my_app",
        commands: [
          `app_id: "com.example.my_app"
channel: "stable"
ios_engine:
  enabled: true
  patchable:
    - "lib/foo.dart#myFn"
manifest_trust:
  public_key: "<auto-scaffolded public key>"`,
        ],
        callouts: [
          {
            tone: "note",
            title: "manifest_trust is generated",
            body: "You do not set manifest_trust by hand. Soroq scaffolds it: only the public key lands in the project; the private seed stays at mode 0600 and gitignored.",
          },
        ],
      },
    ],
    related: [
      { label: "iOS quickstart", slug: "ios-quickstart" },
      { label: "Security model", slug: "security-model" },
      { label: "Compatibility & limitations", slug: "compatibility-limitations" },
      { label: "CLI reference", slug: "cli" },
    ],
  },

  // ---------------------------------------------------------------- compatibility-limitations
  {
    slug: "compatibility-limitations",
    title: "Compatibility & limitations",
    group: "Reference",
    order: 3,
    status: "experimental",
    summary:
      "What is eligible for a patch versus what is blocked, the experimental boundaries, and the platform support matrix.",
    metadata: {
      cli: "macOS + Linux (Windows pending)",
      android: "OTA experimental",
      ios: "OTA experimental, device-only",
    },
    sections: [
      {
        heading: "Eligible vs blocked",
        anchor: "eligible-vs-blocked",
        intro:
          "A patch may only change content built against the base release it targets.",
        rows: [
          { term: "Eligible", detail: "Android: eligible Flutter/Dart code and bundled assets. iOS: engine functions you declare under ios_engine.patchable." },
          { term: "Blocked", detail: "Native code (Kotlin/Swift/Objective-C), embedded native libraries, entitlements, and anything that needs a new store submission." },
          { term: "iOS symbol rule", detail: "An iOS engine patch may only direct-call retained or manifest-listed symbols; calls into stripped (tree-shaken) symbols are not available to the patch." },
          { term: "Version-specific", detail: "Patches are version- and runtime-specific. A version bump needs a new base release and a new patch built against it." },
        ],
      },
      {
        heading: "Platform support matrix",
        anchor: "platform-support-matrix",
        rows: [
          { term: "CLI: macOS", detail: "Supported." },
          { term: "CLI: Linux", detail: "Supported (natively validated in CI, not emulated)." },
          { term: "CLI: Windows", detail: "Pending — gated behind an explicit opt-in until the acceptance gates pass." },
          { term: "Android OTA", detail: `${PRODUCT.tiers.android}.` },
          { term: "iOS OTA", detail: `${PRODUCT.tiers.ios}. The simulator is not supported.` },
        ],
      },
      {
        heading: "Experimental boundaries",
        anchor: "experimental-boundaries",
        callouts: [
          {
            tone: "experimental",
            title: "Both platforms are experimental",
            body: "Treat hard OTA as an experimental capability. iOS runs on a physical device only, and Apple signing is required to install and run on device.",
          },
        ],
      },
    ],
    related: [
      { label: "What is Soroq", slug: "what-is-soroq" },
      { label: "Security model", slug: "security-model" },
      { label: "Product status", slug: "product-status" },
      { label: "Troubleshooting", slug: "troubleshooting" },
    ],
  },

  // ---------------------------------------------------------------- security-model
  {
    slug: "security-model",
    title: "Security model",
    group: "Reference",
    order: 4,
    status: "experimental",
    summary:
      "Every patch ships under a signed manifest verified against a pinned Ed25519 key. A bad signature is refused fail-closed, patches must match their base, and rollback is always available.",
    metadata: {
      signing: "Ed25519 signed manifests",
      failure: "Fail-closed on bad signature",
      recovery: "Server-side rollback",
    },
    sections: [
      {
        heading: "Signed manifests and Ed25519 trust",
        anchor: "signed-manifests-and-ed25519-trust",
        intro:
          "Every release and patch is delivered under a manifest signed with an Ed25519 keypair. The public key is scaffolded into your project as manifest_trust; the private seed is stored at mode 0600 and gitignored. The device verifies the manifest signature against the pinned public key before it will apply anything.",
      },
      {
        heading: "Fail-closed on a bad signature",
        anchor: "fail-closed-on-a-bad-signature",
        intro:
          "If the manifest signature does not verify, the patch is refused and NOT applied. There is no soft-fail path.",
        callouts: [
          {
            tone: "rollback",
            title: "Tamper is refused",
            body: "A tampered patch fails verification (sig=FAIL) and is rejected fail-closed. The app keeps running its current trusted code; rebuild and re-sign from a trusted manifest to recover.",
          },
        ],
      },
      {
        heading: "Base-match and rollback",
        anchor: "base-match-and-rollback",
        rows: [
          { term: "Base match", detail: "A patch is version- and runtime-specific and only applies against the exact base release it was built for. A mismatch is not applied." },
          { term: "Rollback", detail: "Rollback is a server-side decision; the next cold start serves the base. Use --verify to confirm it landed." },
        ],
      },
    ],
    related: [
      { label: "soroq.yaml reference", slug: "soroq-yaml-reference" },
      { label: "Compatibility & limitations", slug: "compatibility-limitations" },
      { label: "Authentication", slug: "authentication" },
      { label: "Troubleshooting", slug: "troubleshooting" },
    ],
  },

  // ---------------------------------------------------------------- product-status
  {
    slug: "product-status",
    title: "Product status",
    group: "Reference",
    order: 5,
    status: "experimental",
    summary:
      "The honest state of Soroq: CLI on macOS and Linux, Android fresh-user proven, iOS fresh-user proven on a physical device, all experimental.",
    metadata: {
      cli: PRODUCT.cliVersion,
      android: PRODUCT.tiers.android,
      ios: PRODUCT.tiers.ios,
    },
    sections: [
      {
        heading: "Where each piece stands",
        anchor: "where-each-piece-stands",
        rows: [
          { term: "CLI", detail: `soroq ${PRODUCT.cliVersion} on macOS and Linux. Windows is pending. Building from source is supported on macOS and Linux.` },
          { term: "Android OTA", detail: `${PRODUCT.tiers.android}: the base -> patch -> rollback cycle has been exercised on emulator and device.` },
          { term: "iOS OTA", detail: `${PRODUCT.tiers.ios}: fresh-user proven on a physical iPhone, including a TestFlight install. The simulator is not supported.` },
          { term: "Packages", detail: `soroq_flutter ${PRODUCT.packages.soroqFlutter}, soroq_sdk ${PRODUCT.packages.soroqSdk}, from pub.dev.` },
        ],
      },
      {
        heading: "What we do not claim",
        anchor: "what-we-do-not-claim",
        intro:
          "Soroq does not claim App-Store or Play-Store production readiness, and it does not promise to hot-reload every kind of change. Both platforms are experimental.",
        callouts: [
          {
            tone: "experimental",
            title: "Experimental, honestly scoped",
            body: "Hard OTA on Android and iOS is experimental. iOS is device-only and requires Apple signing. Scope your expectations to the proven base -> patch -> rollback cycle.",
          },
        ],
      },
    ],
    related: [
      { label: "What is Soroq", slug: "what-is-soroq" },
      { label: "Compatibility & limitations", slug: "compatibility-limitations" },
      { label: "Android quickstart", slug: "android-quickstart" },
      { label: "iOS quickstart", slug: "ios-quickstart" },
    ],
  },
];

export const docRegistry: DocPage[] = pages;

export function pageBySlug(slug: string): DocPage | undefined {
  return docRegistry.find((p) => p.slug === slug);
}

// Reading order derived from (group order, page order) — drives prev/next.
export function orderedPages(): DocPage[] {
  const groupOrder = new Map(NAV_GROUPS.map((g) => [g.label, g.order]));
  return [...docRegistry].sort((a, b) => {
    const ga = groupOrder.get(a.group) ?? 99;
    const gb = groupOrder.get(b.group) ?? 99;
    return ga !== gb ? ga - gb : a.order - b.order;
  });
}

export function prevNext(slug: string): {
  prev?: DocPage;
  next?: DocPage;
} {
  const ordered = orderedPages();
  const i = ordered.findIndex((p) => p.slug === slug);
  if (i === -1) return {};
  return { prev: ordered[i - 1], next: ordered[i + 1] };
}

// Nav model: groups, each with its pages in order, for the left sidebar.
export function navModel(): { group: string; pages: DocPage[] }[] {
  return [...NAV_GROUPS]
    .sort((a, b) => a.order - b.order)
    .map((g) => ({
      group: g.label,
      pages: docRegistry
        .filter((p) => p.group === g.label)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((g) => g.pages.length > 0);
}
