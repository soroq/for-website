import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PatchDeliveryRow } from "@/operator/analytics";
import { healthOf, type Health } from "../health";
import { formatCount, formatDateTime, patchKindLabel, platformName, type Patch, type Platform, type Release } from "../model";
import type { VersionRow } from "../versions";
import { Absent, Code, EmptyCard, HealthBadge, TableShell, Th } from "../ui";

export type PatchRow = {
  patch: Patch;
  version: string;
  platform: Platform;
  platformRaw: string;
  delivery: PatchDeliveryRow | null;
  health: Health;
};

/** Every patch of the app with the version and platform it targets and what devices reported, newest first. */
export function buildPatchRows(patches: Patch[], releases: Release[], delivery: PatchDeliveryRow[]): PatchRow[] {
  const releaseById = new Map(releases.map((r) => [r.id, r]));
  const deliveryById = new Map(delivery.map((d) => [d.patchId, d]));
  return patches
    .map((patch) => {
      const release = releaseById.get(patch.releaseId);
      const d = deliveryById.get(patch.id) ?? null;
      return {
        patch,
        version: release?.version ?? patch.releaseId,
        platform: release?.platform ?? "other",
        platformRaw: release?.platformRaw ?? "",
        delivery: d,
        health: d ? healthOf(d) : patch.rolledBack ? "rolledBack" : "silent",
      } satisfies PatchRow;
    })
    .sort((a, b) => b.patch.createdAt - a.patch.createdAt || b.patch.number - a.patch.number);
}

export function PatchesTable({
  rows,
  showVersion = true,
  onInspect,
  onRollback,
}: {
  rows: PatchRow[];
  showVersion?: boolean;
  onInspect: (patchId: string) => void;
  onRollback: (patchId: string) => void;
}) {
  return (
    <TableShell minWidth={860}>
      <thead className="border-b border-black/10">
        <tr>
          <Th>Patch</Th>
          {showVersion ? <Th>Version</Th> : null}
          <Th>Health on devices</Th>
          <Th align="right">Booted</Th>
          <Th align="right">Failed</Th>
          <Th>Kind</Th>
          <Th>Published</Th>
          <Th />
        </tr>
      </thead>
      <tbody className="divide-y divide-black/[0.07]">
        {rows.map(({ patch, version, platform, platformRaw, delivery, health }) => (
          <tr key={patch.id} className="hover:bg-black/[0.02]">
            <td className="px-4 py-3">
              <button type="button" className="focus-ring rounded text-left" onClick={() => onInspect(patch.id)}>
                <span className={`block font-semibold ${patch.rolledBack ? "text-[#8d8d93] line-through" : ""}`}>#{patch.number}</span>
                <span className="block max-w-[30ch] truncate font-mono text-[0.7rem] text-[#8d8d93]" title={patch.id}>
                  {patch.id}
                </span>
              </button>
            </td>
            {showVersion ? (
              <td className="px-4 py-3">
                <span className="block">{version}</span>
                <span className="block text-xs text-[#8d8d93]">{platformName(platform, platformRaw)}</span>
              </td>
            ) : null}
            <td className="px-4 py-3">
              <HealthBadge health={health} />
              {patch.channel !== "stable" || patch.rolloutPercent < 100 ? (
                <span className="mt-0.5 block text-xs text-[#8d8d93]">
                  {patch.channel !== "stable" ? `${patch.channel} channel` : ""}
                  {patch.channel !== "stable" && patch.rolloutPercent < 100 ? " · " : ""}
                  {patch.rolloutPercent < 100 ? `${patch.rolloutPercent}% rollout` : ""}
                </span>
              ) : null}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{delivery?.observed ? formatCount(delivery.successfulDevices) : <Absent title="No device has reported on this patch" />}</td>
            <td className={`px-4 py-3 text-right tabular-nums ${delivery?.failedDevices ? "font-semibold text-[#8f2a20]" : ""}`}>
              {delivery?.observed ? formatCount(delivery.failedDevices) : <Absent title="No device has reported on this patch" />}
            </td>
            <td className="px-4 py-3 text-[#4d4d52]">{patchKindLabel(patch.kind)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-[#6d6d72]">{formatDateTime(patch.createdAt)}</td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-1.5">
                <Button type="button" variant="outline" className="h-8 border-black/10 bg-white px-2.5 text-black hover:bg-[#f3f3f4]" onClick={() => onInspect(patch.id)}>
                  Details
                </Button>
                {!patch.rolledBack ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 border-black/10 bg-white px-2.5 text-[#8f2a20] hover:border-[#c0392b]/40 hover:bg-[#fdf3f2]"
                    onClick={() => onRollback(patch.id)}
                    aria-label={`Roll back patch ${patch.number}`}
                    title="Roll back"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

type Status = "all" | "live" | "failing" | "rolledBack";

const PAGE = 25;

const selectClass = "focus-ring h-9 rounded-md border border-black/10 bg-white px-2.5 text-sm text-black";

/** The app's patches, filtered on the page: version, platform, status and (when there are several) channel. */
export function PatchesPage({
  rows,
  versions,
  loading,
  error,
  onInspect,
  onRollback,
}: {
  rows: PatchRow[];
  versions: VersionRow[];
  loading: boolean;
  error: string;
  onInspect: (patchId: string) => void;
  onRollback: (patchId: string) => void;
}) {
  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [channel, setChannel] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const channels = useMemo(() => [...new Set(rows.map((r) => r.patch.channel))].sort(), [rows]);
  const platforms = useMemo(() => [...new Set(rows.map((r) => r.platform))].sort(), [rows]);
  const versionLabels = useMemo(() => [...new Set(versions.map((v) => v.version))], [versions]);

  const shown = rows.filter(
    (r) =>
      (!version || r.version === version) &&
      (!platform || r.platform === platform) &&
      (!channel || r.patch.channel === channel) &&
      (status === "all" ||
        (status === "live" && !r.patch.rolledBack) ||
        (status === "failing" && r.health === "failing") ||
        (status === "rolledBack" && r.patch.rolledBack)),
  );
  const filtered = Boolean(version || platform || channel || status !== "all");
  const visible = shown.slice(0, limit);
  // A filter change starts from the first page again.
  const setFilter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setLimit(PAGE);
  };

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {error ? <p className="text-sm text-[#8f2a20]">Patches could not be loaded: {error}</p> : null}
      {rows.length ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-[#6d6d72]">
            Version
            <select value={version} onChange={(e) => setFilter(setVersion)(e.target.value)} className={selectClass}>
              <option value="">All versions</option>
              {versionLabels.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {platforms.length > 1 ? (
            <label className="grid gap-1 text-xs text-[#6d6d72]">
              Platform
              <select value={platform} onChange={(e) => setFilter(setPlatform)(e.target.value)} className={selectClass}>
                <option value="">All platforms</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {platformName(p)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="grid gap-1 text-xs text-[#6d6d72]">
            Status
            <select value={status} onChange={(e) => setFilter(setStatus)(e.target.value as Status)} className={selectClass}>
              <option value="all">All</option>
              <option value="live">Live</option>
              <option value="failing">Failing on devices</option>
              <option value="rolledBack">Rolled back</option>
            </select>
          </label>
          {channels.length > 1 ? (
            <label className="grid gap-1 text-xs text-[#6d6d72]">
              Channel
              <select value={channel} onChange={(e) => setFilter(setChannel)(e.target.value)} className={selectClass}>
                <option value="">All channels</option>
                {channels.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {filtered ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 border-black/10 bg-white px-3 text-black hover:bg-[#f3f3f4]"
              onClick={() => {
                setVersion("");
                setPlatform("");
                setStatus("all");
                setChannel("");
                setLimit(PAGE);
              }}
            >
              Clear filters
            </Button>
          ) : null}
          <p className="ml-auto self-center text-xs text-[#8d8d93]">
            {filtered ? `${shown.length} of ${rows.length}` : rows.length} {rows.length === 1 ? "patch" : "patches"}
          </p>
        </div>
      ) : null}
      {loading && !rows.length ? (
        <div className="h-40 animate-pulse rounded-lg border border-black/10 bg-white" />
      ) : shown.length ? (
        <div className="grid gap-2">
          <PatchesTable rows={visible} onInspect={onInspect} onRollback={onRollback} />
          {shown.length > visible.length ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full border-black/10 bg-white text-black hover:bg-[#f3f3f4]"
              onClick={() => setLimit((n) => n + PAGE)}
            >
              Show {Math.min(PAGE, shown.length - visible.length)} more of {shown.length - visible.length}
            </Button>
          ) : null}
        </div>
      ) : rows.length ? (
        <EmptyCard title="No patches match these filters" />
      ) : (
        <EmptyCard title="No patches yet">
          Publish one from the app folder with <Code>soroq patch android</Code> or <Code>soroq patch ios</Code>.
        </EmptyCard>
      )}
    </div>
  );
}
