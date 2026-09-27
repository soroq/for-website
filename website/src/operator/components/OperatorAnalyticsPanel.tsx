import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsoleEmpty, OperatorMetric, StateNotice } from "@/operator/components/ConsolePrimitives";
import type { AnalyticsView, PatchDeliveryRow } from "@/operator/analytics";
import type { ApiState, JsonRecord } from "@/operator/types";

type Props = {
  appId: string;
  state: ApiState<JsonRecord>;
  view: AnalyticsView;
  canLoad: boolean;
  onRefresh: () => void;
};

const REASON_HELP: Array<[string, string]> = [
  ["Crashed before first frame", "the patched app died before it could show anything; those devices returned to their last good code on their own."],
  ["Crashed after launch / Froze (ANR)", "the patched app ran, then crashed or stopped responding; the patch stays active on those devices (Android 11+)."],
  ["Refused", "the device rejected the download as not authentic or corrupt; it never ran."],
];

function successRate(row: { successfulDevices: number; failedDevices: number }): number | null {
  const total = row.successfulDevices + row.failedDevices;
  return total ? row.successfulDevices / total : null;
}

function percent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(value === 1 || value === 0 ? 0 : 1)}%`;
}

function SuccessBar({ row }: { row: PatchDeliveryRow }) {
  const rate = successRate(row);
  if (!row.observed || rate === null) {
    return <span className="text-xs text-[#8d8d93]">no reports yet</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#ececef]">
        <div
          className={rate < 1 ? "h-full bg-[#c0392b]" : "h-full bg-black"}
          style={{ width: `${Math.max(4, rate * 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-[#323236]">{percent(rate)}</span>
    </div>
  );
}

function ReasonList({ row }: { row: PatchDeliveryRow }) {
  if (!row.failureClasses.length) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {row.failureClasses.map((entry) => (
        <span
          key={entry.label}
          title={entry.label}
          className="rounded-full border border-[#c0392b]/25 bg-[#fdf1f0] px-2.5 py-1 text-xs text-[#8f2a20]"
        >
          {entry.title} ×{entry.count}
        </span>
      ))}
    </div>
  );
}

export function OperatorAnalyticsPanel({ appId, state, view, canLoad, onRefresh }: Props) {
  const loading = state.status === "loading";
  const failing = view.rows.filter((row) => row.failedDevices > 0 && !row.rolledBack);
  const byRelease = new Map<string, PatchDeliveryRow[]>();
  for (const row of view.rows) {
    const key = row.releaseId || "(release not recorded)";
    byRelease.set(key, [...(byRelease.get(key) ?? []), row]);
  }
  for (const rows of byRelease.values()) {
    rows.sort((a, b) => b.patchNumber - a.patchNumber);
  }
  const overall = successRate(view.totals);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
            Delivery analytics
          </p>
          <h3 className="mt-2 text-lg font-semibold">Is every update reaching devices safely?</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6d6d72]">
            Per patch: how many devices booted it, how many failed and why, and whether it was rolled
            back. Counted per device from the reports devices send; nothing about your users is
            collected.
          </p>
        </div>
        <Button
          type="button"
          onClick={onRefresh}
          disabled={!canLoad || loading || !appId}
          className="h-9 self-start bg-black text-white hover:bg-[#2b2b2d] md:self-end"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
          Refresh
        </Button>
      </div>

      {!appId ? (
        <ConsoleEmpty title="Choose an app" body="Analytics are per app. Select an app to see how its updates are doing." />
      ) : null}
      {state.error ? <StateNotice tone="error" message={state.error} /> : null}
      {view.unavailable ? <StateNotice tone="warning" message={view.unavailable} /> : null}

      {appId && state.status === "ready" && !view.unavailable ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <OperatorMetric
              label="Patches reporting"
              value={`${view.totals.observedPatches} / ${view.totals.patches}`}
              helper="patches with at least one device report"
            />
            <OperatorMetric
              label="Devices booted"
              value={String(view.totals.successfulDevices)}
              helper="devices that ran a patch successfully"
            />
            <OperatorMetric
              label="Devices failed"
              value={String(view.totals.failedDevices)}
              helper="crashed, froze or refused a patch"
            />
            <OperatorMetric
              label="Success rate"
              value={percent(overall)}
              helper="of devices that reported an outcome"
            />
            <OperatorMetric
              label="Rolled back"
              value={String(view.totals.rolledBackPatches)}
              helper="patches withdrawn from devices"
            />
          </div>

          {failing.length ? (
            <div className="border border-[#c0392b]/30 bg-[#fdf6f5] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#8f2a20]">
                <AlertCircle className="size-4" />
                {failing.length === 1 ? "1 live patch is failing on devices" : `${failing.length} live patches are failing on devices`}
              </div>
              <div className="mt-3 grid gap-3">
                {failing.map((row) => (
                  <div key={row.patchId} className="grid gap-2 border-t border-[#c0392b]/15 pt-3 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">
                        Patch #{row.patchNumber}{" "}
                        <span className="font-normal text-[#6d6d72]">
                          · {row.releaseId} · {row.channel}
                        </span>
                      </p>
                      <p className="text-sm tabular-nums text-[#8f2a20]">
                        {row.failedDevices} failed · {row.successfulDevices} booted
                      </p>
                    </div>
                    <ReasonList row={row} />
                    <p className="font-mono text-xs text-[#6d6d72]">
                      withdraw it: soroq rollback --patch-id {row.patchId}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : view.totals.patches ? (
            <p className="text-sm text-[#4d7a4d]">No live patch is failing on devices.</p>
          ) : null}

          {view.rows.length ? (
            <div className="overflow-x-auto border border-black/10 bg-white">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-black/10 bg-[#f7f7f8] text-[0.68rem] uppercase tracking-[0.1em] text-[#8d8d93]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Patch</th>
                    <th className="px-3 py-2 font-medium">Channel</th>
                    <th className="px-3 py-2 font-medium">Booted</th>
                    <th className="px-3 py-2 font-medium">Failed</th>
                    <th className="px-3 py-2 font-medium">Success</th>
                    <th className="px-3 py-2 font-medium">Reasons</th>
                    <th className="px-3 py-2 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {[...byRelease.entries()].map(([release, rows]) => (
                    <FragmentRows key={release} release={release} rows={rows} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ConsoleEmpty title="No patches yet" body="Publish a patch and its device reports will appear here." />
          )}

          <div className="grid gap-1 text-xs leading-5 text-[#6d6d72]">
            {REASON_HELP.map(([name, help]) => (
              <p key={name}>
                <span className="font-medium text-[#323236]">{name}:</span> {help}
              </p>
            ))}
            {view.notice ? <p className="mt-1 text-[#8d8d93]">{view.notice}</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function FragmentRows({ release, rows }: { release: string; rows: PatchDeliveryRow[] }) {
  return (
    <>
      <tr className="border-b border-black/5 bg-[#fbfbfc]">
        <td colSpan={7} className="px-3 py-1.5 font-mono text-xs text-[#6d6d72]">
          {release}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.patchId} className="border-b border-black/5 align-top">
          <td className="px-3 py-2 font-medium">#{row.patchNumber}</td>
          <td className="px-3 py-2 text-[#4d4d52]">
            {row.channel}
            {row.track && row.track !== "stable" ? <span className="text-[#8d8d93]"> / {row.track}</span> : null}
          </td>
          <td className="px-3 py-2 tabular-nums">{row.observed ? row.successfulDevices : "—"}</td>
          <td className={`px-3 py-2 tabular-nums ${row.failedDevices ? "font-semibold text-[#8f2a20]" : ""}`}>
            {row.observed ? row.failedDevices : "—"}
          </td>
          <td className="px-3 py-2">
            <SuccessBar row={row} />
          </td>
          <td className="px-3 py-2">
            <ReasonList row={row} />
          </td>
          <td className="px-3 py-2">
            {row.rolledBack ? (
              <span className="rounded-full border border-black/15 bg-[#f0f0f2] px-2 py-0.5 text-xs">rolled back</span>
            ) : (
              <span className="text-xs text-[#6d6d72]">live</span>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
