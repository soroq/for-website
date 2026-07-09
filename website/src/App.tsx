import {
  AlertCircle,
  Apple,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileArchive,
  GitBranch,
  Home,
  ListChecks,
  Loader2,
  LockKeyhole,
  PackageCheck,
  RadioTower,
  RefreshCcw,
  RotateCcw,
  Search,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Wifi,
} from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SoroqMark } from "@/components/SoroqMark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function isOperatorRoute(pathname: string) {
  return pathname === "/operator" || pathname.endsWith("/operator.html");
}

function hasAuthProvider(providerConfig: string | undefined, provider: "google" | "github") {
  const providers = (providerConfig || "google")
    .split(/[,\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return providers.includes(provider) || providers.includes("all");
}

const navItems = [
  { label: "Platform", href: "#platform" },
  { label: "Workflow", href: "#workflow" },
  { label: "Safety", href: "#safety" },
  { label: "Pricing", href: "#pricing" },
];

const proofStats = [
  {
    value: "Exact",
    label: "base release matching",
  },
  {
    value: "Signed",
    label: "hosted patch artifacts",
  },
  {
    value: "Pub.dev",
    label: "soroq_sdk 0.1.3 + soroq_flutter 0.1.12",
  },
  {
    value: "Published",
    label: "soroq_flutter 0.1.12 live on pub.dev",
  },
  {
    value: "Next",
    label: "package-post-publish-proof",
  },
  {
    value: "Fast",
    label: "server-side rollback",
  },
];

const platformCards: Array<{
  icon: ComponentType<{ className?: string }>;
  tone: "coral" | "violet" | "dark";
  label: string;
  title: string;
  body: string;
  action: string;
}> = [
  {
    icon: PackageCheck,
    tone: "coral",
    label: "Base app",
    title: "Keep store releases lean",
    body: "Ship the APK or AAB once, then move eligible asset and config fixes through hosted OTA artifacts.",
    action: "Register release",
  },
  {
    icon: GitBranch,
    tone: "violet",
    label: "Rollout",
    title: "Target the users that should see it",
    body: "Patches stay tied to app, runtime, channel, release metadata, and rollout percentage.",
    action: "Stage cohort",
  },
  {
    icon: RotateCcw,
    tone: "dark",
    label: "Recovery",
    title: "Roll back before the fire spreads",
    body: "Patch health, failed clients, and rollback live in one operator path instead of a late-night script.",
    action: "Arm rollback",
  },
];

const workflowSteps = [
  {
    icon: TerminalSquare,
    title: "Register the release",
    body: "Start with the Android artifact already shipped through the store.",
  },
  {
    icon: PackageCheck,
    title: "Build a patch",
    body: "Compare the candidate against the exact base and sign the eligible asset/config patch bundle.",
  },
  {
    icon: RadioTower,
    title: "Roll out safely",
    body: "Serve the patch by channel and cohort, then apply it on the next cold start.",
  },
  {
    icon: CircleGauge,
    title: "Watch health",
    body: "Track accepted, staged, failed, and rolled-back clients from the hosted surface.",
  },
];

const safetyRows = [
  { label: "Patch", value: "Known", meta: "receipt-linked patch ID" },
  { label: "Rollout", value: "Staged", meta: "deterministic cohort" },
  { label: "Health", value: "Reported", meta: "client receipts" },
  { label: "Rollback", value: "Guarded", meta: "server-side control" },
];

const pricingCards = [
  {
    title: "Alpha",
    price: "Free",
    detail: "For controlled Android trials",
    features: ["CLI release lifecycle", "Hosted patch delivery", "Patch-health basics"],
    cta: "Start quickstart",
    href: "/quickstart.html",
    featured: false,
  },
  {
    title: "Team",
    price: "Invite",
    detail: "For teams testing production-like rollout paths",
    features: ["Cohort rollout", "Operator rollback", "Priority compatibility review"],
    cta: "Request access",
    href: "/quickstart.html",
    featured: true,
  },
  {
    title: "Enterprise",
    price: "Custom",
    detail: "For private-cloud and compliance-heavy mobile teams",
    features: ["Dedicated controls", "Release-safety runbooks", "Self-hosting discussion"],
    cta: "Talk to us",
    href: "/operator.html",
    featured: false,
  },
];

const heroPixels = [
  [0, 45, 8, 18],
  [7, 50, 6, 12],
  [13, 55, 9, 18],
  [21, 51, 7, 12],
  [27, 58, 10, 16],
  [36, 54, 8, 20],
  [43, 49, 10, 16],
  [52, 42, 7, 14],
  [58, 35, 8, 15],
  [66, 31, 12, 18],
  [77, 26, 7, 14],
  [84, 20, 11, 22],
  [92, 15, 7, 14],
  [12, 67, 7, 10],
  [26, 69, 8, 12],
  [38, 65, 6, 10],
  [49, 68, 10, 13],
  [61, 63, 8, 12],
  [72, 59, 6, 10],
] as const;

const otaFiles = [
  {
    label: "assets.diff",
    delay: 0,
    start: "left-[1%] top-[15%]",
    x: [0, 70, 152, 236],
    y: [0, -18, -28, -40],
    rotate: [-8, 7, -4, 0],
  },
  {
    label: "manifest.sig",
    delay: 0.95,
    start: "left-[8%] top-[20%]",
    x: [0, 80, 152, 226],
    y: [0, 10, 4, -8],
    rotate: [5, -7, 5, 0],
  },
  {
    label: "patch.bundle",
    delay: 1.85,
    start: "left-[2%] top-[19%]",
    x: [0, 62, 128, 198],
    y: [0, 20, 12, 0],
    rotate: [-5, 8, -3, 0],
  },
] as const;

const releaseFeed = [
  {
    label: "Now verifying base release",
    detail: "signature and runtime match",
  },
  {
    label: "Now publishing OTA files",
    detail: "diff, manifest, and bundle go edge-side",
  },
  {
    label: "Now staging rollout",
    detail: "stable clients are selected safely",
  },
  {
    label: "Now watching install health",
    detail: "clients report back before expansion",
  },
  {
    label: "Now verifying base release",
    detail: "signature and runtime match",
  },
] as const;

const pageNavItems = [
  { label: "Home", href: "/" },
  { label: "Getting started", href: "/getting-started.html" },
  { label: "CLI", href: "/cli.html" },
  { label: "Android", href: "/android-quickstart.html" },
  { label: "iOS", href: "/ios-quickstart.html" },
  { label: "Troubleshooting", href: "/troubleshooting.html" },
  { label: "Dashboard", href: "/operator.html" },
] as const;

type ProductPageKey =
  | "quickstart"
  | "cli"
  | "control-plane"
  | "compatibility"
  | "operator"
  | "getting-started"
  | "android-quickstart"
  | "ios-quickstart"
  | "troubleshooting";

type ProductPageConfig = {
  key: ProductPageKey;
  path: string;
  eyebrow: string;
  title: string;
  body: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  facts: string[];
};

const productPages: ProductPageConfig[] = [
  {
    key: "quickstart",
    path: "/quickstart.html",
    eyebrow: "Alpha onboarding",
    title: "Take an Android store release to an eligible OTA patch.",
    body: "Register the base AAB, publish a signed asset/config patch, stage rollout, then watch clients report back before the cohort expands.",
    primary: { label: "Open dashboard", href: "/operator.html" },
    secondary: { label: "Read CLI", href: "/cli.html" },
    facts: ["base AAB registered", "asset/config patch signed", "cohort staged"],
  },
  {
    key: "cli",
    path: "/cli.html",
    eyebrow: "Developer workflow",
    title: "A release CLI that explains what it is doing.",
    body: "Soroq's CLI is framed around concrete release actions, not mystery commands: match the base, build the eligible asset/config patch, sign the manifest, upload artifacts, and roll back with one command.",
    primary: { label: "Start quickstart", href: "/quickstart.html" },
    secondary: { label: "Open dashboard", href: "/operator.html" },
    facts: ["deterministic release IDs", "signed manifests", "rollback ticket ready"],
  },
  {
    key: "control-plane",
    path: "/control-plane.html",
    eyebrow: "Hosted release plane",
    title: "One surface for files, cohorts, health, and rollback.",
    body: "The control plane page shows how Soroq turns Android public-alpha OTA into a SaaS workflow: CLI publishes eligible artifacts, the hosted plane chooses clients, and operators can slow down or roll back.",
    primary: { label: "Open dashboard", href: "/operator.html" },
    secondary: { label: "Check compatibility", href: "/compatibility.html" },
    facts: ["artifact storage", "cohort gates", "health decisions"],
  },
  {
    key: "compatibility",
    path: "/compatibility.html",
    eyebrow: "Compatibility model",
    title: "OTA only works when the base release is explicit.",
    body: "Soroq makes the compatibility decision visible before a patch reaches users: what can move OTA, what must stay in the store release, and what gets blocked.",
    primary: { label: "Run quickstart", href: "/quickstart.html" },
    secondary: { label: "View control plane", href: "/control-plane.html" },
    facts: ["runtime matched", "manifest verified", "unsafe changes blocked"],
  },
  {
    key: "operator",
    path: "/operator.html",
    eyebrow: "Operator dashboard",
    title: "Browse real releases and inspect patch health from the hosted plane.",
    body: "Soroq keeps operator auth, control-plane health, release inventory, patch discovery, rollback, and patch receipts in one surface before we add guarded rollout expansion controls.",
    primary: { label: "Start alpha", href: "/quickstart.html" },
    secondary: { label: "Read compatibility", href: "/compatibility.html" },
    facts: ["Firebase auth", "release inventory", "patch-health lookup"],
  },
  {
    key: "getting-started",
    path: "/getting-started.html",
    eyebrow: "Onboarding",
    title: "Set up Soroq and ship your first hard OTA patch.",
    body: "Install the CLI, add the frontend and toolchains, verify with doctor, then log in only when you are ready to publish. Installs and doctor need no login.",
    primary: { label: "Install the CLI", href: "/cli" },
    secondary: { label: "Android quickstart", href: "/android-quickstart" },
    facts: ["CLI + toolchains", "doctor before login", "publish when ready"],
  },
  {
    key: "android-quickstart",
    path: "/android-quickstart.html",
    eyebrow: "Android hard OTA",
    title: "Take a Flutter APK to a code patch, then roll it back.",
    body: "Register a base APK, publish a signed code patch at full rollout, then roll back on the next cold start. Experimental hard-OTA tier, public-alpha.",
    primary: { label: "Install the CLI", href: "/cli" },
    secondary: { label: "Getting started", href: "/getting-started" },
    facts: ["base to patch to rollback", "two cold-start model", "server-side rollback"],
  },
  {
    key: "ios-quickstart",
    path: "/ios-quickstart.html",
    eyebrow: "iOS hard OTA (experimental)",
    title: "Patch a running Flutter engine on a physical iPhone.",
    body: "Declare patchable functions, build a signed base, publish an engine patch, and roll back. Physical device only, Apple signing required, experimental tier.",
    primary: { label: "Install the CLI", href: "/cli" },
    secondary: { label: "Getting started", href: "/getting-started" },
    facts: ["physical device only", "signed manifest_trust", "experimental tier"],
  },
  {
    key: "troubleshooting",
    path: "/troubleshooting.html",
    eyebrow: "Troubleshooting",
    title: "Fix the errors you are most likely to hit.",
    body: "Keychain fallbacks, missing frontend or toolchain, stale Android status, iOS device limits, and fail-closed signature errors.",
    primary: { label: "Getting started", href: "/getting-started" },
    secondary: { label: "CLI install", href: "/cli" },
    facts: ["keychain fallback", "install fixes", "fail-closed signatures"],
  },
];

const publicInstallCommand = `curl --proto '=https' --tlsv1.2 https://raw.githubusercontent.com/soroq/install/main/install.sh -sSf | bash
export PATH="$HOME/.soroq/bin:$PATH"
soroq version   # -> soroq v0.2.0`;

type DocTone = "info" | "warn" | "success";

type DocCallout = { tone?: DocTone; title?: string; body: string };

type DocStep = {
  title: string;
  body?: string;
  commands?: string[];
  callout?: DocCallout;
};

type DocRow = { term: string; detail: string };

type DocSection = {
  heading: string;
  intro?: string;
  steps?: DocStep[];
  commands?: string[];
  callout?: DocCallout;
  callouts?: DocCallout[];
  rows?: DocRow[];
};

type DocLink = { label: string; href: string; external?: boolean };

type DocPage = {
  intro?: string;
  sections: DocSection[];
  links?: DocLink[];
};

const docPages: Partial<Record<ProductPageKey, DocPage>> = {
  "getting-started": {
    intro:
      "This is the real new-user flow, in order. Installs and doctor work without an account; only publishing needs a login.",
    sections: [
      {
        heading: "1. Install the Soroq CLI",
        intro: "macOS only for the beta. This installs both soroq and soroqctl.",
        commands: [publicInstallCommand],
        callouts: [
          {
            tone: "info",
            body: "Full install details, checksum verification, and quarantine removal live on the CLI page.",
          },
        ],
      },
      {
        heading: "2. Install the frontend and toolchains",
        intro:
          "Pin the frontend and both platform toolchains, then run doctor. None of these steps require a login.",
        commands: [
          "soroq frontend install soroq-flutter-frontend-f74781f6-6903c161 --api https://api.soroq.dev",
          "soroq toolchain install soroq-android-3.44.2-release-12d3315131f5 --api https://api.soroq.dev",
          "soroq toolchain install soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules --api https://api.soroq.dev",
          "soroq toolchain doctor",
        ],
        callouts: [
          {
            tone: "success",
            body: "soroq toolchain doctor reports whether the frontend and toolchains are present and consistent.",
          },
        ],
      },
      {
        heading: "3. Log in (only for publishing)",
        intro:
          "Authenticate against the hosted surface, then confirm your identity. You only need this before you publish a release or patch.",
        commands: [
          "soroq login --hosted-surface https://soroq.dev --api https://api.soroq.dev",
          "soroq whoami --api https://api.soroq.dev",
        ],
      },
      {
        heading: "4. Ship your first patch",
        intro:
          "Pick a platform quickstart and run a full base to patch to rollback cycle.",
      },
    ],
    links: [
      { label: "Install the CLI", href: "/cli" },
      { label: "Android hard OTA quickstart", href: "/android-quickstart" },
      { label: "iOS hard OTA quickstart", href: "/ios-quickstart" },
      { label: "Troubleshooting", href: "/troubleshooting" },
    ],
  },
  cli: {
    intro:
      "The Soroq CLI ships as a public install script for macOS. It installs both soroq and soroqctl into $HOME/.soroq/bin.",
    sections: [
      {
        heading: "Install on macOS",
        intro:
          "Run the public installer, add the bin directory to your PATH, and check the version. Apple Silicon and Intel are both supported; install.sh auto-detects your architecture.",
        commands: [publicInstallCommand],
        callouts: [
          {
            tone: "warn",
            body: "macOS only for the beta. Linux and Windows are pending.",
          },
        ],
      },
      {
        heading: "Verify the download (SHA256)",
        intro:
          "install.sh verifies the SHA256 automatically. To check manually, download the release tarball and checksums.txt from the public release, then verify.",
        commands: ["shasum -a 256 -c checksums.txt"],
      },
      {
        heading: "Clear the macOS quarantine",
        intro:
          "If Gatekeeper blocks the binaries, remove the quarantine attribute:",
        commands: [
          'xattr -dr com.apple.quarantine "$HOME/.soroq/bin/soroq" "$HOME/.soroq/bin/soroqctl"',
        ],
      },
      {
        heading: "Confirm the version",
        commands: ["soroq version   # -> soroq v0.2.0"],
      },
    ],
    links: [
      {
        label: "github.com/soroq/install",
        href: "https://github.com/soroq/install",
        external: true,
      },
      {
        label: "Release v0.2.0 (downloads + checksums.txt)",
        href: "https://github.com/soroq/install/releases/tag/v0.2.0",
        external: true,
      },
      { label: "Getting started", href: "/getting-started" },
    ],
  },
  "android-quickstart": {
    intro:
      "A complete copy-paste flow: stock Flutter app, base APK release, a visible code patch at full rollout, and a verified rollback. Replace each <id> with your own identifier.",
    sections: [
      {
        heading: "1. Create the app and add Soroq",
        commands: [
          "flutter create my_app",
          "cd my_app",
          "flutter pub add soroq_flutter",
          "soroq init --app-id <id> --channel stable --api https://api.soroq.dev",
        ],
      },
      {
        heading: "2. Cut the base release",
        intro: "Register the stock APK as the base the patch will target.",
        commands: [
          "soroq release android --toolchain soroq-android-3.44.2-release-12d3315131f5 --artifact-type apk --api https://api.soroq.dev --release-id <id> --version 1.0.0+1 --channel stable",
        ],
      },
      {
        heading: "3. Change visible code and patch",
        intro:
          "Edit a lib/ Dart file so a visible value changes, then publish a code patch at 100% rollout.",
        commands: [
          "soroq patch android --release-id <id> --toolchain soroq-android-3.44.2-release-12d3315131f5 --artifact-type apk --api https://api.soroq.dev --patch-id <id> --channel stable --track stable --kind code --rollout 100",
        ],
        callout: {
          tone: "info",
          title: "Two-cold-start model",
          body: "The first launch after a patch is published stages the patch (downloads and verifies it). The next cold start activates it. A single launch does not both stage and activate.",
        },
      },
      {
        heading: "4. Roll back",
        commands: [
          "soroq rollback --patch-id <id> --api https://api.soroq.dev --verify",
        ],
        callout: {
          tone: "warn",
          title: "Rollback nuance (be honest with yourself)",
          body: "An already-running process may still show patched code for that launch. The NEXT cold start serves the base. Rollback is a server-side decision; --verify confirms it landed.",
        },
      },
      {
        heading: "Proven flow",
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
    links: [
      { label: "Getting started", href: "/getting-started" },
      { label: "Install the CLI", href: "/cli" },
      { label: "iOS quickstart", href: "/ios-quickstart" },
      { label: "Troubleshooting", href: "/troubleshooting" },
    ],
  },
  "ios-quickstart": {
    intro:
      "iOS hard OTA is experimental and physical-device only. It does not run on the simulator, and Apple signing is required to install and run on device. The engine and toolchain are an experimental tier.",
    sections: [
      {
        heading: "Requirements",
        callouts: [
          {
            tone: "warn",
            title: "Physical iPhone only",
            body: "The simulator is not supported. You need a real device, Apple signing set up, and the experimental iOS engine/toolchain tier.",
          },
        ],
      },
      {
        heading: "1. Create the app and install frontend + toolchain",
        commands: [
          "flutter create my_app && cd my_app",
          "flutter pub add soroq_flutter",
          "soroq frontend install soroq-flutter-frontend-f74781f6-6903c161 --api https://api.soroq.dev",
          "soroq toolchain install soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules --api https://api.soroq.dev",
        ],
      },
      {
        heading: "2. Declare patchable functions in soroq.yaml",
        intro:
          "List the functions the engine is allowed to patch under ios_engine. Use the lib/<file>.dart#<function> form.",
        commands: [
          `ios_engine:
  enabled: true
  patchable:
    - "lib/foo.dart#myFn"`,
        ],
        callout: {
          tone: "info",
          title: "manifest_trust auto-scaffolds",
          body: "Soroq generates manifest_trust for you: only the public key is written into your project. The private seed is stored at mode 0600 and gitignored.",
        },
      },
      {
        heading: "3. Build the signed base release",
        commands: [
          "soroq release ios --engine --build --toolchain soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules --app-id <id> --release-id <id> --channel <ch> --api https://api.soroq.dev",
        ],
      },
      {
        heading: "4. Publish an engine patch",
        commands: [
          "soroq patch ios --engine --toolchain soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules --app-id <id> --release-id <id> --patch-id <id> --channel <ch> --api https://api.soroq.dev",
        ],
        callout: {
          tone: "info",
          body: "A patch may only direct-call retained or manifest-listed symbols. Calls into symbols that were stripped are not available to the patch.",
        },
      },
      {
        heading: "5. Roll back",
        commands: [
          "soroq rollback ios-engine --patch-id <id> --api https://api.soroq.dev --verify",
        ],
      },
      {
        heading: "Expected values",
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
    links: [
      { label: "Getting started", href: "/getting-started" },
      { label: "Install the CLI", href: "/cli" },
      { label: "Android quickstart", href: "/android-quickstart" },
      { label: "Troubleshooting", href: "/troubleshooting" },
    ],
  },
  troubleshooting: {
    intro:
      "The errors you are most likely to hit, with the fix for each. Patches are version and runtime specific, and signature failures are fail-closed.",
    sections: [
      {
        heading: "Login and identity",
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
        rows: [
          {
            term: "Frontend missing",
            detail:
              "soroq frontend install soroq-flutter-frontend-f74781f6-6903c161 --api https://api.soroq.dev",
          },
          {
            term: "Toolchain missing",
            detail:
              "soroq toolchain install <toolchain> --api https://api.soroq.dev (Android: soroq-android-3.44.2-release-12d3315131f5, iOS: soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules)",
          },
        ],
      },
      {
        heading: "Android",
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
        heading: "Versions and signatures",
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
    links: [
      { label: "Getting started", href: "/getting-started" },
      { label: "Install the CLI", href: "/cli" },
      { label: "Android quickstart", href: "/android-quickstart" },
      { label: "iOS quickstart", href: "/ios-quickstart" },
    ],
  },
};

const commandRows = [
  {
    command: "soroq init --app-id com.example.app",
    output: "soroq.yaml created for stable rollout",
  },
  {
    command: "soroq release android --artifact app-release.aab",
    output: "base release matched to bundled runtime",
  },
  {
    command: "soroq patch android --base-artifact base.aab --candidate-artifact candidate.aab",
    output: "eligible asset/config patch uploaded for staged cohort",
  },
] as const;

const cliCommandRows = [
  {
    command: "soroq init --app-id com.example.app",
    output: "project profile saved",
    detail: "app id, channel, hosted API",
  },
  {
    command: "soroq release android",
    output: "base release registered",
    detail: "AAB, runtime id, version code",
  },
  {
    command: "soroq patch android",
    output: "eligible patch uploaded",
    detail: "manifest signed, bundle ticketed",
  },
  {
    command: "soroq patch health --patch-id patch-123",
    output: "client receipts summarized",
    detail: "accepted, staged, failed, rolled back",
  },
  {
    command: "soroq rollback --patch-id patch-123",
    output: "server rollback recorded",
    detail: "patch suppressed on next check",
  },
] as const;

const cliReceiptFacts = [
  { label: "App", value: "com.example.app", helper: "from soroq.yaml" },
  { label: "Release", value: "1.0.27+31", helper: "store build" },
  { label: "Runtime", value: "matched", helper: "base artifact" },
  { label: "Channel", value: "stable", helper: "server scoped" },
] as const;

const cliHealthBars = [
  { label: "Accepted", value: 96, meta: "healthy clients", tone: "bg-signal" },
  { label: "Staged", value: 84, meta: "downloaded bundle", tone: "bg-blueprint" },
  { label: "Failed", value: 3, meta: "needs review", tone: "bg-coral" },
  { label: "Rolled back", value: 0, meta: "not serving", tone: "bg-muted-foreground" },
] as const;

const cliRollbackChecks = [
  "exact patch id selected",
  "operator auth verified",
  "server rollback stored",
  "next patch-check suppressed",
] as const;

const cliEvidenceRows = [
  {
    area: "Base release",
    command: "soroq release android",
    record: "artifact hash, runtime id, version, channel",
    proof: "release status and inventory row",
  },
  {
    area: "Patch build",
    command: "soroq patch android",
    record: "kind, activation mode, signed manifest, ticketed bundle",
    proof: "patch id, patch number, upload receipt",
  },
  {
    area: "Health",
    command: "soroq patch health --patch-id patch-123",
    record: "accepted, staged, failed, recent clients",
    proof: "patch-health summary and raw JSON",
  },
  {
    area: "Rollback",
    command: "soroq rollback --patch-id patch-123",
    record: "rolled_back=true on the hosted patch",
    proof: "next patch-check no longer serves the patch",
  },
] as const;

const cliLifecyclePoints = [
  { label: "Release", value: "registered", x: 8, y: 58 },
  { label: "Patch", value: "signed", x: 34, y: 34 },
  { label: "Health", value: "watched", x: 62, y: 44 },
  { label: "Rollback", value: "guarded", x: 88, y: 24 },
] as const;

const compatibilityRows = [
  ["Flutter asset/config change", "Allowed", "served as OTA artifact"],
  ["Runtime mismatch", "Blocked", "base release does not match"],
  ["Native Android or AOT code change", "Store", "not the public-alpha OTA path"],
  ["Rollback", "Allowed", "server-side decision"],
] as const;

const controlPlaneNodes = [
  "CLI",
  "Signer",
  "Artifacts",
  "Cohorts",
  "Health",
  "Rollback",
] as const;

const operatorActions = [
  {
    id: "hold",
    label: "Hold",
    title: "Hold rollout until green.",
    body: "Keep the patch in its selected cohort while the health window stays under review.",
  },
  {
    id: "expand",
    label: "Expand",
    title: "Expand to 50%.",
    body: "Move the next stable cohort only after accepted clients remain healthy.",
  },
  {
    id: "rollback",
    label: "Rollback",
    title: "Rollback stays armed.",
    body: "Stop serving the patch immediately if install health drops.",
  },
] as const;

function idleState<T>(): ApiState<T> {
  return { status: "idle", data: null, error: null };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function extractApiError(payload: unknown) {
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

function loadScript(src: string) {
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

function recordNumberValue(
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

function recordTimeValue(record: JsonRecord | null | undefined) {
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

function compareNewestPatch(a: JsonRecord, b: JsonRecord) {
  const timeDelta = recordTimeValue(b) - recordTimeValue(a);
  if (timeDelta !== 0) {
    return timeDelta;
  }
  return (
    recordNumberValue(b, ["patch_number", "number"]) -
    recordNumberValue(a, ["patch_number", "number"])
  );
}

function recordBelongsToApp(record: JsonRecord, appId: string) {
  const recordAppId = formatRecordText(record, ["app_id", "app"], "");
  return !appId || recordAppId === appId;
}

type ReleaseTab = "overview" | "insights" | "artifacts" | "notes" | "settings";

const releaseTabs: Array<{
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

const appWorkspaceTabs: Array<{
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

function recordDateLabel(record: JsonRecord | null | undefined) {
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

function formatBytesLabel(value: unknown) {
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

function shortHash(record: JsonRecord | null | undefined) {
  return shortRecord(
    formatRecordText(
      record,
      ["sha256", "artifact_sha256", "uploaded_artifact_sha256", "hash"],
      "not recorded",
    ),
  );
}

type PointerMotion = {
  softX: MotionValue<number>;
  softY: MotionValue<number>;
  sceneX: MotionValue<number>;
  sceneY: MotionValue<number>;
};

function App() {
  const shouldReduceMotion = useReducedMotion();
  const pointer = usePointerMotion(!shouldReduceMotion);
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.24,
  });
  const heroShift = useTransform(scrollYProgress, [0, 0.22], [0, -30]);
  const reveal = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.58, delay },
        };
  const currentPath = window.location.pathname;
  const normalizePath = (value: string) =>
    value !== "/" && value.endsWith(".html") ? value.slice(0, -5) : value;
  const page = productPages.find(
    (candidate) =>
      normalizePath(candidate.path) === normalizePath(currentPath) ||
      (candidate.key === "operator" && isOperatorRoute(currentPath)),
  );

  if (page) {
    if (page.key === "operator") {
      return <OperatorConsolePage />;
    }

    return (
      <div className="surface-grid min-h-screen overflow-hidden">
        <motion.div
          className="fixed left-0 top-0 z-50 h-1 origin-left bg-coral"
          style={{ scaleX: progressScale }}
        />
        <ProductPage page={page} pointer={pointer} reducedMotion={shouldReduceMotion} />
      </div>
    );
  }

  return (
    <div className="surface-grid min-h-screen overflow-hidden">
      <motion.div
        className="fixed left-0 top-0 z-50 h-1 origin-left bg-coral"
        style={{ scaleX: progressScale }}
      />
      <main>
        <section className="min-h-screen bg-page">
          <motion.div
            style={shouldReduceMotion ? undefined : { y: heroShift }}
            className="min-h-screen overflow-hidden bg-page"
          >
            <SiteHeader />
            <div className="relative grid min-h-[760px] grid-cols-1 gap-10 px-7 pb-10 pt-16 sm:px-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:px-20 lg:pt-20">
              <HeroCopy shouldReduceMotion={shouldReduceMotion} />
              <PatchStreamHero pointer={pointer} reducedMotion={shouldReduceMotion} />
            </div>
            <ProofBand />
          </motion.div>
        </section>

        <motion.section
          {...reveal()}
          id="platform"
          className="mx-auto grid max-w-[1510px] gap-5 px-3 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <SectionIntro
            eyebrow="SaaS platform"
            title="A control plane your Flutter team can understand in one pass."
            body="Soroq is not selling vague magic. It is a hosted release-control layer for eligible Android public-alpha OTA fixes: register a base, publish a signed asset/config patch, watch health, and roll back from the same product surface."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {platformCards.map((card) => (
              <PlatformCard key={card.title} {...card} />
            ))}
          </div>
        </motion.section>

        <motion.section
          {...reveal()}
          id="workflow"
          className="mx-auto max-w-[1510px] px-3 py-10 sm:px-6"
        >
          <div className="overflow-hidden rounded-[1.75rem] bg-primary text-primary-foreground">
            <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[0.72fr_1.28fr] lg:p-14">
              <SectionIntro
                eyebrow="Workflow"
                inverse
                title="From store release to safe Android public-alpha patch."
                body="A developer should know what happens before they trust the product. This path is intentionally readable: exact release, signed eligible bundle, staged cohort, health signal, rollback."
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {workflowSteps.map((step, index) => (
                  <WorkflowStep key={step.title} index={index + 1} {...step} />
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          {...reveal()}
          id="safety"
          className="mx-auto grid max-w-[1510px] gap-5 px-3 py-10 sm:px-6 lg:grid-cols-[1fr_0.9fr]"
        >
          <div className="rounded-[1.75rem] border border-primary/10 bg-card p-7 shadow-card sm:p-10 lg:p-14">
            <Badge variant="outline" className="mb-6 w-fit bg-white">
              Patch safety
            </Badge>
            <h2 className="max-w-3xl text-4xl font-bold leading-[1.02] tracking-normal md:text-6xl">
              When a rollout goes bad, the product should already know.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Health and rollback are not secondary pages. Soroq keeps the
              operational story attached to the patch so a team can stop a bad
              release path without guessing which script to run.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="/operator.html">
                  Open operator surface
                  <ArrowRight data-icon="inline-end" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/compatibility.html">Read compatibility limits</a>
              </Button>
            </div>
          </div>
          <HealthConsole />
        </motion.section>

        <motion.section
          {...reveal()}
          id="status"
          className="mx-auto max-w-[1510px] px-3 py-10 sm:px-6"
        >
          <ProductStatus />
        </motion.section>

        <motion.section
          {...reveal()}
          id="pricing"
          className="mx-auto max-w-[1510px] px-3 py-10 pb-20 sm:px-6"
        >
          <div className="mb-6 grid gap-4 px-2 lg:grid-cols-[0.72fr_0.55fr] lg:items-end">
            <SectionIntro
              eyebrow="Plans"
              title="Start like a SaaS product, even while the alpha is careful."
              body="The launch page should make it obvious that Soroq can become a paid control plane: team workflows, hosted operations, compatibility review, and private deployment conversations."
            />
            <p className="text-sm leading-6 text-muted-foreground lg:text-right">
              Pricing is intentionally framed as alpha access today, not a fake
              public billing table.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {pricingCards.map((plan) => (
              <PricingCard key={plan.title} {...plan} />
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
}

function OperatorConsolePage() {
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
  const recentClients = collectRecentClients(patchRecord);
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
    platform: string;
    size: string;
    hash: string;
  }> = selectedReleaseRecord
    ? [
        {
          name: "store base",
          platform: "Android",
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
              platform: "Android",
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
        ? "control-plane attention"
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
      label: "Release",
      value: selectedReleaseInScope
        ? shortRecord(selectedReleaseId)
        : selectedReleaseMissing
          ? "not visible"
          : "select app first",
    },
    { label: "Runtime", value: shortRecord(selectedRuntimeId) || "any runtime" },
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

    setAppsState({ status: "loading", data: null, error: null });
    setReleasesState({ status: "loading", data: null, error: null });
    setPatchesState({ status: "loading", data: null, error: null });

    try {
      const apps = await fetchOperatorJson<JsonRecord[]>(
        "/api/operator/apps",
        tokenOverride,
      );
      setAppsState({
        status: "ready",
        data: apps,
        error: null,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
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
      );
      setReleasesState({
        status: "ready",
        data: releases,
        error: null,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
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
      );
      setPatchesState({
        status: "ready",
        data: patches,
        error: null,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
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
    setOperatorTab("releases");
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
    setPatchHealthState({ status: "loading", data: null, error: null });

    try {
      const data = await fetchOperatorJson<JsonRecord>(
        `/api/operator/patch-health?patch_id=${encodeURIComponent(trimmedPatchId)}`,
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
    setRollbackConfirm("");
    setRollbackState(idleState);
  }, [patchId]);

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
    };
  }, []);

  if (isOperatorRoute(window.location.pathname)) {
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
                      {visibleApps.length ? (
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
                      {selectedReleaseInScope ? (
                        <>
                          <ChevronRight className="size-3.5" />
                          <span className="font-mono text-[#4d4d52]">
                            {selectedReleaseLabel}
                          </span>
                        </>
                      ) : null}
                    </div>
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
	                            <span>Android</span>
	                            <span>·</span>
	                            <span>{selectedAppPackage}</span>
	                            <span>·</span>
	                            <span>
	                              {selectedRuntimeId
	                                ? `Runtime ${shortRecord(selectedRuntimeId)}`
	                                : "Runtime pending"}
	                            </span>
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
                      className="operator-table-shell mt-4 grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_auto_auto]"
                      onSubmit={(event) => {
                        event.preventDefault();
                        applyScopeFilters();
                      }}
                    >
                      <label className="grid min-w-0 gap-1.5">
	                        <span className="text-[0.65rem] font-medium uppercase tracking-[0.13em] text-[#8d8d93]">
                          Scope controls
                        </span>
                        <input
                          list="operator-release-options"
                          value={releaseIdFilter}
                          onChange={(event) => setReleaseIdFilter(event.target.value)}
                          placeholder="release ID"
	                          className="focus-ring h-9 border border-black/10 bg-white px-3 font-mono text-xs text-black outline-none placeholder:text-[#9a9aa1]"
                        />
                      </label>
                      <label className="grid min-w-0 gap-1.5">
	                        <span className="text-[0.65rem] font-medium uppercase tracking-[0.13em] text-[#8d8d93]">
                          Runtime
                        </span>
                        <input
                          value={runtimeIdFilter}
                          onChange={(event) => setRuntimeIdFilter(event.target.value)}
                          placeholder="runtime ID"
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
	                          className="focus-ring h-9 border border-black/10 bg-white px-3 font-mono text-xs text-black outline-none placeholder:text-[#9a9aa1]"
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
                          <JsonPreview
                            data={patchRecord}
                            empty="Patch health JSON will appear here after a successful lookup."
                          />
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
	                              className="h-9 border-black bg-black px-5 text-white hover:bg-[#2b2b2d]"
                              disabled={!rollbackArmed}
                              onClick={() => void rollbackPatch()}
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
                        <JsonPreview
                          data={healthRecord}
                          empty="Control-plane health JSON appears after auth."
                        />
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

function ProductPage({
  page,
  pointer,
  reducedMotion,
}: {
  page: ProductPageConfig;
  pointer: PointerMotion;
  reducedMotion: boolean | null;
}) {
  const doc = docPages[page.key];
  const isPureDoc = Boolean(doc) && page.key !== "cli";
  return (
    <main className="min-h-screen bg-page">
      <SiteHeader activePath={page.path} />
      <section className="px-5 py-10 sm:px-8 lg:py-16">
        <div className="mx-auto grid min-w-0 max-w-[1420px] grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <motion.div
            className="relative z-10 min-w-0 max-w-[22rem] sm:max-w-2xl"
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.62 }}
          >
            <Badge className="mb-6 w-fit rounded-full bg-accent px-3 py-1 text-accent-foreground">
              {page.eyebrow}
            </Badge>
            <h1 className="text-4xl font-bold leading-[1.04] tracking-normal text-foreground sm:text-6xl lg:text-7xl">
              {page.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              {page.body}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl px-6">
                <a href={page.primary.href}>
                  {page.primary.label}
                  <ArrowRight data-icon="inline-end" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl bg-white px-6"
              >
                <a href={page.secondary.href}>{page.secondary.label}</a>
              </Button>
            </div>
            <div className="mt-7 grid max-w-xl gap-2 sm:grid-cols-3">
              {page.facts.map((fact) => (
                <HeroFact key={fact} icon={CheckCircle2} label={fact} />
              ))}
            </div>
          </motion.div>

          {isPureDoc && doc ? (
            <DocHeroAside page={page} doc={doc} reducedMotion={reducedMotion} />
          ) : (
            <ProductShowcase
              pageKey={page.key}
              pointer={pointer}
              reducedMotion={reducedMotion}
            />
          )}
        </div>
      </section>

      {isPureDoc ? null : (
        <ProductDetails pageKey={page.key} reducedMotion={reducedMotion} />
      )}
      {page.key === "cli" ? <CliOperationalDetails /> : null}
      {doc ? <DocsArticle doc={doc} reducedMotion={reducedMotion} /> : null}
    </main>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          })
          .catch(() => undefined);
      }}
      className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 font-mono text-[0.68rem] uppercase text-white/62 transition-colors hover:bg-white/[0.12]"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? (
        <ClipboardCheck className="size-3.5 text-success" />
      ) : (
        <Copy className="size-3.5 text-coral" />
      )}
      {copied ? "copied" : "copy"}
    </button>
  );
}

function CommandBlock({ code }: { code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151616] shadow-card ring-1 ring-white/5">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase text-white/45">
          <TerminalSquare className="size-3.5 text-coral" />
          shell
        </span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5">
        <code className="block whitespace-pre font-mono text-[0.78rem] leading-6 text-white/82">
          {code}
        </code>
      </pre>
    </div>
  );
}

const docCalloutTone: Record<DocTone, { wrap: string; icon: string }> = {
  info: { wrap: "border-blueprint/25 bg-blueprint/[0.08]", icon: "text-blueprint" },
  warn: { wrap: "border-coral/30 bg-coral/[0.08]", icon: "text-coral" },
  success: { wrap: "border-success/30 bg-success/[0.1]", icon: "text-success" },
};

function DocCalloutCard({ callout }: { callout: DocCallout }) {
  const tone = callout.tone ?? "info";
  const styles = docCalloutTone[tone];
  const Icon = tone === "warn" ? AlertCircle : tone === "success" ? CheckCircle2 : ShieldCheck;

  return (
    <div className={`flex gap-3 rounded-2xl border p-4 ${styles.wrap}`}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${styles.icon}`} />
      <div className="min-w-0">
        {callout.title ? (
          <p className="text-sm font-bold text-foreground">{callout.title}</p>
        ) : null}
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{callout.body}</p>
      </div>
    </div>
  );
}

function DocHeroAside({
  page,
  doc,
  reducedMotion,
}: {
  page: ProductPageConfig;
  doc: DocPage;
  reducedMotion: boolean | null;
}) {
  return (
    <motion.aside
      className="relative w-full min-w-0 overflow-hidden rounded-[2rem] bg-white p-6 shadow-card ring-1 ring-primary/10 sm:p-7"
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.08 }}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ListChecks className="size-5" />
        </span>
        <p className="font-mono text-xs uppercase text-muted-foreground">On this page</p>
      </div>
      <ol className="mt-5 grid gap-2">
        {doc.sections.map((section, index) => (
          <li
            key={section.heading}
            className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-page px-4 py-3"
          >
            <span className="grid size-7 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-accent-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm font-semibold text-foreground">{section.heading}</span>
          </li>
        ))}
      </ol>
      {doc.links && doc.links.length > 0 ? (
        <div className="mt-6 border-t border-primary/10 pt-5">
          <p className="font-mono text-xs uppercase text-muted-foreground">Related</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {doc.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white px-3 py-2 text-xs font-bold text-foreground shadow-soft transition-colors hover:bg-accent"
              >
                {link.external ? (
                  <ExternalLink className="size-3.5 text-coral" />
                ) : (
                  <ArrowRight className="size-3.5 text-coral" />
                )}
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        {page.eyebrow}
      </p>
    </motion.aside>
  );
}

function DocsArticle({
  doc,
  reducedMotion,
}: {
  doc: DocPage;
  reducedMotion: boolean | null;
}) {
  return (
    <section className="mx-auto max-w-[1420px] px-5 pb-20 sm:px-8">
      {doc.intro ? (
        <p className="mx-auto mb-10 max-w-3xl text-lg leading-8 text-muted-foreground">
          {doc.intro}
        </p>
      ) : null}
      <div className="grid gap-5">
        {doc.sections.map((section, index) => (
          <motion.article
            key={section.heading}
            className="rounded-[1.75rem] border border-primary/10 bg-white p-5 shadow-card sm:p-8"
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.14 }}
            transition={{ duration: 0.5, delay: Math.min(index, 3) * 0.05 }}
          >
            <h2 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {section.heading}
            </h2>
            {section.intro ? (
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                {section.intro}
              </p>
            ) : null}

            {section.commands && section.commands.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {section.commands.map((command) => (
                  <CommandBlock key={command} code={command} />
                ))}
              </div>
            ) : null}

            {section.steps && section.steps.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {section.steps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-primary/10 bg-page p-4 sm:p-5"
                  >
                    <p className="text-base font-bold text-foreground">{step.title}</p>
                    {step.body ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {step.body}
                      </p>
                    ) : null}
                    {step.commands && step.commands.length > 0 ? (
                      <div className="mt-4 grid gap-3">
                        {step.commands.map((command) => (
                          <CommandBlock key={command} code={command} />
                        ))}
                      </div>
                    ) : null}
                    {step.callout ? (
                      <div className="mt-4">
                        <DocCalloutCard callout={step.callout} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {section.rows && section.rows.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-primary/10">
                {section.rows.map((row, rowIndex) => (
                  <div
                    key={row.term}
                    className={`grid gap-1 px-4 py-4 sm:grid-cols-[0.42fr_1fr] sm:gap-4 ${
                      rowIndex > 0 ? "border-t border-primary/10" : ""
                    }`}
                  >
                    <span className="font-bold text-foreground">{row.term}</span>
                    <span className="text-sm leading-6 text-muted-foreground">
                      {row.detail}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {section.callout ? (
              <div className="mt-5">
                <DocCalloutCard callout={section.callout} />
              </div>
            ) : null}
            {section.callouts && section.callouts.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {section.callouts.map((callout) => (
                  <DocCalloutCard key={callout.body} callout={callout} />
                ))}
              </div>
            ) : null}
          </motion.article>
        ))}
      </div>

      {doc.links && doc.links.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {doc.links.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="outline"
              className="rounded-xl bg-white"
            >
              <a
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
              >
                {link.label}
                {link.external ? (
                  <ExternalLink data-icon="inline-end" />
                ) : (
                  <ArrowRight data-icon="inline-end" />
                )}
              </a>
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ProductShowcase({
  pageKey,
  pointer,
  reducedMotion,
}: {
  pageKey: ProductPageKey;
  pointer: PointerMotion;
  reducedMotion: boolean | null;
}) {
  const content = (
    {
      quickstart: <QuickstartShowcase reducedMotion={reducedMotion} />,
      cli: <CliShowcase reducedMotion={reducedMotion} />,
      "control-plane": <ControlPlaneShowcase reducedMotion={reducedMotion} />,
      compatibility: <CompatibilityShowcase reducedMotion={reducedMotion} />,
      operator: <OperatorShowcase reducedMotion={reducedMotion} />,
    } as Partial<Record<ProductPageKey, ReactNode>>
  )[pageKey];

  return (
    <motion.div
      className="relative min-h-[540px] w-full max-w-[22rem] min-w-0 overflow-hidden rounded-[2rem] bg-white p-4 shadow-card ring-1 ring-primary/10 sm:max-w-none sm:p-5 lg:min-h-[630px]"
      style={reducedMotion ? undefined : { x: pointer.sceneX, y: pointer.softY }}
      initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.72, delay: 0.08 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,127,104,0.18),transparent_30%),radial-gradient(circle_at_82%_28%,rgba(150,166,255,0.2),transparent_33%),linear-gradient(180deg,rgba(255,255,255,0.8),rgba(243,240,235,0.86))]" />
      <div className="absolute left-7 top-7 flex gap-2">
        <span className="size-3 rounded-full bg-coral" />
        <span className="size-3 rounded-full bg-warning" />
        <span className="size-3 rounded-full bg-signal" />
      </div>
      <div className="relative h-full pt-12">{content}</div>
    </motion.div>
  );
}

function QuickstartShowcase({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[0.88fr_1.12fr]">
      <div className="rounded-[1.35rem] bg-primary p-5 text-primary-foreground">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase text-white/45">Quickstart</p>
            <h2 className="text-2xl font-bold">Release runway</h2>
          </div>
          <PackageCheck className="size-7 text-coral" />
        </div>
        <div className="grid gap-3">
          {["register base", "build patch", "stage rollout", "watch health"].map(
            (step, index) => (
              <motion.div
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                animate={
                  reducedMotion
                    ? undefined
                    : { opacity: index === 3 ? [0.72, 1, 0.72] : 1 }
                }
                transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.22 }}
              >
                <span className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-sm uppercase text-white/70">
                  {step}
                </span>
              </motion.div>
            ),
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.35rem] border border-primary/10 bg-page p-5">
        <motion.div
          className="absolute left-8 right-8 top-24 h-1 rounded-full bg-gradient-to-r from-coral via-violet to-blueprint"
          animate={reducedMotion ? undefined : { scaleX: [0.25, 1, 0.25] }}
          style={{ transformOrigin: "left" }}
          transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative grid gap-4">
          {commandRows.map((row, index) => (
            <motion.div
              key={row.command}
              className="rounded-2xl border border-primary/10 bg-white p-4 shadow-soft"
              animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.18,
              }}
            >
              <p className="font-mono text-xs text-muted-foreground">$ {row.command}</p>
              <p className="mt-2 text-sm font-semibold">{row.output}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-primary p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-white/45">
              next action
            </span>
            <span className="rounded-full bg-success px-2 py-1 text-xs font-bold text-primary">
              ready
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold">Expand only after health holds.</p>
        </div>
      </div>
    </div>
  );
}

function CliShowcase({ reducedMotion }: { reducedMotion: boolean | null }) {
  return (
    <div className="grid h-full min-h-[560px] min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="min-w-0 rounded-[1.35rem] bg-[#151616] p-4 text-primary-foreground shadow-card ring-1 ring-white/10 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase text-white/45">
              terminal receipt
            </p>
            <h2 className="mt-2 text-2xl font-bold">Release, patch, health, rollback.</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-mono text-xs text-white/66">
            <TerminalSquare className="size-3.5 text-coral" />
            CLI
          </span>
        </div>
        <div className="grid gap-2.5">
          {cliCommandRows.map((row, index) => (
            <motion.div
              key={row.command}
              className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5"
              initial={reducedMotion ? false : { opacity: 0.4 }}
              animate={reducedMotion ? undefined : { opacity: [0.64, 1, 0.64] }}
              transition={{
                duration: 4.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.32,
              }}
            >
              <div className="min-w-0">
                <p className="break-words font-mono text-[0.68rem] leading-5 text-coral">
                  $ {row.command}
                </p>
                <p className="mt-1 font-mono text-sm leading-5 text-white/72">
                  {row.output}
                </p>
              </div>
              <p className="font-mono text-[0.65rem] uppercase leading-5 text-white/38">
                {row.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <div className="rounded-[1.35rem] border border-primary/10 bg-white p-4 shadow-soft sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-muted-foreground">
                rollout graph
              </p>
              <h3 className="mt-2 text-2xl font-bold">Patch health snapshot</h3>
            </div>
            <BarChart3 className="size-5 text-coral" />
          </div>
          <div className="mt-5 grid gap-3">
            {cliHealthBars.map((bar) => (
              <CliHealthBar key={bar.label} {...bar} />
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {cliReceiptFacts.map((fact) => (
            <CliReceiptTile key={fact.label} {...fact} />
          ))}
        </div>

        <div className="rounded-[1.35rem] bg-primary p-4 text-primary-foreground shadow-soft sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-white/45">
                rollback guard
              </p>
              <h3 className="mt-2 text-2xl font-bold">Visible before it fires.</h3>
            </div>
            <RotateCcw className="size-5 text-coral" />
          </div>
          <div className="mt-4 grid gap-2">
            {cliRollbackChecks.map((check) => (
              <div
                key={check}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5"
              >
                <CheckCircle2 className="size-4 shrink-0 text-success" />
                <span className="text-sm text-white/72">{check}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CliHealthBar({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: number;
  meta: string;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.max(4, Math.min(value, 100))}%` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-[0.68rem] uppercase text-muted-foreground">
        {meta}
      </p>
    </div>
  );
}

function CliReceiptTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-primary/10 bg-page p-3.5">
      <p className="font-mono text-[0.68rem] uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function ControlPlaneShowcase({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <div className="relative h-full min-h-[500px] overflow-hidden rounded-[1.35rem] bg-primary p-6 text-primary-foreground">
      <div className="absolute inset-0 deck-grid opacity-65" />
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase text-white/45">release map</p>
          <h2 className="text-3xl font-bold">Control plane topology</h2>
        </div>
        <Badge className="bg-white text-primary">healthy</Badge>
      </div>
      <div className="relative z-10 mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
        {controlPlaneNodes.map((node, index) => (
          <motion.div
            key={node}
            className="min-h-28 rounded-2xl border border-white/10 bg-white/[0.07] p-4"
            animate={reducedMotion ? undefined : { y: [0, -7, 0] }}
            transition={{
              duration: 3.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.14,
            }}
          >
            <span className="font-mono text-xs text-coral">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="mt-5 text-xl font-bold">{node}</p>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="absolute bottom-8 left-8 right-8 z-10 h-1 rounded-full bg-gradient-to-r from-coral via-violet to-blueprint"
        animate={reducedMotion ? undefined : { opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function CompatibilityShowcase({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[1.35rem] bg-primary p-5 text-primary-foreground">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="font-mono text-xs uppercase text-white/45">
              compatibility gate
            </p>
            <h2 className="text-2xl font-bold">No silent drift</h2>
          </div>
        </div>
        <div className="grid gap-3">
          {compatibilityRows.map(([change, status, reason], index) => (
            <motion.div
              key={change}
              className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
              animate={reducedMotion ? undefined : { x: [0, index % 2 ? 3 : -3, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.16,
              }}
            >
              <div>
                <p className="font-bold">{change}</p>
                <p className="mt-1 text-sm text-white/55">{reason}</p>
              </div>
              <span
                className={`h-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                  status === "Allowed"
                    ? "bg-success text-primary"
                    : status === "Blocked"
                      ? "bg-coral text-primary"
                      : "bg-white/15 text-white"
                }`}
              >
                {status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="rounded-[1.35rem] border border-primary/10 bg-white p-5 shadow-soft">
        <p className="font-mono text-xs uppercase text-muted-foreground">
          patch decision
        </p>
        <h3 className="mt-2 text-3xl font-bold">Eligible changes move OTA.</h3>
        <div className="mt-6 grid gap-3">
          {["Base release hash", "Flutter runtime", "Manifest signature"].map(
            (item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-2xl bg-page p-4"
              >
                <span className="font-semibold">{item}</span>
                <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs uppercase text-muted-foreground">
                  matched
                </span>
              </div>
            ),
          )}
        </div>
        <div className="mt-5 rounded-2xl bg-accent p-5">
          <p className="font-mono text-xs uppercase text-muted-foreground">
            outcome
          </p>
          <p className="mt-2 text-2xl font-bold">Serve patch on next cold start.</p>
        </div>
      </div>
    </div>
  );
}

function OperatorShowcase({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  const [selectedAction, setSelectedAction] =
    useState<(typeof operatorActions)[number]>(operatorActions[0]);

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="rounded-[1.35rem] border border-primary/10 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase text-muted-foreground">
              release status
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              Discovered patch under review
            </h2>
          </div>
          <Badge className="bg-success text-primary">read-only</Badge>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <DashboardMetric label="Auth" value="Gated" />
          <DashboardMetric label="Health" value="API" />
          <DashboardMetric label="Rollback" value="Guarded" />
        </div>
        <div className="mt-5 rounded-2xl bg-secondary p-3">
          {releaseFeed.slice(0, 4).map((item, index) => (
            <motion.div
              key={item.label}
              className="mb-2 last:mb-0 flex items-center gap-3 rounded-xl bg-white p-3"
              animate={reducedMotion ? undefined : { opacity: [0.68, 1, 0.68] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.32,
              }}
            >
              <span className="grid size-8 place-items-center rounded-full bg-accent font-mono text-xs font-bold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-bold">{item.label}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="grid gap-4">
        <div className="rounded-[1.35rem] bg-primary p-5 text-primary-foreground">
          <p className="font-mono text-xs uppercase text-white/45">
            operator action
          </p>
          <h3 className="mt-3 text-3xl font-bold">{selectedAction.title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/58">
            {selectedAction.body}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {operatorActions.map((action) => {
              const active = action.id === selectedAction.id;

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setSelectedAction(action)}
                  className={`focus-ring rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                    active
                      ? "bg-coral text-primary"
                      : "bg-white/[0.08] text-white/62 hover:bg-white/[0.14]"
                  }`}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
          <Button asChild variant="coral" className="mt-6 rounded-xl">
            <a href="/compatibility.html">
              Review compatibility
              <ArrowRight data-icon="inline-end" />
            </a>
          </Button>
        </div>
        <div className="rounded-[1.35rem] border border-primary/10 bg-page p-5">
          <p className="font-mono text-xs uppercase text-muted-foreground">
            artifact bundle
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["assets.diff", "manifest.sig", "patch.bundle"].map((file) => (
              <span
                key={file}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold shadow-soft"
              >
                <FileCode2 className="size-3.5 text-coral" />
                {file}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetails({
  pageKey,
  reducedMotion,
}: {
  pageKey: ProductPageKey;
  reducedMotion: boolean | null;
}) {
  const panels = (
    {
      quickstart: [
        ["Register", "Attach the shipped AAB to a stable release ID before any patch exists."],
        ["Publish", "Upload only eligible asset/config OTA artifacts after the base and manifest pass."],
        ["Operate", "Watch the rollout cohort before increasing exposure."],
      ],
      cli: [
        ["Readable commands", "Each command maps to one release concept: base, patch, publish, rollback."],
        ["Local proof", "The CLI prints the compatibility decision before upload."],
        ["Dashboard handoff", "Every CLI action leaves an operator trail."],
      ],
      "control-plane": [
        ["Artifact routing", "Signed files move through hosted storage instead of bloating the store build."],
        ["Cohort gates", "Rollout percentage and channel decisions live server-side."],
        ["Health loop", "Client acceptance decides whether the patch expands."],
      ],
      compatibility: [
        ["Allowed path", "Flutter assets, config, manifests, and eligible patch bundles can move OTA on the public-alpha asset/config lane."],
        ["Blocked path", "Runtime drift is blocked. Code and engine changes use the separate experimental hard-OTA tier, not this asset/config lane."],
        ["Audit path", "Every decision is visible before the patch reaches users."],
      ],
      operator: [
        ["Release stream", "Operators see what the patch is doing now instead of reading a static status."],
        ["Rollback lane", "Recovery stays visible while the rollout is still small."],
        ["Team surface", "The product feels like a SaaS dashboard, not a pile of scripts."],
      ],
    } as Partial<Record<ProductPageKey, [string, string][]>>
  )[pageKey];

  if (!panels) {
    return null;
  }

  return (
    <section className="mx-auto max-w-[1420px] px-5 pb-20 sm:px-8">
      <div className="rounded-[1.75rem] bg-primary p-5 text-primary-foreground shadow-card sm:p-8 lg:p-10">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase text-white/45">
              release workflow
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.04] lg:text-6xl">
              Every step stays visible while the OTA patch moves.
            </h2>
          </div>
          <Badge className="w-fit bg-white text-primary">operator ready</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {panels.map(([title, body], index) => (
            <motion.article
              key={title}
              className="min-h-56 rounded-2xl border border-white/10 bg-white/[0.06] p-5"
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ duration: 0.52, delay: index * 0.08 }}
            >
              <span className="grid size-10 place-items-center rounded-full bg-white text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-8 text-2xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/58">{body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CliOperationalDetails() {
  return (
    <section className="mx-auto max-w-[1420px] px-5 pb-20 sm:px-8">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-[1.75rem] border border-primary/10 bg-white p-5 shadow-card sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-muted-foreground">
                CLI evidence map
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                The terminal leaves enough proof for an operator to trust.
              </h2>
            </div>
            <ShieldCheck className="size-6 text-coral" />
          </div>
          <div className="mt-7 overflow-hidden rounded-2xl border border-primary/10">
            <div className="hidden grid-cols-[0.72fr_1fr_1.25fr_1.1fr] gap-3 bg-primary px-4 py-3 font-mono text-[0.68rem] uppercase text-white/52 md:grid">
              <span>Area</span>
              <span>Command</span>
              <span>Hosted record</span>
              <span>Operator proof</span>
            </div>
            {cliEvidenceRows.map((row) => (
              <div
                key={row.area}
                className="grid gap-2 border-t border-primary/10 px-4 py-4 text-sm md:grid-cols-[0.72fr_1fr_1.25fr_1.1fr] md:gap-3"
              >
                <span className="font-bold">{row.area}</span>
                <span className="break-words font-mono text-xs text-coral">
                  {row.command}
                </span>
                <span className="text-muted-foreground">{row.record}</span>
                <span className="text-muted-foreground">{row.proof}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-primary p-5 text-primary-foreground shadow-card sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-white/45">
                lifecycle graph
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                One patch, four checkpoints, no hidden recovery path.
              </h2>
            </div>
            <CircleGauge className="size-6 text-coral" />
          </div>
          <div className="relative mt-7 min-h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-5">
            <div className="absolute inset-x-6 top-1/2 h-px bg-white/12" />
            <div className="absolute inset-y-6 left-1/2 w-px bg-white/10" />
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                points={cliLifecyclePoints.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="rgba(255,127,104,0.72)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {cliLifecyclePoints.map((point) => (
              <div
                key={point.label}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                <div className="grid size-12 place-items-center rounded-full border border-white/14 bg-[#151616] shadow-card">
                  <span className="size-3 rounded-full bg-coral" />
                </div>
                <div className="mt-2 w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center backdrop-blur">
                  <p className="text-sm font-bold">{point.label}</p>
                  <p className="font-mono text-[0.65rem] uppercase text-white/42">
                    {point.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CliOperationalStat label="Artifact" value="ticketed" />
            <CliOperationalStat label="Manifest" value="signed" />
            <CliOperationalStat label="Rollback" value="server-side" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CliOperationalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="font-mono text-[0.68rem] uppercase text-white/42">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function SiteHeader({ activePath }: { activePath?: string } = {}) {
  const items = activePath ? pageNavItems : navItems;

  return (
    <header className="px-5 pt-5 sm:px-8">
      <div className="mx-auto flex min-h-14 min-w-0 max-w-[1420px] items-center justify-between gap-4 rounded-xl bg-white/85 px-4 shadow-soft ring-1 ring-primary/8 backdrop-blur-xl sm:px-6">
        <a
          className="focus-ring flex min-w-0 items-center gap-3 rounded-lg"
          href="/"
          aria-label="Soroq home"
        >
          <SoroqMark />
          <span className="truncate text-xl font-bold tracking-normal">Soroq</span>
        </a>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Site">
          {items.map((item) => {
            const active = activePath === item.href;
            return (
              <a
                key={item.href}
                className={`focus-ring rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                }`}
                href={item.href}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" className="hidden bg-white sm:inline-flex">
            <a href="/operator.html">Log in</a>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <a href="/quickstart.html">Start alpha</a>
          </Button>
        </div>
      </div>
    </header>
  );
}

const productStatusRows = [
  {
    icon: Smartphone,
    platform: "Android hard OTA",
    state: "Fresh-user proven",
    detail:
      "Base to code patch to rollback demonstrated end to end on an emulator with a fresh user. Public-alpha, experimental tier.",
    tone: "bg-success text-primary",
  },
  {
    icon: Apple,
    platform: "iOS hard OTA",
    state: "Device proven",
    detail:
      "Fresh-user engine patch and rollback demonstrated on a physical iPhone. Experimental tier, physical device only, Apple signing required.",
    tone: "bg-success text-primary",
  },
] as const;

function ProductStatus() {
  return (
    <div className="rounded-[1.75rem] border border-primary/10 bg-card p-7 shadow-card sm:p-10 lg:p-12">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <SectionIntro
          eyebrow="Product status"
          title="Experimental hard-OTA tier, proven with fresh users."
          body="Soroq delivers hard OTA updates today as an experimental tier. This is not an App Store or Play production approval, and it is not a claim of parity with any other OTA product."
        />
        <Badge variant="outline" className="w-fit bg-white">
          Experimental hard-OTA tier
        </Badge>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {productStatusRows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.platform}
              className="rounded-2xl border border-primary/10 bg-white p-5 shadow-soft"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2.5 text-lg font-bold text-foreground">
                  <Icon className="size-5 text-coral" />
                  {row.platform}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.tone}`}>
                  {row.state}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{row.detail}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-coral/25 bg-coral/[0.07] p-4">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-coral" />
        <p className="text-sm leading-6 text-muted-foreground">
          No App Store or Play production approval is claimed. Hard OTA is an experimental
          tier; use it for testing and controlled rollouts, not as a substitute for store
          review.
        </p>
      </div>
    </div>
  );
}

function HeroCopy({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="relative z-10 flex max-w-3xl flex-col gap-7"
    >
      <Badge className="w-fit rounded-full bg-accent px-3 py-1 text-accent-foreground">
        Android public-alpha OTA control plane
      </Badge>
      <div className="flex flex-col gap-5">
        <h1 className="max-w-4xl text-5xl font-bold leading-[1.02] tracking-normal text-foreground sm:text-6xl lg:text-7xl">
          Move eligible Flutter asset/config fixes without another APK.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
          Soroq gives mobile teams a hosted dashboard and CLI for safe OTA
          updates: exact base matching, signed asset/config patches, staged rollout,
          patch-health, and rollback.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 rounded-xl px-6">
          <a href="/cli">
            Install Soroq
            <ArrowRight data-icon="inline-end" />
          </a>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 rounded-xl bg-white px-6">
          <a href="/getting-started">Read the docs</a>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href="/android-quickstart"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white/70 px-3 py-2 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-accent"
        >
          <Smartphone className="size-4 text-coral" />
          Android quickstart
        </a>
        <a
          href="/ios-quickstart"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white/70 px-3 py-2 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-accent"
        >
          <Apple className="size-4 text-coral" />
          iOS quickstart
        </a>
      </div>
      <MobileProductCard reducedMotion={shouldReduceMotion} />
      <div className="hidden max-w-xl grid-cols-1 gap-2 sm:grid sm:grid-cols-3">
        <HeroFact icon={CheckCircle2} label="Exact release" />
        <HeroFact icon={ShieldCheck} label="Signed manifest" />
        <HeroFact icon={RotateCcw} label="Rollback ready" />
      </div>
    </motion.div>
  );
}

function HeroFact({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/70 px-3 py-2 text-sm font-medium text-foreground shadow-soft">
      <Icon className="size-4 text-coral" />
      {label}
    </span>
  );
}

function PatchStreamHero({
  pointer,
  reducedMotion,
}: {
  pointer: PointerMotion;
  reducedMotion: boolean | null;
}) {
  return (
    <motion.div
      className="relative hidden min-h-[480px] md:block lg:min-h-[620px]"
      style={reducedMotion ? undefined : { x: pointer.sceneX, y: pointer.softY }}
      aria-label="Soroq SaaS dashboard showing Android public-alpha OTA patch rollout"
    >
      <motion.div
        className="absolute inset-x-0 top-10 h-[360px] overflow-hidden rounded-[2rem]"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.75, delay: 0.1 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_55%,rgba(255,126,114,0.88),transparent_34%),radial-gradient(circle_at_62%_40%,rgba(183,127,236,0.78),transparent_33%),radial-gradient(circle_at_88%_24%,rgba(126,154,255,0.78),transparent_35%)]" />
        {heroPixels.map(([left, top, width, height], index) => (
          <motion.span
            key={`${left}-${top}-${index}`}
            className="absolute rounded-[0.55rem] bg-page shadow-[0_0_0_1px_rgba(255,255,255,0.55)]"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
            animate={
              reducedMotion
                ? undefined
                : {
                    y: [0, -7, 0],
                    opacity: [0.86, 1, 0.86],
                  }
            }
            transition={{
              duration: 3.6 + (index % 5) * 0.32,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.05,
            }}
          />
        ))}
      </motion.div>

      <AnimatedOtaFlight reducedMotion={reducedMotion} />

      <ReleaseStatusCard reducedMotion={reducedMotion} />

      <motion.div
        className="absolute bottom-4 left-2 right-2 z-30 overflow-hidden rounded-[1.75rem] border border-primary/10 bg-white p-4 shadow-[0_26px_80px_rgba(35,31,32,0.18)] sm:left-10 sm:right-8 sm:p-5 lg:left-16"
        initial={reducedMotion ? false : { opacity: 0, y: 26 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-4">
          <div>
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Control plane
            </p>
            <h2 className="text-2xl font-bold">Android patch rollout</h2>
          </div>
        </div>
        <div className="grid gap-3 py-4 md:grid-cols-3">
          <LiveDashboardMetric
            label="Rollout"
            value="Staged"
            helper="cohort receiving files"
            status="staged cohort"
          />
          <LiveDashboardMetric
            label="Health"
            value="Receipts"
            helper="accepted clients"
            status="healthy signal"
          />
          <LiveDashboardMetric
            label="Rollback"
            value="Guarded"
            helper="one command away"
            status="server-side"
          />
        </div>
        <div className="grid gap-3 rounded-2xl bg-secondary/70 p-3 md:grid-cols-[1fr_0.8fr]">
          <div className="rounded-xl bg-white/[0.92] p-4 ring-1 ring-primary/8">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">
                soroq patch publish
              </span>
              <CheckCircle2 className="size-4 text-coral" />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              base matched, manifest signed, delivery ticket issued
            </p>
          </div>
          <div className="rounded-xl border border-primary/8 bg-white/[0.92] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">Base APK stays clean</p>
              <span className="rounded-full border border-primary/10 bg-secondary px-2 py-1 font-mono text-[0.65rem] uppercase text-muted-foreground">
                unchanged
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              OTA artifacts are hosted outside the store build.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReleaseStatusCard({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <motion.div
      className="absolute -top-8 right-3 z-40 hidden w-[32%] min-w-[285px] rounded-[1.1rem] border border-white/75 bg-white p-2.5 shadow-card xl:block"
      animate={reducedMotion ? undefined : { y: [0, -5, 0] }}
      transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      whileHover={reducedMotion ? undefined : { y: -6, scale: 1.01 }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-mono text-[0.68rem] uppercase tracking-normal text-muted-foreground">
          Release status
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-2 py-0.5 text-[0.68rem] font-bold text-[#15351f]">
          <span className="size-1.5 rounded-full bg-signal" aria-hidden="true" />
          Live
        </span>
      </div>

      <div className="overflow-hidden rounded-xl bg-[#2c2825] p-2.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[0.68rem] text-white/55">app-release.aab</p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[0.56rem] uppercase text-white/62">
            stable / staged
          </span>
        </div>
        <p className="mt-1.5 whitespace-nowrap text-[0.95rem] font-bold leading-tight">
          Discovered patch in rollout
        </p>

        <div className="relative mt-1.5 h-[38px] overflow-hidden rounded-lg border border-white/8 bg-white/[0.04] px-2.5">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-2.5 bg-gradient-to-b from-[#2c2825] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2.5 bg-gradient-to-t from-[#2c2825] to-transparent" />
          <motion.div
            className="will-change-transform"
            animate={
              reducedMotion
                ? undefined
                : {
                    y: [0, 0, -38, -38, -76, -76, -114, -114, -152],
                  }
            }
            transition={{
              duration: 12.8,
              repeat: Infinity,
              ease: [0.72, 0, 0.28, 1],
              times: [0, 0.13, 0.24, 0.37, 0.48, 0.61, 0.72, 0.87, 1],
            }}
          >
            {releaseFeed.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex h-[38px] flex-col justify-center"
              >
                <p className="text-[0.72rem] font-bold leading-4">
                  {item.label}
                </p>
                <p className="truncate font-mono text-[0.58rem] text-white/45">
                  {item.detail}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="absolute inset-y-0 left-0 w-[72%] rounded-full bg-white/10" />
          <motion.div
            className="absolute inset-y-0 left-0 w-12 rounded-full bg-coral"
            animate={
              reducedMotion
                ? undefined
                : { x: ["-120%", "520%"], opacity: [0, 1, 1, 0] }
            }
            transition={{
              duration: 4.6,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.4,
            }}
          >
            <span className="absolute inset-y-0 right-0 w-7 rounded-full bg-white/35 blur-[1px]" />
          </motion.div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[0.58rem] font-medium text-white/45">
          <span>selected patch</span>
          <span>health from receipts</span>
        </div>
      </div>
    </motion.div>
  );
}

function MobileProductCard({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-primary/10 bg-white/90 p-4 shadow-card md:hidden">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[0.68rem] uppercase text-muted-foreground">
            Control plane
          </p>
          <h2 className="text-xl font-bold">Patch rollout</h2>
        </div>
        <span className="rounded-full bg-success px-2 py-1 text-xs font-bold">
          live
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <DashboardMetric label="Rollout" value="Staged" />
        <DashboardMetric label="Health" value="API" />
        <DashboardMetric label="Rollback" value="Guarded" />
      </div>
      <div className="mt-3 rounded-2xl bg-gradient-to-r from-coral/24 via-violet/22 to-blueprint/18 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[0.68rem] uppercase text-muted-foreground">
            OTA flight
          </p>
          <Wifi className="size-4 text-coral" />
        </div>
        <div className="flex items-center gap-2">
          {["diff", "sig", "bundle"].map((file, index) => (
            <motion.span
              key={file}
              className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2 py-1 text-[0.68rem] font-bold shadow-soft"
              animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
              transition={{
                duration: 1.9,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.18,
              }}
            >
              <FileCode2 className="size-3 text-coral" />
              {file}
            </motion.span>
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold">
          files staged over the air for next cold start
        </p>
      </div>
    </div>
  );
}

function AnimatedOtaFlight({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 hidden lg:block"
      aria-hidden="true"
    >
      <svg
        className="absolute left-[1%] top-[14%] h-[150px] w-[46%]"
        viewBox="0 0 620 210"
        fill="none"
      >
        <motion.path
          d="M12 158 C148 70 268 188 418 86 C488 38 552 52 604 20"
          stroke="url(#otaRoute)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="8 12"
          initial={reducedMotion ? false : { pathLength: 0.2, opacity: 0.25 }}
          animate={
            reducedMotion
              ? undefined
              : { pathLength: [0.2, 1, 0.2], opacity: [0.2, 0.72, 0.2] }
          }
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="otaRoute" x1="0" x2="620" y1="170" y2="20">
            <stop stopColor="#ff7f68" />
            <stop offset="0.52" stopColor="#a98bef" />
            <stop offset="1" stopColor="#96a6ff" />
          </linearGradient>
        </defs>
      </svg>

      {otaFiles.map((file) => (
        <motion.div
          key={file.label}
          data-ota-file
          className={`absolute ${file.start} inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[0.68rem] font-bold text-primary shadow-soft backdrop-blur-md xl:text-xs`}
          initial={{ x: file.x[0], y: file.y[0], rotate: file.rotate[0], opacity: 0 }}
          animate={
            reducedMotion
              ? undefined
              : {
                  x: [...file.x, file.x[3]],
                  y: [...file.y, file.y[3]],
                  rotate: [...file.rotate, file.rotate[3]],
                  opacity: [0, 1, 1, 0.92, 0],
                  scale: [0.94, 1, 1, 0.98, 0.94],
                }
          }
          transition={{
            x: {
              duration: 8,
              repeat: Infinity,
              repeatDelay: 0.4,
              ease: "linear",
              delay: file.delay,
              times: [0, 0.14, 0.5, 0.82, 1],
            },
            y: {
              duration: 8,
              repeat: Infinity,
              repeatDelay: 0.4,
              ease: "linear",
              delay: file.delay,
              times: [0, 0.14, 0.5, 0.82, 1],
            },
            rotate: {
              duration: 8,
              repeat: Infinity,
              repeatDelay: 0.4,
              ease: "linear",
              delay: file.delay,
              times: [0, 0.14, 0.5, 0.82, 1],
            },
            opacity: {
              duration: 8,
              repeat: Infinity,
              repeatDelay: 0.4,
              ease: "easeInOut",
              delay: file.delay,
              times: [0, 0.14, 0.68, 0.88, 1],
            },
            scale: {
              duration: 8,
              repeat: Infinity,
              repeatDelay: 0.4,
              ease: "easeInOut",
              delay: file.delay,
              times: [0, 0.14, 0.68, 0.88, 1],
            },
          }}
        >
          <FileCode2 className="size-3.5 text-coral" />
          {file.label}
        </motion.div>
      ))}
    </div>
  );
}

function LiveDashboardMetric({
  label,
  value,
  helper,
  status,
}: {
  label: string;
  value: string;
  helper: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white/[0.92] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[0.7rem] uppercase text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-2 text-[0.72rem] leading-4 text-muted-foreground">
        {helper}
      </p>
      <p className="mt-3 w-fit rounded-full bg-secondary px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
        {status}
      </p>
    </div>
  );
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white px-4 py-3">
      <p className="font-mono text-[0.7rem] uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ProofBand() {
  return (
    <section className="mx-5 mb-5 rounded-[1.45rem] bg-primary p-4 text-primary-foreground sm:mx-8 sm:mb-8 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white/55">
          Built for release teams that need proof, not promises.
        </p>
        <Badge className="bg-white text-primary">SaaS-ready control plane</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {proofStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"
          >
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="mt-2 text-sm leading-6 text-white/58">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlatformCard({
  icon: Icon,
  tone,
  label,
  title,
  body,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: "coral" | "violet" | "dark";
  label: string;
  title: string;
  body: string;
  action: string;
}) {
  const topTone =
    tone === "dark"
      ? "bg-primary"
      : tone === "coral"
        ? "bg-coral-soft"
        : "bg-violet-soft";
  const bottomTone =
    tone === "dark" ? "bg-primary text-primary-foreground" : "bg-white";

  return (
    <Card className="overflow-hidden rounded-[1.35rem] border-primary/10 bg-white p-0 shadow-card">
      <div className={`relative grid min-h-44 place-items-center ${topTone}`}>
        <PixelGlyph tone={tone} />
        <div className="absolute right-4 top-4 rounded-full bg-white/75 px-3 py-1 text-xs font-bold text-primary shadow-soft">
          {label}
        </div>
      </div>
      <div className={`flex flex-1 flex-col gap-5 p-6 ${bottomTone}`}>
        <Icon className="size-6 opacity-70" />
        <div>
          <h3 className="text-2xl font-bold">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
        <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold">
          {action}
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Card>
  );
}

function PixelGlyph({ tone }: { tone: "coral" | "violet" | "dark" }) {
  const fill =
    tone === "dark" ? "bg-white" : tone === "coral" ? "bg-coral" : "bg-violet";
  const cells = [
    "col-start-2 row-start-1",
    "col-start-3 row-start-1",
    "col-start-1 row-start-2",
    "col-start-2 row-start-2",
    "col-start-4 row-start-2",
    "col-start-2 row-start-3",
    "col-start-3 row-start-3",
    "col-start-4 row-start-3",
    "col-start-5 row-start-3",
    "col-start-1 row-start-4",
    "col-start-3 row-start-4",
  ];

  return (
    <div className="grid grid-cols-5 grid-rows-4 gap-2">
      {cells.map((cell) => (
        <span
          key={cell}
          className={`size-7 rounded-md ${fill} shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${cell}`}
        />
      ))}
    </div>
  );
}

function WorkflowStep({
  icon: Icon,
  index,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  index: number;
  title: string;
  body: string;
}) {
  return (
    <article className="flex min-h-72 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 place-items-center rounded-full bg-white text-primary">
          {String(index).padStart(2, "0")}
        </span>
        <Icon className="size-6 text-white/55" />
      </div>
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/58">{body}</p>
      </div>
    </article>
  );
}

function HealthConsole() {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-white p-5 shadow-card">
      <div className="absolute -right-16 -top-20 size-56 rounded-full bg-coral/18 blur-3xl" />
      <div className="absolute -bottom-24 left-8 size-56 rounded-full bg-violet/18 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Patch health
            </p>
            <h3 className="text-2xl font-bold">Live rollout signal</h3>
          </div>
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BarChart3 className="size-5" />
          </span>
        </div>
        <div className="grid gap-3">
          {safetyRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[0.85fr_auto] items-center gap-4 rounded-2xl border border-primary/8 bg-page p-4"
            >
              <div>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  {row.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{row.meta}</p>
              </div>
              <strong className="text-2xl font-bold">{row.value}</strong>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-primary p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-white/50">
              auto decision
            </span>
            <LockKeyhole className="size-4 text-coral" />
          </div>
          <p className="mt-3 text-xl font-bold">
            Hold the cohort until failures clear.
          </p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  title,
  price,
  detail,
  features,
  cta,
  href,
  featured,
}: {
  title: string;
  price: string;
  detail: string;
  features: string[];
  cta: string;
  href: string;
  featured: boolean;
}) {
  return (
    <Card
      className={`rounded-[1.35rem] border-primary/10 p-0 shadow-card ${
        featured ? "bg-primary text-primary-foreground" : "bg-white"
      }`}
    >
      <CardHeader className="gap-4 p-6">
        <CardDescription className={featured ? "text-white/55" : undefined}>
          {title}
        </CardDescription>
        <CardTitle className="text-4xl">{price}</CardTitle>
        <p className={featured ? "text-sm leading-6 text-white/58" : "text-sm leading-6 text-muted-foreground"}>
          {detail}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <ul className="grid gap-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm">
              <CheckCircle2 className={featured ? "size-4 text-coral" : "size-4 text-coral"} />
              <span className={featured ? "text-white/72" : "text-muted-foreground"}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
        <Button
          asChild
          variant={featured ? "coral" : "outline"}
          className={featured ? "mt-auto rounded-xl" : "mt-auto rounded-xl bg-white"}
        >
          <a href={href}>
            {cta}
            <ArrowRight data-icon="inline-end" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
  inverse = false,
}: {
  eyebrow: string;
  title: ReactNode;
  body: string;
  inverse?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Badge
        variant="outline"
        className={`w-fit rounded-full ${
          inverse ? "border-white/15 bg-white/10 text-white" : "bg-white"
        }`}
      >
        {eyebrow}
      </Badge>
      <h2 className="max-w-4xl text-4xl font-bold leading-[1.04] tracking-normal md:text-6xl">
        {title}
      </h2>
      <p
        className={`max-w-2xl text-lg leading-8 ${
          inverse ? "text-white/58" : "text-muted-foreground"
        }`}
      >
        {body}
      </p>
    </div>
  );
}

function usePointerMotion(enabled: boolean): PointerMotion {
  const normalX = useMotionValue(0);
  const normalY = useMotionValue(0);
  const softX = useSpring(useTransform(normalX, [-1, 1], [-12, 12]), {
    stiffness: 90,
    damping: 24,
  });
  const softY = useSpring(useTransform(normalY, [-1, 1], [-10, 10]), {
    stiffness: 90,
    damping: 24,
  });
  const sceneX = useSpring(useTransform(normalX, [-1, 1], [16, -16]), {
    stiffness: 78,
    damping: 22,
  });
  const sceneY = useSpring(useTransform(normalY, [-1, 1], [12, -12]), {
    stiffness: 78,
    damping: 22,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      normalX.set((event.clientX / window.innerWidth - 0.5) * 2);
      normalY.set((event.clientY / window.innerHeight - 0.5) * 2);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [enabled, normalX, normalY]);

  return { softX, softY, sceneX, sceneY };
}

export default App;
