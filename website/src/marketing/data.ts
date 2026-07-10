import {
  Apple,
  CircleGauge,
  GitBranch,
  PackageCheck,
  RadioTower,
  RotateCcw,
  Smartphone,
  TerminalSquare,
} from "lucide-react";
import type { ComponentType } from "react";
import type { ProductPageConfig } from "@/shared/pageTypes";

export const navItems = [
  { label: "Platform", href: "#platform" },
  { label: "Workflow", href: "#workflow" },
  { label: "Safety", href: "#safety" },
  { label: "Pricing", href: "#pricing" },
];

export const proofStats = [
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
    label: "soroq_sdk 0.1.6 + soroq_flutter 0.2.3",
  },
  {
    value: "Published",
    label: "soroq_flutter 0.2.3 live on pub.dev",
  },
  {
    value: "Verified",
    label: "packages published and reproducibly verified",
  },
  {
    value: "Fast",
    label: "server-side rollback",
  },
];

export const platformCards: Array<{
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

export const workflowSteps = [
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

export const safetyRows = [
  { label: "Patch", value: "Known", meta: "receipt-linked patch ID" },
  { label: "Rollout", value: "Staged", meta: "deterministic cohort" },
  { label: "Health", value: "Reported", meta: "client receipts" },
  { label: "Rollback", value: "Guarded", meta: "server-side control" },
];

export const pricingCards = [
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

export const heroPixels = [
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

export const otaFiles = [
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
  {
    label: "Now verifying base release",
    detail: "signature and runtime match",
  },
] as const;

export const pageNavItems = [
  { label: "Home", href: "/" },
  { label: "Getting started", href: "/getting-started.html" },
  { label: "CLI", href: "/cli.html" },
  { label: "Android", href: "/android-quickstart.html" },
  { label: "iOS", href: "/ios-quickstart.html" },
  { label: "Troubleshooting", href: "/troubleshooting.html" },
  { label: "Dashboard", href: "/operator.html" },
] as const;


export const productPages: ProductPageConfig[] = [
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
    output: "eligible asset/config patch uploaded for staged cohort",
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
  ["Native Android or AOT code change", "Store", "not the public-alpha OTA path"],
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


export const productStatusRows = [
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

