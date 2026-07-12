import { BarChart3, RefreshCcw, RotateCcw, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConsoleEmpty } from "./ConsolePrimitives";
import type { OperatorTab } from "../types";

type QueueRow = {
  label: string;
  value: string;
  detail: string;
};

type PatchStateBar = {
  label: string;
  value: number;
  helper: string;
  tone: string;
};

type ReleaseLaneRow = {
  id: string;
  label: string;
  runtime: string;
  patches: number;
  active: number;
  rolledBack: number;
};

type PatchKindRow = [string, number];

export function OperatorOverviewPanel({
  consoleHealthLabel,
  consoleHealthScore,
  operatorQueueRows,
  patchStateBars,
  patchStateMax,
  releaseLaneRows,
  releaseCount,
  patchKindRows,
  canRefresh,
  inventoryLoading,
  latestPatchId,
  selectedPatchId,
  onRefresh,
  onSelectPatch,
  onSelectRelease,
  onSelectTab,
}: {
  consoleHealthLabel: string;
  consoleHealthScore: number;
  operatorQueueRows: QueueRow[];
  patchStateBars: PatchStateBar[];
  patchStateMax: number;
  releaseLaneRows: ReleaseLaneRow[];
  releaseCount: number;
  patchKindRows: PatchKindRow[];
  canRefresh: boolean;
  inventoryLoading: boolean;
  latestPatchId: string;
  selectedPatchId: string;
  onRefresh: () => void;
  onSelectPatch: (patchId: string) => void;
  onSelectRelease: (releaseId: string) => void;
  onSelectTab: (tab: OperatorTab) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="operator-panel-soft overflow-hidden p-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
                Release cockpit
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                {consoleHealthLabel}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d6d72]">
                One operator view for the selected app, release, channel,
                health, and rollback state.
              </p>
            </div>
            <span className="w-fit rounded-full border border-black bg-black px-3 py-1.5 text-xs font-medium text-white">
              {consoleHealthScore}% ready
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e5e5e7]">
            <div
              className="h-full rounded-full bg-black"
              style={{ width: `${consoleHealthScore}%` }}
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {operatorQueueRows.map((row) => (
              <div
                key={row.label}
                className="min-w-0 border border-black/10 bg-[#f7f7f8] px-3 py-3"
              >
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.13em] text-[#8d8d93]">
                  {row.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-black">
                  {row.value}
                </p>
                <p className="mt-1 truncate text-xs text-[#6d6d72]">{row.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="operator-panel-soft p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
                Patch state graph
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
                Visible patches by serving state
              </h2>
            </div>
            <BarChart3 className="size-5 text-black" />
          </div>
          <div className="mt-5 grid gap-4">
            {patchStateBars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-black">{bar.label}</span>
                  <span className="font-mono text-xs text-[#6d6d72]">{bar.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#e5e5e7]">
                  <div
                    className={`h-full rounded-full ${bar.tone}`}
                    style={{
                      width: `${Math.max(
                        bar.value ? 8 : 0,
                        Math.round((bar.value / patchStateMax) * 100),
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#7a7a80]">{bar.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="operator-panel-soft p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
                Release lane map
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
                Which base releases are carrying patches.
              </h2>
            </div>
            <span className="w-fit rounded-full border border-black/10 bg-[#f7f7f8] px-3 py-1.5 text-xs text-[#6d6d72]">
              {releaseCount} releases
            </span>
          </div>

          {releaseLaneRows.length ? (
            <div className="grid gap-2">
              {releaseLaneRows.map((lane) => {
                const laneMax = Math.max(
                  ...releaseLaneRows.map((row) => row.patches),
                  1,
                );
                return (
                  <button
                    key={lane.id || lane.label}
                    type="button"
                    disabled={!lane.id}
                    onClick={() => onSelectRelease(lane.id)}
                    className="operator-table-row grid w-full gap-3 border border-black/10 bg-white p-3 text-left md:grid-cols-[minmax(0,1fr)_170px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{lane.label}</p>
                      <p className="mt-1 truncate text-xs text-[#7a7a80]">
                        {lane.patches} {lane.patches === 1 ? "patch" : "patches"}
                      </p>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs text-[#6d6d72]">
                        <span>{lane.active} active</span>
                        <span>{lane.rolledBack} rolled back</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#e5e5e7]">
                        <div
                          className="h-full rounded-full bg-black"
                          style={{
                            width: `${Math.max(
                              lane.patches ? 8 : 0,
                              Math.round((lane.patches / laneMax) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <ConsoleEmpty
              title="No release lanes loaded"
              body="Sign in and refresh inventory to build the release map."
            />
          )}
        </div>

        <div className="operator-panel-soft p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
                Operator queue
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
                Next safe console actions.
              </h2>
            </div>
            <ShieldCheck className="size-5 text-black" />
          </div>

          <div className="mt-4 grid gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 justify-start border-black/10 bg-white text-black hover:bg-[#f3f3f4]"
              disabled={!canRefresh || inventoryLoading}
              onClick={onRefresh}
            >
              {inventoryLoading ? (
                <RefreshCcw className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              Refresh inventory
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 justify-start border-black/10 bg-white text-black hover:bg-[#f3f3f4]"
              disabled={!latestPatchId}
              onClick={() => latestPatchId && onSelectPatch(latestPatchId)}
            >
              <Search className="size-4" />
              Inspect latest patch
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 justify-start border-black/10 bg-white text-black hover:bg-[#f3f3f4]"
              disabled={!selectedPatchId.trim()}
              onClick={() => onSelectTab("rollback")}
            >
              <RotateCcw className="size-4" />
              Open rollback guard
            </Button>
          </div>

          <div className="mt-4 border border-black/10 bg-[#f7f7f8] p-3">
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.13em] text-[#8d8d93]">
              Patch mix
            </p>
            {patchKindRows.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {patchKindRows.map(([kind, count]) => (
                  <span
                    key={kind}
                    className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-[#4d4d52]"
                  >
                    {kind}: {count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#6d6d72]">
                Patch type distribution appears after inventory loads.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
