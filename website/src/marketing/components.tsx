import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  FileCode2,
  LockKeyhole,
  PackageCheck,
  RadioTower,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SoroqMark } from "@/components/SoroqMark";
import { PRODUCT } from "@/lib/productConstants";
import { CommandBlock } from "@/shared/primitives";
import { usePointerMotion, type PointerMotion } from "@/shared/motion";
import type { ProductPageConfig, ProductPageKey } from "@/shared/pageTypes";
import {
  navItems,
  pageNavItems,
  homePlatforms,
  releaseStages,
  trustRows,
  boundaryRows,
  statusRows,
  toolingRows,
  releaseFeed,
  commandRows,
  cliCommandRows,
  cliReceiptFacts,
  cliHealthBars,
  cliRollbackChecks,
  cliEvidenceRows,
  cliLifecyclePoints,
  compatibilityRows,
  controlPlaneNodes,
  operatorActions,
} from "@/marketing/data";

export function ProductPage({
  page,
  pointer,
  reducedMotion,
}: {
  page: ProductPageConfig;
  pointer: PointerMotion;
  reducedMotion: boolean | null;
}) {
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

          <ProductShowcase
            pageKey={page.key}
            pointer={pointer}
            reducedMotion={reducedMotion}
          />
        </div>
      </section>

      <ProductDetails pageKey={page.key} reducedMotion={reducedMotion} />
      {page.key === "cli" ? <CliOperationalDetails /> : null}
    </main>
  );
}


export function ProductShowcase({
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

export function QuickstartShowcase({
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

export function CliShowcase({ reducedMotion }: { reducedMotion: boolean | null }) {
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

export function CliHealthBar({
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

export function CliReceiptTile({
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

export function ControlPlaneShowcase({
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

export function CompatibilityShowcase({
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

export function OperatorShowcase({
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
            <a href="/compatibility">
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

export function ProductDetails({
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

export function CliOperationalDetails() {
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

export function CliOperationalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="font-mono text-[0.68rem] uppercase text-white/42">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

export function SiteHeader({ activePath }: { activePath?: string } = {}) {
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
            <a href="/operator">Log in</a>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <a href="/getting-started">Get started</a>
          </Button>
        </div>
      </div>
    </header>
  );
}



export function HeroFact({
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

export function DashboardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white px-4 py-3">
      <p className="font-mono text-[0.7rem] uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}


export function SectionIntro({
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


export function MarketingHome() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.24,
  });
  const reveal = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.55, delay },
        };

  const installCommand = `curl --proto '=https' --tlsv1.2 ${PRODUCT.installScriptUrl} -sSf | bash`;

  const stageAccent: Record<(typeof releaseStages)[number]["tone"], string> = {
    action: "text-blueprint",
    verified: "text-signal",
    staged: "text-warning",
    rollback: "text-coral",
  };
  const stageDot: Record<(typeof releaseStages)[number]["tone"], string> = {
    action: "bg-blueprint",
    verified: "bg-signal",
    staged: "bg-warning",
    rollback: "bg-coral",
  };

  const heroStatus: Array<{ label: string; value: string; dot: string; tone: string }> = [
    { label: "Base release", value: "matched", dot: "bg-signal", tone: "text-signal" },
    { label: "Manifest", value: "signed", dot: "bg-signal", tone: "text-signal" },
    { label: "Rollout", value: "staged 20%", dot: "bg-warning", tone: "text-warning" },
    { label: "Health", value: "accepted", dot: "bg-signal", tone: "text-signal" },
    { label: "Rollback", value: "armed", dot: "bg-coral", tone: "text-coral" },
  ];

  return (
    <div className="deck-grid min-h-screen overflow-hidden text-white/90">
      <motion.div
        className="fixed left-0 top-0 z-50 h-1 origin-left bg-signal"
        style={{ scaleX: progressScale }}
      />
      <SiteHeader />
      <main className="mx-auto max-w-[1240px] px-5 sm:px-8">
        {/* HERO — What is Soroq + where to start */}
        <section className="grid gap-10 pb-16 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
          <motion.div
            className="flex flex-col gap-6"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-wide text-signal">
              <ShieldCheck className="size-3.5" />
              Signed hard-OTA release control
            </span>
            <h1 className="max-w-2xl text-5xl font-bold leading-[1.03] tracking-tight text-white sm:text-6xl">
              Ship verified Flutter fixes after release.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-white/60">
              Soroq is a hosted control plane and CLI for signed hard-OTA patches:
              match the exact base build, sign the patch, stage the rollout, watch
              patch health, and roll back &mdash; across the currently proven Android
              and experimental iOS paths.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl bg-signal px-6 text-[#0d1f15] hover:bg-signal/90">
                <a href="/getting-started">
                  Get started
                  <ArrowRight data-icon="inline-end" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/15 bg-white/[0.04] px-6 text-white hover:bg-white/[0.1]"
              >
                <a href="https://docs.soroq.dev/">Read documentation</a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-xl px-5 text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <a href="/cli">
                  <TerminalSquare data-icon="inline-start" />
                  Install CLI
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { icon: CheckCircle2, label: "Exact base match" },
                { icon: LockKeyhole, label: "Signed manifest" },
                { icon: RotateCcw, label: "Server-side rollback" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/70"
                >
                  <Icon className="size-4 text-signal" />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#12140f]/90 p-5 shadow-card ring-1 ring-white/5 sm:p-6"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <span className="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase text-white/45">
                <RadioTower className="size-3.5 text-signal" />
                patch status
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/15 px-2.5 py-1 font-mono text-[0.62rem] uppercase text-signal">
                <span className="size-1.5 rounded-full bg-signal" aria-hidden="true" />
                serving
              </span>
            </div>
            <p className="mt-4 font-mono text-[0.72rem] text-white/40">patch-4f2a &middot; stable channel</p>
            <div className="mt-3 grid gap-2">
              {heroStatus.map((row, index) => (
                <motion.div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3"
                  animate={
                    shouldReduceMotion ? undefined : { opacity: [0.7, 1, 0.7] }
                  }
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.3,
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span className={`size-2 rounded-full ${row.dot}`} aria-hidden="true" />
                    <span className="text-sm text-white/70">{row.label}</span>
                  </span>
                  <span className={`font-mono text-xs uppercase ${row.tone}`}>{row.value}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-coral/25 bg-coral/[0.08] px-4 py-3">
              <p className="font-mono text-[0.62rem] uppercase text-coral/80">one command away</p>
              <p className="mt-1 font-mono text-sm text-white/80">$ soroq rollback --patch-id patch-4f2a</p>
            </div>
          </motion.div>
        </section>

        {/* WHAT IT UPDATES — Q2 */}
        <motion.section {...reveal()} className="border-t border-white/8 py-14">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-signal">What it updates</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                Signed patches for eligible Flutter changes.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: FileCode2,
                  title: "Eligible Flutter code and assets",
                  body: "Delivered as a signed hard-OTA patch tied to one exact base build.",
                },
                {
                  icon: PackageCheck,
                  title: "Android code, iOS engine",
                  body: "Android is code hard-OTA; iOS patches a running Flutter engine on device (experimental).",
                },
                {
                  icon: ShieldCheck,
                  title: "Not native or store-level",
                  body: "Native changes still ship through the app store. Soroq does not rewrite the whole app.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <Icon className="size-5 text-signal" />
                  <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* PLATFORMS — Q3, equal-weight Android + iOS */}
        <motion.section {...reveal()} id="platforms" className="border-t border-white/8 py-14">
          <div className="mb-8 flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wide text-signal">Platforms</p>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
              Two platforms, one release workflow.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-white/55">
              Android and iOS run the same build, sign, roll out, and roll back path. Both
              are experimental today, with the boundaries called out honestly.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {homePlatforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <div
                  key={platform.name}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-xl border border-white/12 bg-white/[0.06]">
                        <Icon className="size-5 text-white" />
                      </span>
                      <span>
                        <span className="block text-xl font-bold text-white">{platform.name}</span>
                        <span className="block font-mono text-[0.68rem] uppercase text-white/45">
                          {platform.kind}
                        </span>
                      </span>
                    </span>
                    <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 font-mono text-[0.6rem] uppercase text-warning">
                      experimental
                    </span>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-white/60">{platform.body}</p>
                  <ul className="mt-5 grid gap-2">
                    {platform.points.map((point) => (
                      <li key={point} className="flex items-center gap-2.5 text-sm text-white/70">
                        <CheckCircle2 className="size-4 shrink-0 text-signal" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 font-mono text-[0.66rem] uppercase leading-5 text-white/40">
                    {platform.tier}
                  </p>
                  <a
                    href={platform.href}
                    className="focus-ring mt-6 inline-flex w-fit items-center gap-2 text-sm font-bold text-signal hover:text-signal/80"
                  >
                    {platform.name} quickstart
                    <ArrowRight className="size-4" />
                  </a>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* WORKFLOW — Q4, five-stage release flow */}
        <motion.section {...reveal()} id="workflow" className="border-t border-white/8 py-14">
          <div className="mb-8 flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wide text-signal">Workflow</p>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
              Build &rarr; Sign &rarr; Roll out &rarr; Observe &rarr; Roll back.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {releaseStages.map((stage) => (
              <div
                key={stage.n}
                className="flex min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-white/40">{stage.n}</span>
                  <span className={`size-2.5 rounded-full ${stageDot[stage.tone]}`} aria-hidden="true" />
                </div>
                <h3 className={`mt-6 text-lg font-bold ${stageAccent[stage.tone]}`}>{stage.label}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{stage.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* TRUST — Q5 */}
        <motion.section {...reveal()} id="trust" className="border-t border-white/8 py-14">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-signal">Trust</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                Why a patch is safe to apply.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-white/55">
                Verification is not a feature bolted on later. A patch that cannot be
                verified never runs &mdash; Soroq fails closed instead of guessing.
              </p>
            </div>
            <div className="grid gap-3">
              {trustRows.map((row, index) => {
                const icons = [ShieldCheck, LockKeyhole, FileCode2];
                const Icon = icons[index] ?? ShieldCheck;
                return (
                  <div
                    key={row.label}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-signal/25 bg-signal/10">
                      <Icon className="size-5 text-signal" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">{row.label}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-white/55">{row.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* ROLLOUT + ROLLBACK — Q6 */}
        <motion.section {...reveal()} className="border-t border-white/8 py-14">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-warning/25 bg-warning/[0.06] p-6">
              <div className="flex items-center gap-3">
                <RadioTower className="size-5 text-warning" />
                <h3 className="text-xl font-bold text-white">Staged rollout</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/60">
                A patch is served by app, channel, and rollout percentage. Start with a
                small cohort and expand only after accepted clients stay healthy.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-1/5 rounded-full bg-warning" />
                </div>
                <span className="font-mono text-xs text-warning">20%</span>
              </div>
            </div>
            <div className="rounded-2xl border border-coral/25 bg-coral/[0.06] p-6">
              <div className="flex items-center gap-3">
                <RotateCcw className="size-5 text-coral" />
                <h3 className="text-xl font-bold text-white">Server-side rollback</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/60">
                One command suppresses the patch server-side. Clients return to the base
                release on their next patch check &mdash; no new store submission, no waiting.
              </p>
              <p className="mt-5 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white/75">
                $ soroq rollback --patch-id patch-4f2a
              </p>
            </div>
          </div>
        </motion.section>

        {/* INSTALL — Q7 */}
        <motion.section {...reveal()} className="border-t border-white/8 py-14">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-signal">Install</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                One CLI. No account to try it.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-white/55">
                Installing the CLI and running <span className="font-mono text-white/75">doctor</span> need no
                login. You only sign in when you are ready to publish a patch.
              </p>
              <div className="mt-6 grid gap-2">
                {toolingRows.map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
                  >
                    <span className="font-mono text-sm text-white/80">{tool.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="hidden font-mono text-[0.68rem] uppercase text-white/40 sm:inline">
                        {tool.note}
                      </span>
                      <span className="rounded-full bg-signal/12 px-2.5 py-1 font-mono text-xs text-signal">
                        {tool.version}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <CommandBlock code={installCommand} />
              <Button asChild size="lg" className="h-12 w-fit rounded-xl bg-signal px-6 text-[#0d1f15] hover:bg-signal/90">
                <a href="/cli">
                  Read the CLI reference
                  <ArrowRight data-icon="inline-end" />
                </a>
              </Button>
            </div>
          </div>
        </motion.section>

        {/* BOUNDARY — Q8 */}
        <motion.section {...reveal()} className="border-t border-white/8 py-14">
          <div className="mb-6 flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wide text-signal">Boundaries</p>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
              What moves OTA, and what does not.
            </h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {boundaryRows.map(([change, status, detail]) => (
              <div
                key={change}
                className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-white/8 bg-white/[0.03] px-5 py-4 first:border-t-0 sm:grid-cols-[1.3fr_auto_1.4fr]"
              >
                <span className="text-sm font-semibold text-white">{change}</span>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 font-mono text-[0.62rem] uppercase ${
                    status === "OTA"
                      ? "bg-signal/15 text-signal"
                      : status === "Blocked"
                        ? "bg-coral/15 text-coral"
                        : "bg-white/10 text-white/70"
                  }`}
                >
                  {status}
                </span>
                <span className="col-span-2 text-sm text-white/50 sm:col-span-1">{detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning" />
            <p className="text-sm leading-6 text-white/55">
              Hard OTA is an experimental tier. It is not an App Store or Play production
              approval &mdash; use it for testing and controlled rollouts, not as a substitute
              for store review.
            </p>
          </div>
        </motion.section>

        {/* STATUS — fresh-user proof */}
        <motion.section {...reveal()} id="status" className="border-t border-white/8 py-14">
          <div className="mb-8 flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-wide text-signal">Status</p>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
              Proven with fresh users, on the experimental tier.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {statusRows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.platform}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2.5 text-lg font-bold text-white">
                      <Icon className="size-5 text-signal" />
                      {row.platform}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/15 px-3 py-1 font-mono text-[0.62rem] uppercase text-signal">
                      <CheckCircle2 className="size-3.5" />
                      {row.state}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">{row.detail}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* CTA — docs + console */}
        <motion.section {...reveal()} className="border-t border-white/8 py-16">
          <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#12140f] p-8 sm:p-12">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <h2 className="max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl">
                  Ship your first verified patch.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/55">
                  Follow the getting-started flow, or open the operator dashboard to watch
                  releases, patch health, and rollback on the hosted plane.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-xl bg-signal px-6 text-[#0d1f15] hover:bg-signal/90">
                  <a href="/getting-started">
                    Get started
                    <ArrowRight data-icon="inline-end" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-white/15 bg-white/[0.04] px-6 text-white hover:bg-white/[0.1]"
                >
                  <a href="/operator">Open dashboard</a>
                </Button>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

export function ProductPageRoute({ page }: { page: ProductPageConfig }) {
  const shouldReduceMotion = useReducedMotion();
  const pointer = usePointerMotion(!shouldReduceMotion);
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.24,
  });

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
