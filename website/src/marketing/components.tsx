import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  AlertCircle,
  Apple,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  FileCode2,
  LockKeyhole,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Wifi,
} from "lucide-react";
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
import { usePointerMotion, type PointerMotion } from "@/shared/motion";
import type { ProductPageConfig, ProductPageKey } from "@/shared/pageTypes";
import { docPages, DocHeroAside, DocsArticle } from "@/docs/docs";
import {
  navItems,
  pageNavItems,
  proofStats,
  platformCards,
  workflowSteps,
  safetyRows,
  pricingCards,
  heroPixels,
  otaFiles,
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
  productStatusRows,
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


export function ProductStatus() {
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

export function HeroCopy({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
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

export function PatchStreamHero({
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

export function ReleaseStatusCard({
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

export function MobileProductCard({
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

export function AnimatedOtaFlight({
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

export function LiveDashboardMetric({
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

export function ProofBand() {
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

export function PlatformCard({
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

export function PixelGlyph({ tone }: { tone: "coral" | "violet" | "dark" }) {
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

export function WorkflowStep({
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

export function HealthConsole() {
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

export function PricingCard({
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
              body="Soroq is a hosted control plane: team workflows, hosted operations, compatibility review, and private deployment conversations."
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
