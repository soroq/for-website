import { GitBranch, LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { shortRecord } from "../records";

export type ScopeFact = {
  label: string;
  value: string;
};

export function OperatorCommandCenter({
  commandState,
  latestPatchId,
  scopeFacts,
  signedIn,
  configReady,
  githubSignInEnabled,
  onSignIn,
  onGithubSignIn,
  onSignOut,
}: {
  commandState: string;
  latestPatchId: string;
  scopeFacts: ScopeFact[];
  signedIn: boolean;
  configReady: boolean;
  githubSignInEnabled: boolean;
  onSignIn: () => void;
  onGithubSignIn: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="operator-command-card operator-control-strip mb-3 p-4 md:p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="relative z-10 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-[#17181b] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#f7f8f8]">
              {commandState}
            </span>
            <span className="rounded-full border border-white/10 bg-[#0e0f11] px-2.5 py-1 font-mono text-[0.65rem] text-[#8a8f98]">
              {latestPatchId ? shortRecord(latestPatchId) : "no patch selected"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#f7f8f8]">
            Patch management
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#8a8f98]">
            Releases, patches, health, and rollback in one scoped view.
          </p>
        </div>

        <div className="relative z-10 grid gap-2 sm:flex sm:flex-wrap">
          {!signedIn ? (
            <>
              <Button
                type="button"
                className="h-9 bg-black px-4 text-white hover:bg-[#2b2b2d]"
                disabled={!configReady}
                onClick={onSignIn}
              >
                <LogIn className="size-4" />
                Google
              </Button>
              {githubSignInEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-white/10 bg-[#0e0f11] px-4 text-[#f7f8f8] hover:bg-[#17181b]"
                  disabled={!configReady}
                  onClick={onGithubSignIn}
                >
                  <GitBranch className="size-4" />
                  GitHub
                </Button>
              ) : null}
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-9 border-white/10 bg-[#0e0f11] px-4 text-[#f7f8f8] hover:bg-[#17181b]"
              onClick={onSignOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 xl:grid-cols-4">
        {scopeFacts.map((fact) => (
          <div
            key={fact.label}
            className="min-w-0"
          >
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.13em] text-[#82858d]">
              {fact.label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[#f7f8f8]">
              {fact.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
