import type { ReactNode } from "react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoroqMark } from "@/components/SoroqMark";
import { StateNotice } from "@/operator/components/ConsolePrimitives";
import type { OperatorAuth } from "../useOperatorAuth";

function Frame({ children }: { children: ReactNode }) {
  return (
    <main className="operator-backdrop grid min-h-screen place-items-center overflow-x-hidden px-4 py-10 text-[#111111]">
      <section className="operator-panel w-full max-w-md p-6 sm:p-8">
        <a href="/" className="focus-ring inline-flex items-center gap-3" aria-label="Back to soroq.dev home">
          <SoroqMark className="size-9" />
          <span>
            <span className="block text-sm font-semibold tracking-tight">Soroq</span>
            <span className="block text-xs text-[#7a7a80]">Operator console</span>
          </span>
        </a>
        {children}
      </section>
    </main>
  );
}

/** Shown while Firebase restores a session, so a returning operator never sees the sign-in screen flash. */
export function CheckingSession() {
  return (
    <Frame>
      <p className="mt-6 flex items-center gap-2 text-sm text-[#6d6d72]">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Checking your session…
      </p>
    </Frame>
  );
}

export function SignInScreen({ auth }: { auth: OperatorAuth }) {
  return (
    <Frame>
      <h1 className="mt-6 text-xl font-semibold tracking-[-0.02em]">Sign in to the operator console</h1>
      <p className="mt-2 text-sm leading-6 text-[#6d6d72]">
        See how your updates are doing on real devices, find the one that broke something, and roll it back.
      </p>

      {auth.cliLoginPending ? (
        <div className="mt-4">
          <StateNotice tone="warning" message="CLI login in progress. Sign in here to return the session to your terminal." />
        </div>
      ) : null}

      <Button
        type="button"
        className="focus-ring mt-6 h-10 w-full bg-black px-5 text-white hover:bg-[#2b2b2d]"
        disabled={!auth.configReady}
        onClick={() => void auth.signIn()}
      >
        {auth.configLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogIn className="size-4" aria-hidden="true" />}
        {auth.configLoading ? "Preparing sign-in…" : "Sign in with Google"}
      </Button>

      <div className="mt-4 grid gap-2">
        {auth.localPreview ? <StateNotice tone="warning" message="Local preview: hosted sign-in runs on the Vercel URL." /> : null}
        {auth.configProblem ? <StateNotice tone="error" message={auth.configProblem} /> : null}
        {auth.authError ? <StateNotice tone="error" message={auth.authError} /> : null}
      </div>

      <p className="mt-6 border-t border-black/10 pt-4 text-sm text-[#6d6d72]">
        Prefer the terminal? See the{" "}
        <a href="https://docs.soroq.dev/cli" className="focus-ring font-medium text-black underline underline-offset-4 hover:text-[#2b2b2d]">
          CLI &amp; browser-login docs
        </a>
        .
      </p>
    </Frame>
  );
}
