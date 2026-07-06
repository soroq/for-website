import { LogIn, LogOut } from "lucide-react";

import { SoroqMark } from "@/components/SoroqMark";
import { Button } from "@/components/ui/button";
import { operatorTabs } from "../config";
import type { ApiState, OperatorProfile, OperatorTab } from "../types";

export function OperatorSidebar({
  operatorTab,
  operatorEmail,
  operatorState,
  signedIn,
  configReady,
  onSelectTab,
  onSignIn,
  onSignOut,
}: {
  operatorTab: OperatorTab;
  operatorEmail: string;
  operatorState: ApiState<OperatorProfile>;
  signedIn: boolean;
  configReady: boolean;
  onSelectTab: (tab: OperatorTab) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="operator-sidebar flex min-w-0 flex-col overflow-hidden border-b border-black/10 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0">
      <a href="/" className="flex items-center gap-3">
        <SoroqMark className="size-8" textClassName="text-xs" />
        <div>
          <p className="text-sm font-semibold tracking-tight">Soroq</p>
          <p className="text-xs text-[#7a7a80]">Control plane</p>
        </div>
      </a>

      <nav
        className="mt-5 flex min-w-0 gap-2 overflow-x-auto pb-1 lg:mt-7 lg:grid lg:gap-1 lg:overflow-visible lg:pb-0"
        aria-label="Operator navigation"
      >
        {operatorTabs.map(({ key, label, icon: Icon }) => {
          const active = operatorTab === key;
          return (
            <button
              key={key}
              type="button"
              className={`focus-ring flex shrink-0 items-center gap-3 border px-3 py-2.5 text-left text-sm font-medium transition lg:shrink ${
                active
                  ? "border-black bg-black text-white shadow-sm"
                  : "border-transparent text-[#5f6066] hover:border-black/10 hover:bg-[#f4f4f5] hover:text-black"
              }`}
              onClick={() => onSelectTab(key)}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="operator-panel-soft mt-5 hidden p-3 lg:mt-auto lg:block">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-black/10 bg-black text-xs font-semibold text-white">
            {(operatorEmail || "SO").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {operatorState.data?.email ? "Verified operator" : "Operator"}
            </p>
            <p className="truncate text-xs text-[#7a7a80]">{operatorEmail}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {signedIn ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 rounded-xl border-black/10 bg-white text-black hover:bg-[#f4f4f5]"
              onClick={onSignOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          ) : (
            <Button
              type="button"
              className="h-9 flex-1 rounded-xl bg-black text-white hover:bg-[#2b2b2d]"
              disabled={!configReady}
              onClick={onSignIn}
            >
              <LogIn className="size-4" />
              Sign in
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
