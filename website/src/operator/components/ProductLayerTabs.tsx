import { AlertCircle, CheckCircle2, ExternalLink, FileCode2, ShieldCheck } from "lucide-react";

import { formatRecordText } from "../records";
import type { ApiState, ConsoleStat, JsonRecord, OperatorTab } from "../types";
import type { ProductCommandRow, ProductReadinessView } from "../productReadiness";

type ProductLayerTab = Extract<
  OperatorTab,
  "ownership" | "developer" | "billing" | "trust"
>;

const productTabs = new Set<OperatorTab>([
  "ownership",
  "developer",
  "billing",
  "trust",
]);

const productPageMeta: Record<
  ProductLayerTab,
  { eyebrow: string; title: string; body: string }
> = {
  ownership: {
    eyebrow: "Product layer / Ownership",
    title: "Operator ownership and app access",
    body: "Control who can see apps, releases, patches, health receipts, and rollback controls before this console reaches outside developers.",
  },
  developer: {
    eyebrow: "Product layer / Developer",
    title: "Developer workflow and CLI experience",
    body: "Keep the product path command-shaped: login, initialize, release, patch, inspect, and rollback without exposing internal implementation details.",
  },
  billing: {
    eyebrow: "Product layer / Billing",
    title: "Pricing, usage, and account posture",
    body: "Track what can be charged, what is still beta-only, and what must stay disabled until a real billing provider is wired.",
  },
  trust: {
    eyebrow: "Product layer / Trust",
    title: "Production trust and safety controls",
    body: "Keep auth, hosted ownership, signing, rollback, and domain readiness visible as one production-readiness surface.",
  },
};

export function isProductLayerTab(tab: OperatorTab): tab is ProductLayerTab {
  return productTabs.has(tab);
}

export function ProductLayerTabPanel({
  activeTab,
  productState,
  view,
  operatorEmail,
  signedIn,
}: {
  activeTab: OperatorTab;
  productState: ApiState<JsonRecord>;
  view: ProductReadinessView;
  operatorEmail: string;
  signedIn: boolean;
}) {
  if (!isProductLayerTab(activeTab)) {
    return null;
  }

  const meta = productPageMeta[activeTab];

  return (
    <section className="grid gap-4">
      <div className="operator-panel p-4 md:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#8d8d93]">
              {meta.eyebrow}
            </p>
            <h1 className="mt-2 max-w-3xl text-2xl font-semibold tracking-[-0.025em] text-black md:text-3xl">
              {meta.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6d6d72]">
              {meta.body}
            </p>
          </div>

          <div className="grid gap-2 border border-black/10 bg-[#f7f7f8] p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="uppercase tracking-[0.12em] text-[#8d8d93]">
                Operator
              </span>
              <span className="truncate text-[#323236]">{operatorEmail}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="uppercase tracking-[0.12em] text-[#8d8d93]">
                Product snapshot
              </span>
              <span className="text-[#323236]">{productState.status}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="uppercase tracking-[0.12em] text-[#8d8d93]">
                Access
              </span>
              <span className="text-[#323236]">{signedIn ? "signed in" : "required"}</span>
            </div>
          </div>
        </div>
      </div>

      <ProductSnapshotStatus state={productState} signedIn={signedIn} />
      {activeTab === "ownership" ? (
        <OwnershipPanel
          operatorEmail={operatorEmail}
          rows={view.ownershipRows}
          sampledApps={view.sampledOwnershipApps}
        />
      ) : null}
      {activeTab === "developer" ? (
        <DeveloperExperiencePanel commands={view.developerCommandRows} />
      ) : null}
      {activeTab === "billing" ? <BillingPanel rows={view.billingRows} /> : null}
      {activeTab === "trust" ? (
        <TrustPanel rows={view.trustRows} domainRows={view.domainRows} />
      ) : null}
    </section>
  );
}

function ProductSnapshotStatus({
  state,
  signedIn,
}: {
  state: ApiState<JsonRecord>;
  signedIn: boolean;
}) {
  const label =
    state.status === "ready"
      ? "Product readiness snapshot loaded"
      : state.status === "loading"
        ? "Loading product readiness snapshot"
        : signedIn
          ? "Product readiness snapshot pending"
          : "Sign in to load product readiness";

  return (
    <div className="border border-black/10 bg-[#f7f7f8] p-3 text-sm text-[#6d6d72]">
      <div className="flex min-w-0 items-center gap-3">
        {state.status === "error" ? (
          <AlertCircle className="size-4 shrink-0 text-black" />
        ) : (
          <ShieldCheck className="size-4 shrink-0 text-black" />
        )}
        <span className="break-words">{state.error || label}</span>
      </div>
    </div>
  );
}

function OwnershipPanel({
  operatorEmail,
  rows,
  sampledApps,
}: {
  operatorEmail: string;
  rows: ConsoleStat[];
  sampledApps: JsonRecord[];
}) {
  return (
    <section className="grid gap-4">
      <PanelHeader
        eyebrow="Ownership and access"
        title="Every console read is scoped to the verified operator."
        body={`Signed in as ${operatorEmail}. The backend keeps release, patch, health, and rollback access behind the same app ownership boundary.`}
      />
      <StatGrid rows={rows} />
      <div className="operator-table-shell overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-black/10 bg-[#f7f7f8] px-4 py-2.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
          <span>App</span>
          <span>Owner</span>
        </div>
        {sampledApps.length ? (
          sampledApps.map((app) => (
            <div
              key={formatRecordText(app, ["id", "app_id"], JSON.stringify(app))}
              className="grid gap-3 border-b border-black/10 px-4 py-3.5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {formatRecordText(app, ["name", "display_name"], "Soroq app")}
                </p>
                <p className="mt-1 break-all font-mono text-[0.68rem] text-[#8d8d93]">
                  {formatRecordText(app, ["id", "app_id"], "missing id")}
                </p>
              </div>
              <p className="break-all font-mono text-xs text-[#6d6d72]">
                {formatRecordText(app, ["owner_email"], "legacy unowned")}
              </p>
            </div>
          ))
        ) : (
          <ProductEmpty title="No ownership sample yet" body="Refresh after sign-in to load app ownership rows." />
        )}
      </div>
    </section>
  );
}

function DeveloperExperiencePanel({ commands }: { commands: ProductCommandRow[] }) {
  return (
    <section className="grid gap-4">
      <PanelHeader
        eyebrow="Developer experience"
        title="The public workflow stays simple and command-shaped."
        body="The console mirrors the CLI path developers already expect: login, initialize, release, patch, rollback."
      />
      <div className="grid gap-3">
        {commands.map((row) => (
          <div
            key={row.command}
            className="grid gap-3 border border-black/10 bg-[#f7f7f8] p-3 md:grid-cols-[180px_minmax(0,1fr)] md:items-center"
          >
            <p className="text-sm font-semibold text-black">{row.label}</p>
            <code className="min-w-0 break-all border border-black/10 bg-[#f4f4f5] px-3 py-2 font-mono text-xs text-black">
              {row.command}
            </code>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <ProductLink href="/quickstart" label="Quickstart" />
        <ProductLink href="/cli" label="CLI guide" />
        <ProductLink href="/control-plane" label="Control plane" />
      </div>
    </section>
  );
}

function BillingPanel({ rows }: { rows: ConsoleStat[] }) {
  return (
    <section className="grid gap-4">
      <PanelHeader
        eyebrow="Billing and pricing"
        title="Billing is visible as product state, without fake charge actions."
        body="The current hosted surface exposes beta usage counters and pricing posture. Payment collection remains disconnected until Stripe or another billing provider is intentionally wired."
      />
      <StatGrid rows={rows} />
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Free beta", "Current alpha access while Android and hosted operations settle."],
          ["Team", "Designed for owner-scoped apps, operator workflows, and rollback review."],
          ["Enterprise", "Reserved for private compatibility review and deployment conversations."],
        ].map(([title, body]) => (
          <div key={title} className="border border-black/10 bg-[#f7f7f8] p-4">
            <p className="text-sm font-semibold text-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#6d6d72]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustPanel({
  rows,
  domainRows,
}: {
  rows: ConsoleStat[];
  domainRows: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="grid gap-4">
      <PanelHeader
        eyebrow="Trust layer"
        title="Auth, signing, rollback, and domains are tracked together."
        body="This view keeps the production trust story close to the operational controls, so we can see what is proven before handing the product to outside developers."
      />
      <StatGrid rows={rows} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="border border-black/10 bg-[#f7f7f8] p-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
            Trust checks
          </p>
          <div className="mt-4 grid gap-3">
            {[
              "Firebase operator identity verified before console access",
              "Internal control-plane token stays server-side",
              "Owner-scoped routes protect app/release/patch reads",
              "Rollback requires an explicit patch target",
            ].map((item) => (
              <div key={item} className="flex min-w-0 items-start gap-3 text-sm text-[#6d6d72]">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-black" />
                <span className="break-words">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-black/10 bg-[#f7f7f8] p-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
            Domain map
          </p>
          <div className="mt-4 grid gap-2">
            {domainRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-2 rounded-xl border border-black/10 bg-[#f7f7f8] px-3 py-2.5 md:grid-cols-[120px_minmax(0,1fr)]"
              >
                <span className="text-xs font-semibold text-[#6d6d72]">{row.label}</span>
                <span className="break-all font-mono text-xs text-[#323236]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PanelHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="operator-panel-soft p-4">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6d6d72]">{body}</p>
    </div>
  );
}

function StatGrid({ rows }: { rows: ConsoleStat[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="operator-panel-soft p-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
            {row.label}
          </p>
          <p className="mt-2 break-words text-2xl font-semibold text-black">{row.value}</p>
          <p className="mt-2 text-xs leading-5 text-[#6d6d72]">{row.helper}</p>
        </div>
      ))}
    </div>
  );
}

function ProductLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="focus-ring flex items-center justify-between gap-3 border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#f3f3f4]"
    >
      <span>{label}</span>
      <ExternalLink className="size-4 text-[#6d6d72]" />
    </a>
  );
}

function ProductEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-black/15 bg-[#f8f8f9] p-4">
      <FileCode2 className="mb-3 size-5 text-[#8d8d93]" />
      <p className="text-sm font-semibold text-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#6d6d72]">{body}</p>
    </div>
  );
}
