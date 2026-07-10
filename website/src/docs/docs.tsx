import { ArrowRight, ExternalLink, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandBlock } from "@/shared/primitives";
import { PRODUCT } from "@/lib/productConstants";
import { DocsShell } from "@/docs/DocsLayout";
import { installCommand } from "@/docs/registry";

// Docs home — the required immediate landing served at the docs host root
// ("/"), rendered through App -> DocsHome. It shares the DocsShell chrome (nav,
// search, platform selector) with the content pages and reads the four-step
// flow that the getting-started page then expands.
const docsHomeCards: { label: string; href: string; blurb: string }[] = [
  {
    label: "Getting started",
    href: "/getting-started",
    blurb: "Install the CLI, pick a platform, install only that toolchain, run doctor, then log in to publish.",
  },
  {
    label: "Android quickstart",
    href: "/android-quickstart",
    blurb: "Take a stock Flutter APK to a signed code patch at full rollout, then roll it back.",
  },
  {
    label: "iOS quickstart",
    href: "/ios-quickstart",
    blurb: "Patch a running Flutter engine on a physical iPhone, then roll back. Device-only.",
  },
  {
    label: "CLI reference",
    href: "/cli",
    blurb: "Install on macOS or Linux, build from source, verify the download, run soroq + soroqctl.",
  },
  {
    label: "Troubleshooting",
    href: "/troubleshooting",
    blurb: "Fix install, login, stale status, and fail-closed signature errors.",
  },
];

const fourSteps: { n: string; title: string; body: string }[] = [
  { n: "01", title: "Install the CLI", body: "Run the public installer; get soroq + soroqctl. No account needed." },
  { n: "02", title: "Pick a platform", body: "Choose Android or iOS and install just that toolchain, then run doctor." },
  { n: "03", title: "Log in to publish", body: "Authenticate against the hosted surface — only when you are ready to ship." },
  { n: "04", title: "Ship + roll back", body: "Cut a base release, publish a patch at full rollout, verify, then roll back." },
];

const lifecycle = ["Build", "Sign", "Roll out", "Observe", "Roll back"];

export function DocsHome() {
  return (
    <DocsShell activeSlug="">
      <div className="mx-auto w-full max-w-[46rem]">
        <span className="rounded-full border border-warning/60 bg-warning/20 px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-[#8a5a00]">
          Experimental
        </span>
        <h1 className="mt-4 text-[2.1rem] font-bold leading-[1.08] text-foreground sm:text-[2.6rem]">
          Ship a hard OTA patch to a Flutter app.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Soroq is a release-control layer for Flutter. Cut a base release, ship a
          code patch on Android or an engine patch on iOS, watch it stage and
          activate, and roll back on demand. Android is fresh-user proven; iOS is
          device-only on a physical iPhone. Both tiers are experimental.
        </p>

        <div className="mt-7 rounded-xl border-l-4 border-l-blueprint bg-blueprint/[0.08] px-4 py-3.5">
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-wide text-blueprint">
            Before you begin
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            You need macOS or Linux (Windows is pending) and Flutter installed.
            Installs and doctor work without an account — only publishing a release
            or patch needs a login.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-bold text-foreground">Get started in four steps</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {fourSteps.map((s) => (
            <li key={s.n} className="rounded-xl border border-primary/10 bg-card px-4 py-4">
              <span className="font-mono text-[0.7rem] font-bold text-coral">{s.n}</span>
              <p className="mt-1 font-semibold text-foreground">{s.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-xl font-bold text-foreground">Install the CLI</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          One command installs soroq and soroqctl into <code className="font-mono text-foreground">$HOME/.soroq/bin</code>.
        </p>
        <div className="mt-4">
          <CommandBlock code={installCommand} />
        </div>

        <h2 className="mt-12 text-xl font-bold text-foreground">Pick your path</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href="/android-quickstart"
            className="focus-ring group rounded-xl border border-primary/10 bg-card p-5 transition-colors hover:bg-accent"
          >
            <p className="font-semibold text-foreground">Android</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Code patches on a stock APK. Fresh-user proven, experimental.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Quickstart <ArrowRight className="size-3.5 text-coral transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
          <a
            href="/ios-quickstart"
            className="focus-ring group rounded-xl border border-primary/10 bg-card p-5 transition-colors hover:bg-accent"
          >
            <p className="font-semibold text-foreground">iOS</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Engine patches on a physical iPhone. Signing required, experimental.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Quickstart <ArrowRight className="size-3.5 text-coral transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
        </div>

        <h2 className="mt-12 text-xl font-bold text-foreground">The release lifecycle</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {lifecycle.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-lg border border-primary/12 bg-card px-3 py-1.5 font-mono text-[0.72rem] text-foreground">
                {step}
              </span>
              {i < lifecycle.length - 1 ? <ArrowRight className="size-3.5 text-coral" /> : null}
            </span>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-bold text-foreground">All pages</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {docsHomeCards.map((card) => (
            <a
              key={card.href}
              href={card.href}
              className="focus-ring group flex flex-col rounded-xl border border-primary/10 bg-card p-5 transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <ListChecks className="size-4 text-coral" />
                {card.label}
              </span>
              <span className="mt-2 text-sm leading-6 text-muted-foreground">{card.blurb}</span>
            </a>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-lg bg-card">
            <a href="/troubleshooting">Troubleshooting</a>
          </Button>
          <Button asChild variant="outline" className="rounded-lg bg-card">
            <a href="/cli">CLI reference</a>
          </Button>
          <Button asChild variant="outline" className="rounded-lg bg-card">
            <a href={PRODUCT.hostedLoginUrl}>
              soroq.dev
              <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </div>
    </DocsShell>
  );
}
