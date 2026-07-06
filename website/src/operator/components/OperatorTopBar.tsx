import { RefreshCcw, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiStatusPill } from "./ConsolePrimitives";
import type { ApiState, JsonRecord, OperatorTab } from "../types";

export function OperatorTopBar({
  healthState,
  selectedAppId,
  selectedAppName,
  selectedReleaseId,
  appSearch,
  inventoryLoading,
  canRefresh,
  productSectionLabel,
  onSearchChange,
  onRefresh,
  onSelectTab,
}: {
  healthState: ApiState<JsonRecord>;
  selectedAppId: string;
  selectedAppName: string;
  selectedReleaseId: string;
  appSearch: string;
  inventoryLoading: boolean;
  canRefresh: boolean;
  productSectionLabel?: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onSelectTab: (tab: OperatorTab) => void;
}) {
  const productMode = Boolean(productSectionLabel);

  return (
    <header className="operator-topbar sticky top-0 z-20 grid min-w-0 gap-3 overflow-hidden border-b border-black/10 px-4 py-3 backdrop-blur-2xl sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,420px)_auto] xl:items-center">
      <div className="flex min-w-0 items-center gap-3 text-sm text-[#6d6d72]">
        <span className="size-2 shrink-0 rounded-full bg-black" aria-hidden="true" />
        <span className="shrink-0 font-medium text-black">Operator console</span>
        {!productMode && selectedAppId ? (
          <>
            <span className="text-[#b1b1b5]">/</span>
            <span className="max-w-[42vw] truncate text-[#4d4d52]">
              {selectedAppName}
            </span>
          </>
        ) : null}
        {!productMode && selectedReleaseId ? (
          <>
            <span className="text-[#b1b1b5]">/</span>
            <span className="font-mono text-[#4d4d52]">{selectedReleaseId}</span>
          </>
        ) : null}
      </div>

      {productMode ? (
        <div className="order-last flex h-9 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-black/10 bg-[#f6f6f7] px-3 text-sm xl:order-none">
          <span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.13em] text-[#8d8d93]">
            Product section
          </span>
          <span className="truncate font-medium text-black">
            {productSectionLabel}
          </span>
        </div>
      ) : (
        <label className="order-last flex h-9 w-full min-w-0 items-center gap-3 rounded-lg border border-black/10 bg-[#f6f6f7] px-3 xl:order-none">
          <Search className="size-4 text-[#77777d]" />
          <span className="sr-only">Search applications</span>
          <input
            value={appSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search apps"
            className="w-full bg-transparent text-sm text-black outline-none placeholder:text-[#9a9aa1]"
          />
        </label>
      )}

      <div className="grid w-full min-w-0 grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
        <ApiStatusPill
          state={healthState.status}
          readyLabel="control plane live"
          idleLabel="health unknown"
          className="w-full justify-center sm:w-auto"
        />
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full border-black/10 bg-white text-black hover:bg-[#f3f3f4] sm:w-auto"
          disabled={!canRefresh || inventoryLoading}
          onClick={onRefresh}
        >
          {inventoryLoading ? (
            <RefreshCcw className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}
          Refresh
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full border-black/10 bg-white text-black hover:bg-[#f3f3f4] sm:w-auto"
          onClick={() => onSelectTab("rollback")}
        >
          <RotateCcw className="size-4" />
          Rollback
        </Button>
      </div>
    </header>
  );
}
