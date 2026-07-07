import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getFirebaseAuth,
  signInWithGoogle,
  signOut,
  type FirebaseAuthUser,
} from "./firebase";

type LoginParams = {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  api: string;
  emailHint: string;
};

function readParams(): LoginParams {
  const q = new URLSearchParams(window.location.search);
  return {
    redirectUri: q.get("redirect_uri") || "",
    state: q.get("state") || "",
    codeChallenge: q.get("code_challenge") || "",
    codeChallengeMethod: q.get("code_challenge_method") || "S256",
    api: q.get("api") || "",
    emailHint: (q.get("email_hint") || "").trim(),
  };
}

// Defense-in-depth: only loopback redirect targets are allowed (the backend
// enforces the same rule). Returns null for anything that is not a plain
// http://127.0.0.1 or http://localhost URL.
function parseLoopbackRedirect(raw: string): URL | null {
  if (!raw) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:") {
    return null;
  }
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    return null;
  }
  return url;
}

function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
}

type Phase = "loading" | "signed_out" | "signed_in" | "authorizing" | "redirecting";

export function CliLogin() {
  const params = useMemo(readParams, []);
  const redirect = useMemo(() => parseLoopbackRedirect(params.redirectUri), [params.redirectUri]);
  const apiLabel = params.api || "https://api.soroq.dev";

  const [phase, setPhase] = useState<Phase>("loading");
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getFirebaseAuth()
      .then((auth) => {
        if (!active) {
          return;
        }
        auth.onAuthStateChanged((next: FirebaseAuthUser | null) => {
          if (!active) {
            return;
          }
          setUser(next && next.email ? next : null);
          setPhase((prev) =>
            prev === "authorizing" || prev === "redirecting"
              ? prev
              : next && next.email
                ? "signed_in"
                : "signed_out",
          );
        });
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not initialize sign-in.");
          setPhase("signed_out");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const redirectBack = useCallback(
    (extra: Record<string, string>) => {
      if (!redirect) {
        return;
      }
      const target = new URL(redirect.toString());
      if (params.state) {
        target.searchParams.set("state", params.state);
      }
      for (const [key, value] of Object.entries(extra)) {
        target.searchParams.set(key, value);
      }
      setPhase("redirecting");
      window.location.assign(target.toString());
    },
    [redirect, params.state],
  );

  const handleSignIn = useCallback(async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    }
  }, []);

  const handleSwitchAccount = useCallback(async () => {
    setError(null);
    try {
      await signOut();
    } catch {
      // Ignore; onAuthStateChanged will reflect the result.
    }
  }, []);

  const handleContinue = useCallback(async () => {
    if (!user || !redirect) {
      return;
    }
    setError(null);
    setPhase("authorizing");
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/cli/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          code_challenge: params.codeChallenge,
          code_challenge_method: params.codeChallengeMethod,
          state: params.state,
          redirect_uri: params.redirectUri,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
        detail?: string;
      };
      if (!response.ok || !payload.code) {
        const message =
          payload.error || payload.detail || `Authorization failed (HTTP ${response.status}).`;
        setError(message);
        setPhase("signed_in");
        return;
      }
      redirectBack({ code: payload.code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed.");
      setPhase("signed_in");
    }
  }, [user, redirect, params, redirectBack]);

  const handleCancel = useCallback(() => {
    if (redirect) {
      redirectBack({ error: "access_denied" });
    } else {
      window.location.assign("/");
    }
  }, [redirect, redirectBack]);

  const mismatch =
    user && params.emailHint && !sameEmail(user.email, params.emailHint) ? true : false;

  return (
    <main className="min-h-screen w-full surface-grid flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-card p-8">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="Soroq" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Soroq CLI login</h1>
            <p className="text-sm text-muted-foreground">Authorize the command-line tool</p>
          </div>
        </div>

        {!redirect ? (
          <div className="mt-8 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive">This login link is invalid.</p>
            <p className="mt-1 text-muted-foreground">
              The CLI must send a local <code className="font-mono">redirect_uri</code> pointing at{" "}
              <code className="font-mono">http://127.0.0.1</code> or{" "}
              <code className="font-mono">http://localhost</code>. Re-run{" "}
              <code className="font-mono">soroq login</code> from your terminal.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-4 text-sm">
              <p className="text-muted-foreground">You are authorizing</p>
              <p className="mt-1 font-medium">The Soroq CLI</p>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <dt>API environment</dt>
                  <dd className="font-mono text-foreground truncate">{apiLabel}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Returns to</dt>
                  <dd className="font-mono text-foreground truncate">{redirect.origin}</dd>
                </div>
              </dl>
            </div>

            {phase === "loading" ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading sign-in…</p>
            ) : !user ? (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground">
                  Sign in with your Soroq operator account to continue.
                  {params.emailHint ? (
                    <>
                      {" "}
                      The CLI requested{" "}
                      <span className="font-medium text-foreground">{params.emailHint}</span>.
                    </>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground focus-ring hover:opacity-90"
                >
                  Continue with Google
                </button>
              </div>
            ) : (
              <div className="mt-6">
                {mismatch ? (
                  <div className="mb-4 rounded-xl border border-warning/50 bg-warning/20 p-3 text-sm">
                    <p className="font-medium text-warning-foreground">
                      You are signed in as {user.email}, not the requested {params.emailHint}.
                    </p>
                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="mt-2 text-xs font-medium underline underline-offset-2"
                    >
                      Switch account
                    </button>
                  </div>
                ) : null}

                <p className="text-sm text-muted-foreground">Continue as</p>
                <p className="mt-0.5 font-medium">{user.email}</p>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={phase === "authorizing" || phase === "redirecting"}
                    className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground focus-ring hover:opacity-90 disabled:opacity-60"
                  >
                    {phase === "authorizing" || phase === "redirecting" ? "Authorizing…" : "Continue"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={phase === "authorizing" || phase === "redirecting"}
                    className="flex-1 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium focus-ring hover:bg-secondary disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>

                {!mismatch ? (
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="mt-3 text-xs text-muted-foreground underline underline-offset-2"
                  >
                    Use a different account
                  </button>
                ) : null}
              </div>
            )}

            {error ? (
              <p className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
