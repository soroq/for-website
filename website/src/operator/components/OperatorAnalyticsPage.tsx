import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, RefreshCcw, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateNotice } from "@/operator/components/ConsolePrimitives";
import type { AnalyticsView, PatchDeliveryRow } from "@/operator/analytics";
import type { ApiState, JsonRecord } from "@/operator/types";

export type AnalyticsAppOption = { id: string; name: string };

type Props = {
  apps: AnalyticsAppOption[];
  selectedAppId: string;
  onSelectApp: (appId: string) => void;
  state: ApiState<JsonRecord>;
  view: AnalyticsView;
  canLoad: boolean;
  onRefresh: () => void;
  onOpenRollback: (patchId: string) => void;
};

type Health = "failing" | "healthy" | "silent" | "rolledBack";
type Filter = "all" | "failing" | "silent" | "rolledBack";

// One palette for health, used by the timeline, the table and the details panel alike.
const HEALTH: Record<Health, { label: string; block: string; dot: string; text: string }> = {
  failing: { label: "Failing on devices", block: "bg-[#c0392b] text-white border-[#c0392b]", dot: "bg-[#c0392b]", text: "text-[#8f2a20]" },
  healthy: { label: "Healthy", block: "bg-[#2f7d4f] text-white border-[#2f7d4f]", dot: "bg-[#2f7d4f]", text: "text-[#23603c]" },
  silent: { label: "No reports yet", block: "bg-[#f1f1f3] text-[#6d6d72] border-[#dcdce0]", dot: "bg-[#c4c4ca]", text: "text-[#6d6d72]" },
  rolledBack: { label: "Rolled back", block: "bg-white text-[#9a9aa1] border-[#c4c4ca] border-dashed line-through", dot: "bg-white border border-[#9a9aa1]", text: "text-[#6d6d72]" },
};

const REASON_EXPLAINED: Record<string, string> = {
  crash_before_first_frame: "The patched app died before it could show anything. Those devices went back to their last good code on their own.",
  crash_after_launch: "The patched app ran, then crashed. The patch stays active on those devices (Android 11+ reports this).",
  anr_after_launch: "The patched app ran, then stopped responding. The patch stays active on those devices.",
  signature_refused: "The device rejected the download because it was not signed by a key the app trusts. It never ran.",
  hash_mismatch: "The download did not match what was published (corrupt or tampered). It never ran.",
  activation_failed: "The patch was downloaded but could not be switched on.",
  patch_rejected: "The device refused the patch as invalid for this app build.",
  patch_missing: "The patch was scheduled but missing on the device at launch.",
  launch_failed: "The app reported the launch as failed.",
  unspecified: "Reported by an older app build that does not send a reason.",
};

function healthOf(row: PatchDeliveryRow): Health {
  if (row.rolledBack) return "rolledBack";
  if (row.failedDevices > 0) return "failing";
  if (!row.observed || row.successfulDevices + row.failedDevices === 0) return "silent";
  return "healthy";
}

function rate(ok: number, failed: number): number | null {
  return ok + failed ? ok / (ok + failed) : null;
}

function pct(value: number | null): string {
  if (value === null) return "—";
  const p = value * 100;
  return `${Number.isInteger(p) ? p : p.toFixed(1)}%`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="focus-ring inline-flex shrink-0 items-center gap-1 rounded border border-black/10 px-2 py-1 text-xs text-[#4d4d52] hover:border-black/25 hover:text-black"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        });
      }}
      aria-label={label}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Reasons({ row }: { row: PatchDeliveryRow }) {
  if (!row.failureClasses.length) return <span className="text-xs text-[#9a9aa1]">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {row.failureClasses.map((entry) => (
        <span key={entry.label} title={REASON_EXPLAINED[entry.label] ?? entry.label} className="rounded-full bg-[#fbeceb] px-2 py-0.5 text-xs text-[#8f2a20]">
          {entry.title} ×{entry.count}
        </span>
      ))}
    </div>
  );
}

export function OperatorAnalyticsPage({ apps, selectedAppId, onSelectApp, state, view, canLoad, onRefresh, onOpenRollback }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedPatchId, setSelectedPatchId] = useState("");
  useEffect(() => {
    setSelectedPatchId("");
    setFilter("all");
    setQuery("");
  }, [selectedAppId]);

  const loading = state.status === "loading";
  const ready = state.status === "ready" && !view.unavailable;
  const rows = view.rows;

  const releases = useMemo(() => {
    const map = new Map<string, PatchDeliveryRow[]>();
    for (const row of rows) {
      const key = row.releaseId || "release not recorded";
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    const list = [...map.entries()].map(([release, patches]) => ({
      release,
      patches: [...patches].sort((a, b) => a.patchNumber - b.patchNumber),
      failing: patches.some((p) => healthOf(p) === "failing"),
      latest: Math.max(...patches.map((p) => p.patchNumber)),
    }));
    // Releases with something wrong first, then the ones with the most patches (the active ones).
    return list.sort((a, b) => Number(b.failing) - Number(a.failing) || b.latest - a.latest || a.release.localeCompare(b.release));
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<Health, number> = { failing: 0, healthy: 0, silent: 0, rolledBack: 0 };
    for (const row of rows) c[healthOf(row)]++;
    return c;
  }, [rows]);

  const filtered = rows.filter((row) => {
    const h = healthOf(row);
    if (filter !== "all" && h !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || row.releaseId.toLowerCase().includes(q) || row.patchId.toLowerCase().includes(q) || `#${row.patchNumber}` === q || String(row.patchNumber) === q;
  });
  const orderedFiltered = [...filtered].sort(
    (a, b) => Number(healthOf(b) === "failing") - Number(healthOf(a) === "failing") || a.releaseId.localeCompare(b.releaseId) || b.patchNumber - a.patchNumber,
  );
  const selected = rows.find((row) => row.patchId === selectedPatchId) ?? null;
  const overall = rate(view.totals.successfulDevices, view.totals.failedDevices);
  const failingLive = rows.filter((r) => healthOf(r) === "failing");

  const verdict = !ready
    ? null
    : failingLive.length
      ? { tone: "failing" as const, text: failingLive.length === 1 ? "1 live patch is failing on devices" : `${failingLive.length} live patches are failing on devices` }
      : view.totals.observedPatches
        ? { tone: "healthy" as const, text: "Every live patch is running cleanly" }
        : { tone: "silent" as const, text: view.totals.patches ? "No device has reported on these patches yet" : "No patches published for this app yet" };

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
      {/* Header: what this is, which app, how fresh. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-black">Analytics</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#6d6d72]">
            How your updates are doing on real devices: which patches booted, which failed and why. Counted per device;
            nothing about your users is collected.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative w-full sm:w-auto">
            <span className="sr-only">App</span>
            <select
              value={selectedAppId}
              onChange={(event) => onSelectApp(event.target.value)}
              className="focus-ring h-9 w-full min-w-0 appearance-none truncate rounded-md border border-black/15 bg-white pl-3 pr-8 text-sm text-black sm:w-auto sm:min-w-[240px] sm:max-w-[340px]"
            >
              <option value="">Choose an app…</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name && app.name !== app.id ? `${app.name} (${app.id})` : app.id}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8d8d93]">▾</span>
          </label>
          <Button type="button" onClick={onRefresh} disabled={!canLoad || loading || !selectedAppId} className="h-9 bg-black text-white hover:bg-[#2b2b2d]">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            Refresh
          </Button>
          {state.receivedAt ? (
            <span className="text-xs text-[#8d8d93]">Updated {new Date(state.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          ) : null}
        </div>
      </div>

      {!selectedAppId ? (
        <div className="rounded-lg border border-black/10 bg-white p-6">
          <p className="text-base font-semibold">Choose an app to see its update health</p>
          <p className="mt-1 text-sm text-[#6d6d72]">Pick one from the list above, or start with one of these.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {apps.slice(0, 8).map((app) => (
              <button key={app.id} type="button" onClick={() => onSelectApp(app.id)} className="focus-ring rounded-md border border-black/10 px-3 py-1.5 text-sm hover:border-black/30">
                {app.name || app.id}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {state.error ? <StateNotice tone="error" message={state.error} /> : null}
      {view.unavailable ? <StateNotice tone="warning" message={view.unavailable} /> : null}
      {selectedAppId && loading && !ready ? (
        <div className="grid gap-3" aria-hidden="true">
          <div className="h-20 animate-pulse rounded-lg bg-[#f1f1f3]" />
          <div className="h-40 animate-pulse rounded-lg bg-[#f4f4f5]" />
        </div>
      ) : null}

      {selectedAppId && ready && verdict ? (
        <>
          {/* The answer first: is anything wrong right now? */}
          <section className="overflow-hidden rounded-lg border border-black/10 bg-white">
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className={`size-3 shrink-0 rounded-full ${HEALTH[verdict.tone].dot} ${verdict.tone === "failing" ? "animate-pulse motion-reduce:animate-none" : ""}`} />
                <p className={`text-lg font-semibold ${verdict.tone === "failing" ? "text-[#8f2a20]" : "text-black"}`}>{verdict.text}</p>
              </div>
              {verdict.tone === "failing" ? (
                <Button type="button" className="h-9 self-start border border-[#c0392b]/40 bg-white text-[#8f2a20] shadow-none hover:bg-[#fdf1f0] md:self-auto" onClick={() => { setFilter("failing"); setSelectedPatchId(failingLive[0].patchId); }}>
                  Review failing patches
                </Button>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 border-t border-black/10 sm:grid-cols-5">
              {[
                ["Success rate", pct(overall), "of devices that reported"],
                ["Devices booted", String(view.totals.successfulDevices), "ran a patch cleanly"],
                ["Devices failed", String(view.totals.failedDevices), "crashed, froze or refused"],
                ["Patches reporting", `${view.totals.observedPatches} of ${view.totals.patches}`, "heard from a device"],
                ["Rolled back", String(view.totals.rolledBackPatches), "withdrawn from devices"],
              ].map(([label, value, hint], index) => (
                <div key={label} className={`px-5 py-4 ${index ? "sm:border-l" : ""} border-black/10 ${index > 1 ? "border-t sm:border-t-0" : ""}`}>
                  <dt className="text-xs text-[#6d6d72]">{label}</dt>
                  <dd className={`mt-1 text-2xl font-semibold tabular-nums ${label === "Devices failed" && view.totals.failedDevices ? "text-[#8f2a20]" : "text-black"}`}>{value}</dd>
                  <p className="mt-0.5 text-xs text-[#9a9aa1]">{hint}</p>
                </div>
              ))}
            </dl>
          </section>

          {/* Timeline: every release, its patches in order, coloured by health. */}
          {releases.length ? (
            <section className="rounded-lg border border-black/10 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold">Patch timeline</h2>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6d6d72]">
                  {(Object.keys(HEALTH) as Health[]).map((h) => (
                    <li key={h} className="flex items-center gap-1.5">
                      <span className={`size-2.5 rounded-sm ${HEALTH[h].dot}`} />
                      {HEALTH[h].label} <span className="tabular-nums text-[#9a9aa1]">{counts[h]}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 grid gap-2.5">
                {releases.map(({ release, patches }) => (
                  <div key={release} className="grid gap-2 sm:grid-cols-[minmax(0,340px)_1fr] sm:items-center">
                    <p className="truncate font-mono text-xs text-[#4d4d52]" title={release}>{release}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {patches.map((row) => {
                        const h = healthOf(row);
                        const isSelected = row.patchId === selectedPatchId;
                        return (
                          <button
                            key={row.patchId}
                            type="button"
                            onClick={() => setSelectedPatchId(isSelected ? "" : row.patchId)}
                            title={`Patch #${row.patchNumber}: ${HEALTH[h].label}${row.observed ? ` (${row.successfulDevices} booted, ${row.failedDevices} failed)` : ""}`}
                            aria-pressed={isSelected}
                            className={`focus-ring grid h-8 min-w-8 place-items-center rounded border px-1.5 text-xs font-semibold tabular-nums transition-shadow ${HEALTH[h].block} ${isSelected ? "ring-2 ring-black ring-offset-2" : ""}`}
                          >
                            {row.patchNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Table + details. */}
          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 rounded-lg border border-black/10 bg-white">
              <div className="flex flex-col gap-3 border-b border-black/10 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter patches">
                  {([
                    ["all", "All", rows.length],
                    ["failing", "Failing", counts.failing],
                    ["silent", "No reports", counts.silent],
                    ["rolledBack", "Rolled back", counts.rolledBack],
                  ] as Array<[Filter, string, number]>).map(([key, label, n]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={filter === key}
                      onClick={() => setFilter(key)}
                      className={`focus-ring rounded-full border px-3 py-1 text-xs transition-colors ${
                        filter === key ? "border-black bg-black text-white" : "border-black/10 bg-white text-[#4d4d52] hover:border-black/25"
                      } ${key === "failing" && n && filter !== key ? "border-[#c0392b]/40 text-[#8f2a20]" : ""}`}
                    >
                      {label} <span className="tabular-nums opacity-70">{n}</span>
                    </button>
                  ))}
                </div>
                <label className="relative block md:w-64">
                  <span className="sr-only">Search patches</span>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9a9aa1]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search release, patch id or #"
                    className="focus-ring h-8 w-full rounded-md border border-black/10 pl-8 pr-3 text-sm outline-none placeholder:text-[#9a9aa1]"
                  />
                </label>
              </div>
              {orderedFiltered.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-xs text-[#8d8d93]">
                      <tr className="border-b border-black/10">
                        <th className="px-4 py-2 font-medium">Patch</th>
                        <th className="px-4 py-2 font-medium">Release</th>
                        <th className="px-4 py-2 text-right font-medium">Booted</th>
                        <th className="px-4 py-2 text-right font-medium">Failed</th>
                        <th className="px-4 py-2 font-medium">Success</th>
                        <th className="px-4 py-2 font-medium">Reasons</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedFiltered.map((row) => {
                        const h = healthOf(row);
                        const r = rate(row.successfulDevices, row.failedDevices);
                        const isSelected = row.patchId === selectedPatchId;
                        return (
                          <tr
                            key={row.patchId}
                            onClick={() => setSelectedPatchId(isSelected ? "" : row.patchId)}
                            className={`cursor-pointer border-b border-black/5 align-top last:border-0 ${isSelected ? "bg-[#f4f4f5]" : "hover:bg-[#fafafa]"}`}
                          >
                            <td className="px-4 py-2.5">
                              <span className="flex items-center gap-2 font-semibold">
                                <span className={`size-2 shrink-0 rounded-full ${HEALTH[h].dot}`} aria-label={HEALTH[h].label} />
                                #{row.patchNumber}
                              </span>
                            </td>
                            <td className="max-w-[300px] truncate px-4 py-2.5 font-mono text-xs text-[#4d4d52]" title={row.releaseId}>
                              {row.releaseId}
                              <span className="ml-1 font-sans text-[#9a9aa1]">{row.channel}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{row.observed ? row.successfulDevices : "—"}</td>
                            <td className={`px-4 py-2.5 text-right tabular-nums ${row.failedDevices ? "font-semibold text-[#8f2a20]" : ""}`}>{row.observed ? row.failedDevices : "—"}</td>
                            <td className="px-4 py-2.5">
                              {r === null ? (
                                <span className={`text-xs ${HEALTH[h].text}`}>{h === "rolledBack" ? "rolled back" : "no reports"}</span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#ececef]">
                                    <span className={`block h-full ${r < 1 ? "bg-[#c0392b]" : "bg-[#2f7d4f]"}`} style={{ width: `${Math.max(6, r * 100)}%` }} />
                                  </span>
                                  <span className="text-xs tabular-nums">{pct(r)}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5"><Reasons row={row} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-6 text-sm text-[#6d6d72]">
                  {rows.length ? "No patch matches this filter." : "Publish a patch and its device reports will appear here."}
                </p>
              )}
            </div>

            {/* Details for the selected patch. */}
            <aside className="rounded-lg border border-black/10 bg-white p-5 xl:sticky xl:top-4 xl:self-start">
              {selected ? (
                <PatchDetails row={selected} onClose={() => setSelectedPatchId("")} onOpenRollback={onOpenRollback} />
              ) : (
                <div>
                  <p className="text-sm font-semibold">Patch details</p>
                  <p className="mt-1 text-sm leading-6 text-[#6d6d72]">
                    Select a patch in the timeline or the table to see what devices reported, what the reasons mean, and how to
                    withdraw it.
                  </p>
                </div>
              )}
            </aside>
          </section>

          {view.notice ? <p className="text-xs leading-5 text-[#9a9aa1]">{view.notice}</p> : null}
        </>
      ) : null}
    </div>
  );
}

function PatchDetails({ row, onClose, onOpenRollback }: { row: PatchDeliveryRow; onClose: () => void; onOpenRollback: (patchId: string) => void }) {
  const h = healthOf(row);
  const r = rate(row.successfulDevices, row.failedDevices);
  const rollbackCommand = `soroq rollback --patch-id ${row.patchId}`;
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold">Patch #{row.patchNumber}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-[#6d6d72]" title={row.releaseId}>{row.releaseId}</p>
          <p className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${HEALTH[h].text}`}>
            <span className={`size-2 rounded-full ${HEALTH[h].dot}`} />
            {HEALTH[h].label}
          </p>
        </div>
        <button type="button" onClick={onClose} className="focus-ring rounded p-1 text-[#8d8d93] hover:text-black" aria-label="Close patch details">
          <X className="size-4" />
        </button>
      </div>

      <dl className="grid grid-cols-3 gap-3 rounded-md bg-[#f7f7f8] p-3">
        <div><dt className="text-xs text-[#6d6d72]">Booted</dt><dd className="text-lg font-semibold tabular-nums">{row.observed ? row.successfulDevices : "—"}</dd></div>
        <div><dt className="text-xs text-[#6d6d72]">Failed</dt><dd className={`text-lg font-semibold tabular-nums ${row.failedDevices ? "text-[#8f2a20]" : ""}`}>{row.observed ? row.failedDevices : "—"}</dd></div>
        <div><dt className="text-xs text-[#6d6d72]">Success</dt><dd className="text-lg font-semibold tabular-nums">{pct(r)}</dd></div>
      </dl>

      {row.failureClasses.length ? (
        <div className="grid gap-2">
          <p className="text-sm font-semibold">Why devices failed</p>
          {row.failureClasses.map((entry) => (
            <div key={entry.label} className="rounded-md border border-[#c0392b]/20 bg-[#fdf6f5] p-3">
              <p className="text-sm font-medium text-[#8f2a20]">{entry.title} <span className="tabular-nums">×{entry.count}</span></p>
              <p className="mt-1 text-xs leading-5 text-[#6d6d72]">{REASON_EXPLAINED[entry.label] ?? "A reason this console does not describe yet."}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-1.5 text-xs text-[#6d6d72]">
        <p>Channel <span className="text-black">{row.channel}</span>{row.track && row.track !== "stable" ? <> · track <span className="text-black">{row.track}</span></> : null}</p>
        {row.observed ? (
          <p>{row.verifiedSuccessfulDevices + row.verifiedFailedDevices} of {row.successfulDevices + row.failedDevices} reports came with a verified identity.</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-semibold">Patch id</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-[#f4f4f5] px-2 py-1.5 text-xs" title={row.patchId}>{row.patchId}</code>
          <CopyButton value={row.patchId} label="Copy patch id" />
        </div>
      </div>

      {!row.rolledBack ? (
        <div className="grid gap-2 border-t border-black/10 pt-4">
          <p className="text-sm font-semibold">Withdraw this patch</p>
          <p className="text-xs leading-5 text-[#6d6d72]">Every device returns to its previous good code on its next launch.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-[#f4f4f5] px-2 py-1.5 text-xs" title={rollbackCommand}>{rollbackCommand}</code>
            <CopyButton value={rollbackCommand} label="Copy rollback command" />
          </div>
          <Button type="button" className="h-9 justify-center border border-black/15 bg-white text-black shadow-none hover:bg-[#f4f4f5]" onClick={() => onOpenRollback(row.patchId)}>
            <RotateCcw className="size-4" />
            Roll back in console
          </Button>
        </div>
      ) : (
        <p className="border-t border-black/10 pt-4 text-xs text-[#6d6d72]">This patch has already been withdrawn from devices.</p>
      )}
    </div>
  );
}
