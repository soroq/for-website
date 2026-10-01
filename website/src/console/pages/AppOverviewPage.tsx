import { Activity, AlertTriangle, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryPulse, HealthDot, type AppDigest } from "@/operator/components/ConsoleShell";
import { healthOf, pct } from "../health";
import { formatCount, formatDateTime } from "../model";
import { activeShares, type VersionRow } from "../versions";
import { Absent, Code, EmptyCard, HealthBadge, PlatformChips, SectionHeader, TableShell, Th } from "../ui";

// AN APP AT A GLANCE.
//
// Three questions, in the order an operator asks them:
//   1. Is anything broken?          -- the status banner, and the patches failing on devices
//   2. Where are my users?          -- how far the newest version has spread among today's phones
//   3. What can I patch, and how?   -- one row per store version: phones per platform, patches, health
// Installs appear once, in the versions table. They belong to a build, not to its per-platform
// registration records, which live on the Releases screen.

type Props = {
  digest: AppDigest;
  versions: VersionRow[];
  installsUnavailable: string;
  installsLoading: boolean;
  onOpenDeviceHealth: () => void;
  onOpenVersion: (row: VersionRow) => void;
  onOpenRollback: (patchId: string) => void;
  onOpenReleases: () => void;
};

export function AppOverviewPage(props: Props) {
  const { digest, versions } = props;
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7">
      <StatusBanner digest={digest} onOpenDeviceHealth={props.onOpenDeviceHealth} />
      {digest.failing.length ? <NeedsAttention digest={digest} versions={versions} onOpenRollback={props.onOpenRollback} /> : null}
      <Adoption versions={versions} />
      <VersionsTable {...props} />
    </div>
  );
}

function StatusBanner({ digest, onOpenDeviceHealth }: { digest: AppDigest; onOpenDeviceHealth: () => void }) {
  if (digest.health === "loading" || digest.health === "unknown") {
    return (
      <section className="rounded-lg border border-black/10 bg-white px-5 py-4">
        <p className="flex items-center gap-2 text-sm text-[#6d6d72]">
          <HealthDot health={digest.health} />
          {digest.verdict}
        </p>
      </section>
    );
  }
  if (digest.patches === 0) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">No patches published yet</p>
          <p className="mt-0.5 text-sm text-[#6d6d72]">
            Publish one from the app folder with <Code>soroq patch android</Code> or <Code>soroq patch ios</Code>. This is
            where you will see how it is doing on devices.
          </p>
        </div>
      </section>
    );
  }
  const tone =
    digest.health === "failing" ? "border-l-[#c0392b] bg-[#fdf3f2]" : digest.health === "healthy" ? "border-l-[#2f7d4f] bg-[#f2f8f4]" : "border-l-[#c4c4ca] bg-white";
  const facts = [
    { label: "Booted cleanly", value: pct(digest.successRate) },
    { label: "Devices on a patch", value: formatCount(digest.booted) },
    { label: "Devices failing", value: formatCount(digest.failed) },
    { label: "Patches", value: formatCount(digest.patches) },
    { label: "Rolled back", value: formatCount(digest.rolledBack) },
  ];
  return (
    <section className={`rounded-lg border border-black/10 border-l-4 p-5 ${tone}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className={`flex items-center gap-2 text-lg font-semibold ${digest.health === "failing" ? "text-[#8f2a20]" : digest.health === "healthy" ? "text-[#23603c]" : "text-[#4d4d52]"}`}>
            {digest.health === "failing" ? <AlertTriangle className="size-5 shrink-0" /> : <HealthDot health={digest.health} className="size-2.5" />}
            {digest.verdict}
          </p>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#4d4d52]">
            {digest.health === "failing"
              ? "Devices are reporting crashes or refusals for a live patch. See why on Device health, or roll it back."
              : digest.health === "healthy"
                ? "Every device that reported on a patch booted it without a crash or refusal."
                : "Devices report on a patch the first time they start it."}
          </p>
        </div>
        <Button type="button" variant="outline" className="h-9 shrink-0 border-black/15 bg-white text-black hover:bg-[#f3f3f4]" onClick={onOpenDeviceHealth}>
          <Activity className="size-4" />
          Device health
        </Button>
      </div>
      <div className="mt-4">
        <DeliveryPulse rows={digest.pulse} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs text-[#6d6d72]">{fact.label}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function NeedsAttention({ digest, versions, onOpenRollback }: { digest: AppDigest; versions: VersionRow[]; onOpenRollback: (patchId: string) => void }) {
  const versionOf = (releaseId: string) => versions.find((v) => v.releases.some((r) => r.id === releaseId))?.version ?? releaseId;
  return (
    <section>
      <SectionHeader title="Needs attention" description="Live patches that devices report failing." />
      <ul className="mt-3 divide-y divide-black/10 overflow-hidden rounded-lg border border-[#c0392b]/30 bg-white">
        {digest.failing.map((row) => (
          <li key={row.patchId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Patch #{row.patchNumber} <span className="font-normal text-[#6d6d72]">on {versionOf(row.releaseId)}</span>
              </p>
              <p className="mt-0.5 text-xs text-[#6d6d72]">
                {formatCount(row.failedDevices)} failing · {formatCount(row.successfulDevices)} booted ·{" "}
                {row.failureClasses.map((c) => c.title).join(", ") || "no reason sent"}
              </p>
            </div>
            <Button type="button" className="h-8 w-fit shrink-0 bg-[#c0392b] text-white hover:bg-[#a53125]" onClick={() => onOpenRollback(row.patchId)}>
              <RotateCcw className="size-4" />
              Roll back
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SHARE_TONES = ["bg-black", "bg-[#6d6d72]", "bg-[#a8a8ae]", "bg-[#d4d4d8]"];

/** How far the newest version has spread: each version's share of the phones opened in the last 24h. */
function Adoption({ versions }: { versions: VersionRow[] }) {
  const shares = activeShares(versions);
  if (!shares) return null;
  const active = versions.filter((v) => (v.installs?.active24h ?? 0) > 0);
  const latest = active[0];
  const shown = active.slice(0, 3);
  const rest = active.slice(3);
  const restShare = rest.reduce((sum, v) => sum + (shares.get(v.key) ?? 0), 0);
  const segments = [
    ...shown.map((v, i) => ({ key: v.key, label: v.version + (v.disambiguator ? ` (${v.disambiguator})` : ""), share: shares.get(v.key) ?? 0, tone: SHARE_TONES[i] })),
    ...(rest.length ? [{ key: "rest", label: `${rest.length} older`, share: restShare, tone: SHARE_TONES[3] }] : []),
  ];
  const latestShare = shares.get(latest.key) ?? 0;
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-sm text-[#4d4d52]">
          <span className="font-semibold text-black">{latest.version}</span> is on about{" "}
          <span className="font-semibold text-black">{Math.round(latestShare * 100)}%</span> of the phones that opened the app in the last 24 hours.
        </p>
        <p className="text-xs text-[#8d8d93]" title="A phone that updated today is counted on both versions, so shares are approximate.">
          Approximate
        </p>
      </div>
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-[#ececef]" role="img" aria-label="Share of today's phones by version">
        {segments.map((s) => (
          <span key={s.key} className={`${s.tone} h-full`} style={{ width: `${Math.max(s.share * 100, s.share > 0 ? 0.6 : 0)}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#4d4d52]">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${s.tone}`} />
            {s.label}
            <span className="tabular-nums text-[#8d8d93]">{Math.round(s.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function VersionsTable({ versions, installsUnavailable, installsLoading, onOpenVersion, onOpenReleases }: Props) {
  const split = versions.some((v) => v.installs?.split);
  const unattributed = versions.reduce((n, v) => n + (v.installs?.unattributed ?? 0), 0);
  return (
    <section>
      <SectionHeader
        title="Versions"
        description="Each store build, with the phones running it. Phones are counted when the app checks for updates at launch."
        action={
          <button type="button" onClick={onOpenReleases} className="focus-ring rounded text-sm font-medium text-black underline-offset-4 hover:underline">
            All releases
          </button>
        }
      />
      {installsUnavailable ? <p className="mt-2 text-sm text-[#8f2a20]">Install counts could not be read: {installsUnavailable}</p> : null}
      <div className="mt-3">
        {versions.length ? (
          <>
          {/* Phones: one card per version, so nothing hides behind a sideways scroll. */}
          <ul className="grid gap-2 sm:hidden">
            {versions.map((v) => (
              <li key={v.key}>
                <button type="button" onClick={() => onOpenVersion(v)} className="focus-ring w-full rounded-lg border border-black/10 bg-white p-4 text-left">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{v.version}</span>
                    {v.disambiguator ? <span className="font-mono text-[0.7rem] text-[#8d8d93]">{v.disambiguator}</span> : null}
                    <PlatformChips platforms={v.platforms} />
                    <ChevronRight className="ml-auto size-4 text-[#b1b1b5]" aria-hidden="true" />
                  </span>
                  {v.installs ? (
                    <span className="mt-2 grid grid-cols-3 gap-2 text-xs text-[#6d6d72]">
                      <span>
                        <span className="block text-base font-semibold tabular-nums text-black">{formatCount(v.installs.total)}</span>
                        phones
                      </span>
                      {v.installs.split ? (
                        <>
                          <span>
                            <span className="block text-base tabular-nums text-black">{formatCount(v.installs.android?.devices ?? 0)}</span>
                            Android
                          </span>
                          <span>
                            <span className="block text-base tabular-nums text-black">{formatCount(v.installs.ios?.devices ?? 0)}</span>
                            iOS
                          </span>
                        </>
                      ) : null}
                    </span>
                  ) : (
                    <span className="mt-1 block text-xs text-[#8d8d93]">No phone has checked in yet</span>
                  )}
                  <span className="mt-2 block text-xs text-[#8d8d93]">
                    {v.patches.total ? `${v.patches.live} live ${v.patches.live === 1 ? "patch" : "patches"}` : "No patches"} · Registered{" "}
                    {formatDateTime(v.registeredAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
          <TableShell minWidth={760}>
            <thead className="border-b border-black/10">
              <tr>
                <Th>Version</Th>
                {split ? (
                  <>
                    <Th align="right">Android</Th>
                    <Th align="right">iOS</Th>
                  </>
                ) : null}
                <Th align="right">Phones</Th>
                <Th align="right">Opened today</Th>
                <Th>Patches</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.07]">
              {versions.map((v) => (
                <VersionRowView key={v.key} row={v} split={split} loading={installsLoading} onOpen={() => onOpenVersion(v)} />
              ))}
            </tbody>
          </TableShell>
          </div>
          </>
        ) : (
          <EmptyCard title="No store builds yet">
            Register the build you ship with <Code>soroq release android</Code> or <Code>soroq release ios</Code>. Patches
            are published against it.
          </EmptyCard>
        )}
      </div>
      {unattributed > 0 ? (
        <p className="mt-2 text-xs leading-5 text-[#8d8d93]">
          Phones includes {formatCount(unattributed)} counted before installs were split by platform. Each moves to Android or
          iOS the next time the app is opened on it.
        </p>
      ) : null}
    </section>
  );
}

function VersionRowView({ row, split, loading, onOpen }: { row: VersionRow; split: boolean; loading: boolean; onOpen: () => void }) {
  const installs = row.installs;
  const platformCell = (value: number | undefined | null) =>
    installs && installs.split ? formatCount(value ?? 0) : loading ? <span className="text-[#c4c4ca]">…</span> : <Absent />;
  const latest = row.patches.latest;
  return (
    <tr className="cursor-pointer hover:bg-black/[0.025]" onClick={onOpen}>
      <td className="px-4 py-3">
        <button type="button" className="focus-ring rounded text-left" onClick={onOpen}>
          <span className="flex items-center gap-2">
            <span className="font-semibold">{row.version}</span>
            {row.disambiguator ? <span className="font-mono text-[0.7rem] text-[#8d8d93]">{row.disambiguator}</span> : null}
            <PlatformChips platforms={row.platforms} />
          </span>
          <span className="mt-0.5 block text-xs text-[#8d8d93]">
            {row.channel !== "stable" ? `${row.channel} channel · ` : ""}Registered {formatDateTime(row.registeredAt)}
          </span>
        </button>
      </td>
      {split ? (
        <>
          <td className="px-4 py-3 text-right tabular-nums text-[#4d4d52]">{platformCell(installs?.android?.devices)}</td>
          <td className="px-4 py-3 text-right tabular-nums text-[#4d4d52]">{platformCell(installs?.ios?.devices)}</td>
        </>
      ) : null}
      <td className="px-4 py-3 text-right font-semibold tabular-nums">{installs ? formatCount(installs.total) : loading ? <span className="text-[#c4c4ca]">…</span> : <Absent title="No phone has checked in on this build yet" />}</td>
      <td className="px-4 py-3 text-right tabular-nums text-[#6d6d72]">{installs ? formatCount(installs.active24h) : <Absent />}</td>
      <td className="px-4 py-3">
        {latest ? (
          <span className="block">
            <HealthBadge
              health={latest.delivery ? healthOf(latest.delivery) : latest.patch.rolledBack ? "rolledBack" : "silent"}
              suffix={` · #${latest.patch.number}`}
            />
            <span className="mt-0.5 block text-xs text-[#8d8d93]">
              {row.patches.live} live{row.patches.rolledBack ? ` · ${row.patches.rolledBack} rolled back` : ""}
            </span>
          </span>
        ) : (
          <span className="text-[#8d8d93]">None</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <ChevronRight className="ml-auto size-4 text-[#b1b1b5]" aria-hidden="true" />
      </td>
    </tr>
  );
}
