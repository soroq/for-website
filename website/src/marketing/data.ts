import { Apple, Smartphone } from "lucide-react";
import type { ComponentType } from "react";
import { PRODUCT } from "@/lib/productConstants";
import type { ProductPageConfig } from "@/shared/pageTypes";

// Homepage in-page navigation. Anchors match the section ids in MarketingHome.
export const navItems = [
  { label: "Platforms", href: "#platforms" },
  { label: "Workflow", href: "#workflow" },
  { label: "Trust", href: "#trust" },
  { label: "Status", href: "#status" },
];

// Equal-weight platform cards. Android and iOS share one shape and one visual
// treatment — no featured/tier ranking. Tier strings come from PRODUCT so they
// stay honest and version/status accurate.
export const homePlatforms: Array<{
  icon: ComponentType<{ className?: string }>;
  name: string;
  kind: string;
  tier: string;
  body: string;
  points: string[];
  href: string;
}> = [
  {
    icon: Smartphone,
    name: "Android",
    kind: "Code hard-OTA",
    tier: PRODUCT.tiers.android,
    body: "Diff a candidate against the exact base APK or AAB, ship a signed code patch, and roll it back on the next cold start.",
    points: [
      "Base APK/AAB matched exactly",
      "Signed code patch bundle",
      "Emulator + device, fresh-user proven",
    ],
    href: "/android-quickstart",
  },
  {
    icon: Apple,
    name: "iOS",
    kind: "Engine hard-OTA",
    tier: PRODUCT.tiers.ios,
    body: "Patch a running Flutter engine on a physical iPhone behind a signed manifest, then roll it back from the same surface.",
    points: [
      "Physical device only, Apple signing",
      "Signed engine patch + manifest trust",
      "On-device, fresh-user proven",
    ],
    href: "/ios-quickstart",
  },
];

// The five-stage release flow rendered on the homepage.
export const releaseStages: Array<{
  n: string;
  label: string;
  tone: "action" | "verified" | "staged" | "rollback";
  body: string;
}> = [
  {
    n: "01",
    label: "Build",
    tone: "action",
    body: "Diff a candidate against the exact base release and produce an eligible hard-OTA patch bundle.",
  },
  {
    n: "02",
    label: "Sign",
    tone: "verified",
    body: "Sign the patch manifest so every client can verify provenance before anything applies.",
  },
  {
    n: "03",
    label: "Roll out",
    tone: "staged",
    body: "Serve the patch by app, channel, and rollout percentage to a staged cohort.",
  },
  {
    n: "04",
    label: "Observe",
    tone: "action",
    body: "Watch accepted, staged, failed, and rolled-back clients report back from receipts.",
  },
  {
    n: "05",
    label: "Roll back",
    tone: "rollback",
    body: "Suppress the patch server-side; clients return to the base release on the next check.",
  },
];

// Why a patch is trustworthy.
export const trustRows = [
  {
    label: "Exact base match",
    body: "A patch only applies when the base release hash and Flutter runtime match. A mismatch fails closed instead of guessing.",
  },
  {
    label: "Signed manifest",
    body: "Every patch ships a signed manifest. Clients reject anything they cannot verify before it ever runs.",
  },
  {
    label: "Receipt-linked health",
    body: "Each patch has a stable id and client receipts, so rollout health is evidence you can read, not a hopeful guess.",
  },
];

// Honest compatibility boundary. Statuses: OTA (moves), Blocked (fails closed),
// Store (still ships through the app store).
export const boundaryRows: Array<[string, "OTA" | "Blocked" | "Store", string]> = [
  ["Eligible Flutter code and assets", "OTA", "moves as a signed hard-OTA patch"],
  ["Runtime or base release mismatch", "Blocked", "fails closed until the base matches"],
  ["Native or store-level changes", "Store", "still ship through the app store"],
  ["Rollback", "OTA", "server-side, on the next patch check"],
];

// Fresh-user proof / status. Platform-neutral, experimental tier.
export const statusRows: Array<{
  icon: ComponentType<{ className?: string }>;
  platform: string;
  state: string;
  detail: string;
}> = [
  {
    icon: Smartphone,
    platform: "Android hard-OTA",
    state: "Fresh-user proven",
    detail:
      "Base to signed code patch to rollback, demonstrated end to end on an emulator and a device with a fresh user. Experimental tier.",
  },
  {
    icon: Apple,
    platform: "iOS hard-OTA",
    state: "Device proven",
    detail:
      "Fresh-user engine patch and rollback demonstrated on a physical iPhone. Experimental tier, physical device only, Apple signing required.",
  },
];

// Published tooling versions, sourced from PRODUCT (never hardcode versions).
export const toolingRows = [
  { name: "soroq CLI", version: PRODUCT.cliVersion, note: "release + patch + rollback" },
  { name: "soroq_flutter", version: PRODUCT.packages.soroqFlutter, note: "runtime integration" },
  { name: "soroq_sdk", version: PRODUCT.packages.soroqSdk, note: "patch client" },
];

export const pageNavItems = [
  { label: "Home", href: "/" },
  { label: "Getting started", href: "/getting-started" },
  { label: "CLI", href: "/cli" },
  { label: "Android", href: "/android-quickstart" },
  { label: "iOS", href: "/ios-quickstart" },
  { label: "Troubleshooting", href: "/troubleshooting" },
  { label: "Dashboard", href: "/operator" },
] as const;


export const productPages: ProductPageConfig[] = [
  {
    key: "quickstart",
    path: "/quickstart",
    eyebrow: "Onboarding",
    title: "Take an Android store release to an eligible OTA patch.",
    body: "Register the base AAB, publish a signed patch, stage rollout, then watch clients report back before the cohort expands.",
    primary: { label: "Open dashboard", href: "/operator" },
    secondary: { label: "Read CLI", href: "/cli" },
    facts: ["base AAB registered", "patch signed", "cohort staged"],
  },
  {
    key: "cli",
    path: "/cli",
    eyebrow: "Developer workflow",
    title: "A release CLI that explains what it is doing.",
    body: "Soroq's CLI is framed around concrete release actions, not mystery commands: match the base, build the eligible patch, sign the manifest, upload artifacts, and roll back with one command.",
    primary: { label: "Getting started", href: "/getting-started" },
    secondary: { label: "Open dashboard", href: "/operator" },
    facts: ["deterministic release IDs", "signed manifests", "rollback ticket ready"],
  },
  {
    key: "control-plane",
    path: "/control-plane",
    eyebrow: "Hosted release plane",
    title: "One surface for files, cohorts, health, and rollback.",
    body: "The control plane page shows how Soroq turns hard-OTA delivery into a hosted workflow: the CLI publishes eligible artifacts, the hosted plane chooses clients, and operators can slow down or roll back.",
    primary: { label: "Open dashboard", href: "/operator" },
    secondary: { label: "Check compatibility", href: "/compatibility" },
    facts: ["artifact storage", "cohort gates", "health decisions"],
  },
  {
    key: "compatibility",
    path: "/compatibility",
    eyebrow: "Compatibility model",
    title: "OTA only works when the base release is explicit.",
    body: "Soroq makes the compatibility decision visible before a patch reaches users: what can move OTA, what must stay in the store release, and what gets blocked.",
    primary: { label: "Getting started", href: "/getting-started" },
    secondary: { label: "View control plane", href: "/control-plane" },
    facts: ["runtime matched", "manifest verified", "unsafe changes blocked"],
  },
  {
    key: "operator",
    path: "/operator",
    eyebrow: "Operator dashboard",
    title: "Browse real releases and inspect patch health from the hosted plane.",
    body: "Soroq keeps operator auth, control-plane health, release inventory, patch discovery, rollback, and patch receipts in one surface before we add guarded rollout expansion controls.",
    primary: { label: "Getting started", href: "/getting-started" },
    secondary: { label: "Read compatibility", href: "/compatibility" },
    facts: ["Firebase auth", "release inventory", "patch-health lookup"],
  },
  {
    key: "getting-started",
    path: "/getting-started",
    eyebrow: "Onboarding",
    title: "Set up Soroq and ship your first hard OTA patch.",
    body: "Install the CLI, add the frontend and toolchains, verify with doctor, then log in only when you are ready to publish. Installs and doctor need no login.",
    primary: { label: "Install the CLI", href: "/cli" },
    secondary: { label: "Android quickstart", href: "/android-quickstart" },
    facts: ["CLI + toolchains", "doctor before login", "publish when ready"],
  },
  {
    key: "android-quickstart",
    path: "/android-quickstart",
    eyebrow: "Android hard OTA",
    title: "Take a Flutter APK to a code patch, then roll it back.",
    body: "Register a base APK, publish a signed code patch at full rollout, then roll back on the next cold start. Experimental hard-OTA tier.",
    primary: { label: "Install the CLI", href: "/cli" },
    secondary: { label: "Getting started", href: "/getting-started" },
    facts: ["base to patch to rollback", "two cold-start model", "server-side rollback"],
  },
  {
    key: "ios-quickstart",
    path: "/ios-quickstart",
    eyebrow: "iOS hard OTA (experimental)",
    title: "Patch a running Flutter engine on a physical iPhone.",
    body: "Declare patchable functions, build a signed base, publish an engine patch, and roll back. Physical device only, Apple signing required, experimental tier.",
    primary: { label: "Install the CLI", href: "/cli" },
    secondary: { label: "Getting started", href: "/getting-started" },
    facts: ["physical device only", "signed manifest_trust", "experimental tier"],
  },
  {
    key: "troubleshooting",
    path: "/troubleshooting",
    eyebrow: "Troubleshooting",
    title: "Fix the errors you are most likely to hit.",
    body: "Keychain fallbacks, missing frontend or toolchain, stale Android status, iOS device limits, and fail-closed signature errors.",
    primary: { label: "Getting started", href: "/getting-started" },
    secondary: { label: "CLI install", href: "/cli" },
    facts: ["keychain fallback", "install fixes", "fail-closed signatures"],
  },
];

export const commandRows = [
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
    output: "eligible patch uploaded for staged cohort",
  },
] as const;

export const cliCommandRows = [
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

export const cliReceiptFacts = [
  { label: "App", value: "com.example.app", helper: "from soroq.yaml" },
  { label: "Release", value: "1.0.27+31", helper: "store build" },
  { label: "Runtime", value: "matched", helper: "base artifact" },
  { label: "Channel", value: "stable", helper: "server scoped" },
] as const;

export const cliHealthBars = [
  { label: "Accepted", value: 96, meta: "healthy clients", tone: "bg-signal" },
  { label: "Staged", value: 84, meta: "downloaded bundle", tone: "bg-blueprint" },
  { label: "Failed", value: 3, meta: "needs review", tone: "bg-coral" },
  { label: "Rolled back", value: 0, meta: "not serving", tone: "bg-muted-foreground" },
] as const;

export const cliRollbackChecks = [
  "exact patch id selected",
  "operator auth verified",
  "server rollback stored",
  "next patch-check suppressed",
] as const;

export const cliEvidenceRows = [
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

export const cliLifecyclePoints = [
  { label: "Release", value: "registered", x: 8, y: 58 },
  { label: "Patch", value: "signed", x: 34, y: 34 },
  { label: "Health", value: "watched", x: 62, y: 44 },
  { label: "Rollback", value: "guarded", x: 88, y: 24 },
] as const;

export const compatibilityRows = [
  ["Flutter asset/config change", "Allowed", "served as OTA artifact"],
  ["Runtime mismatch", "Blocked", "base release does not match"],
  ["Native Android or AOT code change", "Store", "ships through the app store"],
  ["Rollback", "Allowed", "server-side decision"],
] as const;

export const controlPlaneNodes = [
  "CLI",
  "Signer",
  "Artifacts",
  "Cohorts",
  "Health",
  "Rollback",
] as const;

export const operatorActions = [
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

export const releaseFeed = [
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
] as const;
