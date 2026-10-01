import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { CopyButton } from "@/operator/components/OperatorAnalyticsPage";
import { formatCount, formatDateTime, platformName, shortId, type Release } from "../model";
import type { VersionRow } from "../versions";
import { Absent, Code, EmptyCard, PlatformChips, SectionHeader, TableShell, Th } from "../ui";
import { PatchesTable, type PatchRow } from "./PatchesPage";

/** The engine a release was built on, short: "…private_state.r9_obfuscation" reads as "r9_obfuscation". */
export function engineLabel(revision: string): string {
  if (!revision) return "";
  const tail = revision.split(".").pop() ?? revision;
  return tail || revision;
}

function patchCount(rows: PatchRow[], releaseId: string) {
  return rows.filter((r) => r.patch.releaseId === releaseId).length;
}

/**
 * Every store build and its registrations. A version is registered once per platform (sometimes again,
 * when a build is re-registered); each registration is a row, under its version.
 */
export function ReleasesPage({
  versions,
  patchRows,
  loading,
  onOpenRelease,
}: {
  versions: VersionRow[];
  patchRows: PatchRow[];
  loading: boolean;
  onOpenRelease: (releaseId: string) => void;
}) {
  if (loading && !versions.length) return <div className="h-48 animate-pulse rounded-lg border border-black/10 bg-white" />;
  if (!versions.length) {
    return (
      <EmptyCard title="No releases yet">
        Register the build you ship to the store with <Code>soroq release android</Code> or <Code>soroq release ios</Code>.
      </EmptyCard>
    );
  }
  return (
    <TableShell minWidth={820}>
      <thead className="border-b border-black/10">
        <tr>
          <Th>Release</Th>
          <Th>Platform</Th>
          <Th>Engine</Th>
          <Th align="right">Patches</Th>
          <Th>Registered</Th>
          <Th />
        </tr>
      </thead>
      {versions.map((v) => (
        <tbody key={v.key} className="border-b border-black/10 last:border-b-0">
          <tr className="bg-[#f7f7f8]">
            <td colSpan={6} className="px-4 py-2">
              <span className="flex items-center gap-2">
                <span className="font-semibold">{v.version}</span>
                {v.disambiguator ? <span className="font-mono text-[0.7rem] text-[#8d8d93]">{v.disambiguator}</span> : null}
                {v.channel !== "stable" ? <span className="text-xs text-[#8d8d93]">{v.channel} channel</span> : null}
                {v.runtimeId ? (
                  <span className="ml-auto font-mono text-[0.7rem] text-[#8d8d93]" title={`Runtime ${v.runtimeId}`}>
                    runtime {shortId(v.runtimeId)}
                  </span>
                ) : null}
              </span>
            </td>
          </tr>
          {v.releases.map((release) => (
            <tr key={release.id} className="cursor-pointer hover:bg-black/[0.025]" onClick={() => onOpenRelease(release.id)}>
              <td className="px-4 py-2.5">
                <button type="button" className="focus-ring rounded text-left font-mono text-xs" onClick={() => onOpenRelease(release.id)}>
                  {release.id}
                </button>
              </td>
              <td className="px-4 py-2.5">{platformName(release.platform, release.platformRaw)}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-[#4d4d52]" title={release.engineRevision}>
                {engineLabel(release.engineRevision) || <Absent title="Not recorded for this release" />}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{patchCount(patchRows, release.id)}</td>
              <td className="px-4 py-2.5 text-[#6d6d72]">{formatDateTime(release.createdAt)}</td>
              <td className="px-3 py-2.5 text-right">
                <ChevronRight className="ml-auto size-4 text-[#b1b1b5]" aria-hidden="true" />
              </td>
            </tr>
          ))}
        </tbody>
      ))}
    </TableShell>
  );
}

function Fact({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[#6d6d72]">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{value}</dd>
      {sub ? <p className="text-xs text-[#8d8d93]">{sub}</p> : null}
    </div>
  );
}

function RegistrationCard({ release }: { release: Release }) {
  // Only what the server recorded: older releases carry fewer fields, and a grid of blanks says nothing.
  const rows = (
    [
      ["Release id", release.id],
      ["Engine", release.engineRevision],
      ["Toolchain", release.toolchainId],
      ["Runtime", release.runtimeId],
      ["Flutter", release.flutterRevision],
      ["Architecture", release.arch],
    ] as Array<[string, string]>
  ).filter(([, value]) => value);
  return (
    <div className="rounded-lg border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-2.5">
        <p className="text-sm font-semibold">{platformName(release.platform, release.platformRaw)}</p>
        <p className="text-xs text-[#8d8d93]">Registered {formatDateTime(release.createdAt)}</p>
      </div>
      <dl className="grid gap-px bg-black/[0.06] sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 bg-white px-4 py-2.5">
            <dt className="text-xs text-[#6d6d72]">{label}</dt>
            <dd className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <span className="truncate font-mono text-xs" title={value}>
                {value}
              </span>
              {label === "Release id" || label === "Runtime" ? <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} /> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** One store build: its phones, its registrations (one per platform), and the patches published on it. */
export function ReleaseDetail({
  version,
  patchRows,
  onBack,
  onInspect,
  onRollback,
}: {
  version: VersionRow;
  patchRows: PatchRow[];
  onBack: () => void;
  onInspect: (patchId: string) => void;
  onRollback: (patchId: string) => void;
}) {
  const installs = version.installs;
  const releaseIds = new Set(version.releases.map((r) => r.id));
  const rows = patchRows.filter((r) => releaseIds.has(r.patch.releaseId));
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <button type="button" onClick={onBack} className="focus-ring inline-flex items-center gap-1.5 rounded text-sm text-[#6d6d72] hover:text-black">
          <ArrowLeft className="size-4" />
          All releases
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{version.version}</h2>
          {version.disambiguator ? <span className="font-mono text-xs text-[#8d8d93]">{version.disambiguator}</span> : null}
          <PlatformChips platforms={version.platforms} />
          {version.channel !== "stable" ? <span className="text-xs text-[#8d8d93]">{version.channel} channel</span> : null}
        </div>
      </div>

      <section className="rounded-lg border border-black/10 bg-white p-5">
        {installs ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            {installs.split ? (
              <>
                <Fact label="Android phones" value={formatCount(installs.android?.devices ?? 0)} />
                <Fact label="iPhones" value={formatCount(installs.ios?.devices ?? 0)} />
              </>
            ) : null}
            <Fact
              label="Phones"
              value={formatCount(installs.total)}
              sub={installs.unattributed ? `incl. ${formatCount(installs.unattributed)} not yet attributed` : undefined}
            />
            <Fact label="Opened today" value={formatCount(installs.active24h)} />
            <Fact label="Opened this week" value={formatCount(installs.active7d)} />
          </dl>
        ) : (
          <p className="text-sm text-[#6d6d72]">No phone has checked in on this build yet. Phones appear the first time it is opened.</p>
        )}
      </section>

      <section>
        <SectionHeader title="Registrations" description="The store build as registered for each platform." />
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {version.releases.map((release) => (
            <RegistrationCard key={release.id} release={release} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Patches" description="Published on this build, newest first." />
        <div className="mt-3">
          {rows.length ? (
            <PatchesTable rows={rows} onInspect={onInspect} onRollback={onRollback} />
          ) : (
            <EmptyCard title="No patches on this build yet" />
          )}
        </div>
      </section>
    </div>
  );
}
