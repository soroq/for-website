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
    order: 1,
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
        next: "Cut the base release.",
      },
      {
        heading: "2. Cut the base release",
        anchor: "2-cut-the-base-release",
        intro:
          "Register the stock APK as the base the patch will target. Run this from inside my_app.",
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
        heading: "3. Change visible code and patch",
        anchor: "3-change-visible-code-and-patch",
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
        next: "Roll back once you have confirmed the patched value on device.",
        callouts: [
          {
            tone: "staged",
            title: "Two-cold-start model",
            body: "The first launch after a patch is published stages it (downloads + verifies). The NEXT cold start activates it. A single launch never both stages and activates.",
          },
        ],
      },
      {
        heading: "4. Roll back",
        anchor: "4-roll-back",
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
        next: "Roll back after confirming the patched value on device.",
        callouts: [
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
    order: 2,
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
