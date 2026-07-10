// Soroq docs shell — "precision release field manual".
// Warm off-white reading surface, deep-ink text, monospace code, signal colors
// (green=verified, amber=staged, red=rollback, blue=nav). Persistent grouped
// left nav, Cmd+K search, Android|iOS platform selector, right "On this page",
// mobile drawer, breadcrumb, prev/next, deep-linkable headings, typed callouts,
// and platform-specific code tabs. A single readable reading column.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CornerDownLeft,
  ExternalLink,
  FlaskConical,
  Info,
  Layers,
  Menu,
  RotateCcw,
  Search,
  Smartphone,
  X,
} from "lucide-react";

import { SoroqMark } from "@/components/SoroqMark";
import { PRODUCT } from "@/lib/productConstants";
import { CommandBlock } from "@/shared/primitives";
import { anchorFor, navModel, prevNext } from "@/docs/registry";
import { searchIndex, useSearchIndex, type SearchHit } from "@/docs/search";
import type {
  CalloutTone,
  DocCallout,
  DocEnvVar,
  DocPage,
  DocSection,
  Platform,
} from "@/docs/types";

const READING = "mx-auto w-full max-w-[46rem]";

/* -------------------------------------------------------------- platform ctx */

type PlatformState = {
  platform: Platform;
  setPlatform: (p: Platform) => void;
  locked: boolean;
};
const PlatformContext = createContext<PlatformState | null>(null);
function usePlatform(): PlatformState {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform used outside DocsShell");
  return ctx;
}

const STORE_KEY = "soroq.docs.platform";
function readStoredPlatform(): Platform {
  try {
    const v = window.localStorage.getItem(STORE_KEY);
    return v === "ios" ? "ios" : "android";
  } catch {
    return "android";
  }
}

/* ---------------------------------------------------------------- callouts */

const TONE: Record<
  CalloutTone,
  { border: string; bg: string; icon: string; Icon: typeof Info; label: string }
> = {
  note: { border: "border-l-blueprint", bg: "bg-blueprint/[0.08]", icon: "text-blueprint", Icon: Info, label: "Note" },
  warning: { border: "border-l-[#d9a441]", bg: "bg-warning/25", icon: "text-[#b7791f]", Icon: AlertCircle, label: "Warning" },
  experimental: { border: "border-l-violet", bg: "bg-violet/[0.1]", icon: "text-violet", Icon: FlaskConical, label: "Experimental" },
  device: { border: "border-l-coral", bg: "bg-coral/[0.08]", icon: "text-coral", Icon: Smartphone, label: "Device only" },
  verified: { border: "border-l-signal", bg: "bg-signal/[0.1]", icon: "text-signal", Icon: CheckCircle2, label: "Verified" },
  staged: { border: "border-l-[#d9a441]", bg: "bg-warning/20", icon: "text-[#b7791f]", Icon: Layers, label: "Staged" },
  rollback: { border: "border-l-destructive", bg: "bg-destructive/[0.08]", icon: "text-destructive", Icon: RotateCcw, label: "Rollback" },
};

function Callout({ callout }: { callout: DocCallout }) {
  const t = TONE[callout.tone];
  const Icon = t.Icon;
  return (
    <div className={`flex gap-3 rounded-r-xl border-l-4 ${t.border} ${t.bg} px-4 py-3.5`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${t.icon}`} />
      <div className="min-w-0">
        <p className={`font-mono text-[0.62rem] font-semibold uppercase tracking-wide ${t.icon}`}>
          {t.label}
        </p>
        {callout.title ? (
          <p className="mt-0.5 text-sm font-bold text-foreground">{callout.title}</p>
        ) : null}
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{callout.body}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- env / origin */

const ORIGIN_LABEL: Record<DocEnvVar["origin"], { text: string; cls: string }> = {
  "you-choose": { text: "you choose", cls: "text-blueprint" },
  generated: { text: "generated", cls: "text-violet" },
  "soroq-returns": { text: "Soroq returns", cls: "text-signal" },
  constant: { text: "constant", cls: "text-muted-foreground" },
};

function EnvBlock({ env }: { env: DocEnvVar[] }) {
  const script = env.map((e) => `export ${e.name}=${e.example}`).join("\n");
  return (
    <div className="mt-4 space-y-3">
      <CommandBlock code={script} />
      <div className="overflow-hidden rounded-xl border border-primary/10 bg-card">
        {env.map((e, i) => {
          const o = ORIGIN_LABEL[e.origin];
          return (
            <div
              key={e.name}
              className={`grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4 ${i > 0 ? "border-t border-primary/10" : ""}`}
            >
              <div className="flex flex-col gap-1">
                <code className="font-mono text-[0.72rem] font-semibold text-foreground">{e.name}</code>
                <span className={`font-mono text-[0.6rem] uppercase tracking-wide ${o.cls}`}>{o.text}</span>
              </div>
              <span className="text-sm leading-6 text-muted-foreground">{e.note}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- code tabs */

function CodeTabs({ section }: { section: DocSection }) {
  const { platform, setPlatform, locked } = usePlatform();
  const tabs = section.codeTabs ?? [];
  const active = tabs.find((t) => t.platform === platform) ?? tabs[0];
  if (!active) return null;
  return (
    <div className="mt-4">
      <div className="mb-2 flex gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.platform}
            type="button"
            onClick={() => !locked && setPlatform(tab.platform)}
            className={`focus-ring rounded-md px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-wide transition-colors ${
              tab.platform === active.platform
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label ?? tab.platform}
          </button>
        ))}
      </div>
      <CommandBlock code={active.code} />
    </div>
  );
}

/* ------------------------------------------------------------ section view */

function OutputLine({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/10 bg-secondary/50 px-3.5 py-2.5">
      <span className="mt-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-wide text-signal">
        out
      </span>
      <code className="font-mono text-[0.74rem] leading-6 text-foreground/80">{text}</code>
    </div>
  );
}

function SectionView({ section }: { section: DocSection }) {
  const id = section.anchor || anchorFor(section.heading);
  return (
    <section id={id} className="scroll-mt-24 pt-10">
      <h2 className="group flex items-center gap-2 text-[1.35rem] font-bold leading-tight text-foreground">
        <a
          href={`#${id}`}
          className="focus-ring -ml-6 hidden pr-2 text-coral opacity-0 transition-opacity group-hover:opacity-100 sm:inline"
          aria-label={`Link to ${section.heading}`}
        >
          #
        </a>
        {section.heading}
      </h2>

      {section.cwd ? (
        <p className="mt-2 font-mono text-[0.68rem] text-muted-foreground">
          <span className="text-blueprint">cwd</span> {section.cwd}
        </p>
      ) : null}

      {section.intro ? (
        <p className="mt-3 text-[0.95rem] leading-7 text-muted-foreground">{section.intro}</p>
      ) : null}

      {section.env && section.env.length > 0 ? <EnvBlock env={section.env} /> : null}

      {section.commands && section.commands.length > 0 ? (
        <div className="mt-4 space-y-3">
          {section.commands.map((code) => (
            <CommandBlock key={code} code={code} />
          ))}
        </div>
      ) : null}

      {section.codeTabs && section.codeTabs.length > 0 ? <CodeTabs section={section} /> : null}

      {section.output ? <OutputLine text={section.output} /> : null}

      {section.rows && section.rows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-primary/10 bg-card">
          {section.rows.map((row, i) => (
            <div
              key={row.term}
              className={`grid gap-1 px-4 py-3.5 sm:grid-cols-[0.4fr_1fr] sm:gap-4 ${i > 0 ? "border-t border-primary/10" : ""}`}
            >
              <span className="font-semibold text-foreground">{row.term}</span>
              <span className="text-sm leading-6 text-muted-foreground">{row.detail}</span>
            </div>
          ))}
        </div>
      ) : null}

      {section.next ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowRight className="size-3.5 text-coral" />
          <span>
            <span className="font-semibold text-foreground">Next:</span> {section.next}
          </span>
        </p>
      ) : null}

      {section.callouts && section.callouts.length > 0 ? (
        <div className="mt-4 space-y-3">
          {section.callouts.map((c) => (
            <Callout key={c.body} callout={c} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* --------------------------------------------------------------- left nav */

function LeftNav({ activeSlug, onNavigate }: { activeSlug?: string; onNavigate?: () => void }) {
  const groups = navModel();
  return (
    <nav aria-label="Docs" className="space-y-6 text-sm">
      <a
        href="/"
        onClick={onNavigate}
        className={`focus-ring flex items-center gap-2 rounded-md px-3 py-1.5 font-semibold transition-colors ${
          activeSlug === "" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <BookOpen className="size-4 text-coral" />
        Overview
      </a>
      {groups.map((g) => (
        <div key={g.group}>
          <p className="px-3 font-mono text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {g.group}
          </p>
          <ul className="mt-2 space-y-0.5">
            {g.pages.map((p) => {
              const active = p.slug === activeSlug;
              return (
                <li key={p.slug}>
                  <a
                    href={`/${p.slug}`}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`focus-ring flex items-center gap-2 rounded-md border-l-2 px-3 py-1.5 transition-colors ${
                      active
                        ? "border-l-coral bg-accent font-semibold text-accent-foreground"
                        : "border-l-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    {p.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* --------------------------------------------------------- platform select */

function PlatformSelector() {
  const { platform, setPlatform, locked } = usePlatform();
  const opts: { id: Platform; label: string }[] = [
    { id: "android", label: "Android" },
    { id: "ios", label: "iOS" },
  ];
  return (
    <div
      className="inline-flex rounded-lg border border-primary/12 bg-card p-0.5"
      role="group"
      aria-label="Platform"
      title={locked ? "This page is single-platform" : "Choose your platform"}
    >
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={locked && o.id !== platform}
          onClick={() => setPlatform(o.id)}
          className={`rounded-md px-2.5 py-1 font-mono text-[0.66rem] uppercase tracking-wide transition-colors disabled:opacity-40 ${
            platform === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- search UI */

function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const index = useSearchIndex();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const hits: SearchHit[] = useMemo(
    () => (q.trim() ? searchIndex(index, q) : []),
    [index, q],
  );

  useEffect(() => {
    if (!open) setQ("");
    setCursor(0);
  }, [open, q]);

  if (!open) return null;

  const go = (hit: SearchHit) => {
    window.location.href = `/${hit.slug}#${hit.anchor}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-primary/40 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-primary/10 px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, hits.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
              else if (e.key === "Enter" && hits[cursor]) go(hits[cursor]);
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Search the docs..."
            className="w-full bg-transparent py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-primary/15 px-1.5 py-0.5 font-mono text-[0.6rem] text-muted-foreground">esc</kbd>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-2">
          {q.trim() && hits.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</li>
          ) : null}
          {hits.map((hit, i) => (
            <li key={`${hit.slug}#${hit.anchor}`}>
              <button
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(hit)}
                className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  i === cursor ? "bg-accent" : "hover:bg-secondary/60"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{hit.heading}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {hit.title} · {hit.group}
                  </span>
                </span>
                {i === cursor ? <CornerDownLeft className="size-3.5 shrink-0 text-coral" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SearchButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="focus-ring inline-flex items-center gap-2 rounded-lg border border-primary/12 bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60"
    >
      <Search className="size-3.5" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded border border-primary/15 px-1.5 font-mono text-[0.6rem] sm:inline">⌘K</kbd>
    </button>
  );
}

/* ------------------------------------------------------------------ shell */

const STATUS_BADGE = "border-warning/60 bg-warning/20 text-[#8a5a00]";

export function DocsShell({
  activeSlug,
  lockPlatform,
  toc,
  children,
}: {
  activeSlug?: string;
  lockPlatform?: Platform;
  toc?: { heading: string; anchor: string }[];
  children: ReactNode;
}) {
  const [platform, setPlatformState] = useState<Platform>(() => lockPlatform ?? readStoredPlatform());
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<string | undefined>(toc?.[0]?.anchor);

  useEffect(() => {
    if (lockPlatform) setPlatformState(lockPlatform);
  }, [lockPlatform]);

  const setPlatform = (p: Platform) => {
    if (lockPlatform) return;
    setPlatformState(p);
    try {
      window.localStorage.setItem(STORE_KEY, p);
    } catch {
      /* ignore */
    }
  };

  // Cmd+K to open search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scroll-spy for the right "On this page".
  useEffect(() => {
    if (!toc || toc.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveAnchor(visible[0].target.id);
      },
      { rootMargin: "-84px 0px -70% 0px" },
    );
    for (const item of toc) {
      const el = document.getElementById(item.anchor);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [toc]);

  return (
    <PlatformContext.Provider value={{ platform, setPlatform, locked: !!lockPlatform }}>
      <div className="min-h-screen bg-page text-foreground">
        {/* top bar */}
        <header className="sticky top-0 z-40 border-b border-primary/10 bg-page/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[88rem] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="focus-ring -ml-1 rounded-md p-1.5 text-muted-foreground hover:text-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <a href="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
              <SoroqMark className="size-7" />
              <span className="text-[0.95rem] font-bold">Soroq Docs</span>
            </a>
            <span className={`ml-1 hidden rounded-full border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-wide sm:inline ${STATUS_BADGE}`}>
              experimental · CLI {PRODUCT.cliVersion}
            </span>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <PlatformSelector />
              <SearchButton onOpen={() => setSearch(true)} />
              <a
                href={PRODUCT.hostedLoginUrl}
                className="focus-ring hidden items-center gap-1.5 rounded-lg border border-primary/12 bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60 sm:inline-flex"
              >
                soroq.dev
                <ExternalLink className="size-3.5 text-coral" />
              </a>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[88rem] gap-8 px-4 sm:px-6">
          {/* left nav (desktop) */}
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto py-8 lg:block">
            <LeftNav activeSlug={activeSlug} />
          </aside>

          {/* content + right toc */}
          <div className="flex min-w-0 flex-1 gap-8">
            <main className="min-w-0 flex-1 py-8">{children}</main>
            {toc && toc.length > 0 ? (
              <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 overflow-y-auto py-10 xl:block">
                <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  On this page
                </p>
                <ul className="mt-3 space-y-1 border-l border-primary/10 text-sm">
                  {toc.map((item) => (
                    <li key={item.anchor}>
                      <a
                        href={`#${item.anchor}`}
                        className={`-ml-px block border-l-2 py-1 pl-3 transition-colors ${
                          activeAnchor === item.anchor
                            ? "border-l-coral font-semibold text-foreground"
                            : "border-l-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {item.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
        </div>

        {/* mobile drawer */}
        {drawer ? (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
            <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" />
            <div
              className="absolute left-0 top-0 h-full w-72 max-w-[82vw] overflow-y-auto border-r border-primary/10 bg-page p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm font-bold">Documentation</span>
                <button
                  type="button"
                  onClick={() => setDrawer(false)}
                  className="focus-ring rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Close navigation"
                >
                  <X className="size-5" />
                </button>
              </div>
              <LeftNav activeSlug={activeSlug} onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        ) : null}

        <SearchPalette open={search} onClose={() => setSearch(false)} />
      </div>
    </PlatformContext.Provider>
  );
}

/* ---------------------------------------------------------- page renderer */

function Breadcrumb({ page }: { page: DocPage }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <a href="/" className="focus-ring rounded hover:text-foreground">Docs</a>
      <ChevronRight className="size-3" />
      <span>{page.group}</span>
      <ChevronRight className="size-3" />
      <span className="text-foreground">{page.title}</span>
    </nav>
  );
}

function PrevNext({ slug }: { slug: string }) {
  const { prev, next } = prevNext(slug);
  if (!prev && !next) return null;
  return (
    <div className="mt-14 grid gap-3 border-t border-primary/10 pt-8 sm:grid-cols-2">
      {prev ? (
        <a
          href={`/${prev.slug}`}
          className="focus-ring group flex flex-col rounded-xl border border-primary/10 bg-card px-4 py-3 transition-colors hover:bg-secondary/50"
        >
          <span className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-wide text-muted-foreground">
            <ArrowLeft className="size-3" /> Previous
          </span>
          <span className="mt-1 font-semibold text-foreground">{prev.title}</span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a
          href={`/${next.slug}`}
          className="focus-ring group flex flex-col rounded-xl border border-primary/10 bg-card px-4 py-3 text-right transition-colors hover:bg-secondary/50"
        >
          <span className="flex items-center justify-end gap-1.5 font-mono text-[0.62rem] uppercase tracking-wide text-muted-foreground">
            Next <ArrowRight className="size-3" />
          </span>
          <span className="mt-1 font-semibold text-foreground">{next.title}</span>
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}

export function DocsLayout({ page }: { page: DocPage }) {
  useEffect(() => {
    document.title = `Soroq | ${page.title}`;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `https://docs.soroq.dev/${page.slug}`;
  }, [page.slug, page.title]);

  const toc = page.sections
    .filter((s) => !s.platform)
    .map((s) => ({ heading: s.heading, anchor: s.anchor || anchorFor(s.heading) }));

  return (
    <DocsShell activeSlug={page.slug} lockPlatform={page.platform} toc={toc}>
      <article className={READING}>
        <Breadcrumb page={page} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {page.platform ? (
            <span className="rounded-full border border-blueprint/40 bg-blueprint/10 px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-blueprint">
              {page.platform}
            </span>
          ) : null}
          {page.status ? (
            <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide ${STATUS_BADGE}`}>
              {page.status}
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 text-[2rem] font-bold leading-[1.1] text-foreground sm:text-[2.4rem]">
          {page.title}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{page.summary}</p>

        {page.sections.map((section) => (
          <SectionView key={section.anchor || section.heading} section={section} />
        ))}

        {page.related && page.related.length > 0 ? (
          <div className="mt-12 border-t border-primary/10 pt-6">
            <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Related
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {page.related.map((r) => (
                <a
                  key={r.slug}
                  href={`/${r.slug}`}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  <ArrowRight className="size-3 text-coral" />
                  {r.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <PrevNext slug={page.slug} />
      </article>
    </DocsShell>
  );
}
