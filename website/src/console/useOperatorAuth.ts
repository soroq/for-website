// THE OPERATOR'S SESSION.
//
// Firebase signs the operator in (Google); the hosted proxy's /me then says whether that account is an
// enabled operator. The console is "signed in" only once both have answered. When the page was opened by
// `soroq login` (cli_login_callback + cli_login_state in the URL), the session is also handed to the CLI's
// loopback listener, exactly once.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ApiState,
  FirebaseAuthUser,
  FirebaseConfigResponse,
  FirebaseNamespace,
  OperatorProfile,
} from "@/operator/types";
import { createOperatorApi, errorMessage, fetchFirebaseConfig } from "./api";
import { idleState } from "./useResource";

declare global {
  interface Window {
    firebase?: FirebaseNamespace;
  }
}

const FIREBASE_SCRIPTS = [
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth-compat.js",
] as const;

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = scriptLoads.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (current?.dataset.ready === "true") {
      resolve();
      return;
    }
    const script = current || document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.ready = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    if (!current) document.head.appendChild(script);
  });
  scriptLoads.set(src, promise);
  return promise;
}

async function loadFirebase(): Promise<FirebaseNamespace> {
  for (const src of FIREBASE_SCRIPTS) await loadScript(src);
  if (!window.firebase) throw new Error("Firebase browser SDK did not initialize.");
  return window.firebase;
}

function readCliLogin() {
  const params = new URLSearchParams(window.location.search);
  return { callback: params.get("cli_login_callback") || "", state: params.get("cli_login_state") || "" };
}

async function deliverCliLogin(user: FirebaseAuthUser, token: string, config: FirebaseConfigResponse) {
  const { callback, state } = readCliLogin();
  if (!callback || !state) return;
  const url = new URL(callback);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("CLI login callback must target local loopback HTTP.");
  }
  const response = await fetch(url.toString(), {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state,
      idToken: token,
      refreshToken: user.refreshToken || "",
      email: user.email || "",
      apiKey: config.firebase.apiKey || "",
      projectId: config.firebase.projectId || "",
    }),
  });
  if (!response.ok) throw new Error(`CLI login callback returned HTTP ${response.status}.`);
  const params = new URLSearchParams(window.location.search);
  params.delete("cli_login_callback");
  params.delete("cli_login_state");
  const rest = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
}

export function useOperatorAuth() {
  const [config, setConfig] = useState<ApiState<FirebaseConfigResponse>>(idleState);
  const [profile, setProfile] = useState<ApiState<OperatorProfile>>(idleState);
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  // False until Firebase has said whether a session exists, so a returning operator does not see the
  // sign-in screen flash before their session is restored.
  const [resolved, setResolved] = useState(false);
  const userRef = useRef<FirebaseAuthUser | null>(null);
  const cliDelivered = useRef(false);
  const [cliLoginPending] = useState(() => {
    const { callback, state } = readCliLogin();
    return Boolean(callback && state);
  });

  const getToken = useCallback(async () => (userRef.current ? userRef.current.getIdToken() : null), []);
  const api = useMemo(() => createOperatorApi(getToken), [getToken]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      setConfig({ status: "loading", data: null, error: null });
      let firebaseConfig: FirebaseConfigResponse;
      try {
        firebaseConfig = await fetchFirebaseConfig();
        if (cancelled) return;
        setConfig({ status: "ready", data: firebaseConfig, error: null, receivedAt: new Date().toISOString() });
      } catch (error) {
        if (!cancelled) {
          setConfig({ status: "error", data: null, error: errorMessage(error) });
          setResolved(true);
        }
        return;
      }
      try {
        const firebase = await loadFirebase();
        if (!firebase.apps?.length) firebase.initializeApp(firebaseConfig.firebase);
        const auth = firebase.auth();
        if (typeof auth.getRedirectResult === "function") {
          try {
            await auth.getRedirectResult();
          } catch (error) {
            if (!cancelled) setAuthError(errorMessage(error));
          }
        }
        const maybeUnsubscribe = auth.onAuthStateChanged(async (next: FirebaseAuthUser | null) => {
          if (cancelled) return;
          setResolved(true);
          userRef.current = next;
          setUser(next);
          setAuthError(null);
          if (!next) {
            setProfile(idleState());
            return;
          }
          setProfile({ status: "loading", data: null, error: null });
          try {
            const token = await next.getIdToken();
            const me = await api.me(token);
            if (cancelled) return;
            setProfile({ status: "ready", data: me, error: null, receivedAt: new Date().toISOString() });
            if (!cliDelivered.current) {
              cliDelivered.current = true;
              await deliverCliLogin(next, token, firebaseConfig);
            }
          } catch (error) {
            if (!cancelled) setProfile({ status: "error", data: null, error: errorMessage(error) });
          }
        });
        if (typeof maybeUnsubscribe === "function") unsubscribe = maybeUnsubscribe;
      } catch (error) {
        if (!cancelled) {
          setAuthError(errorMessage(error));
          setResolved(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [api]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    try {
      if (config.status !== "ready") throw new Error("Sign-in is not ready yet.");
      const firebase = await loadFirebase();
      const provider = new firebase.auth.GoogleAuthProvider();
      if (typeof provider.setCustomParameters === "function") provider.setCustomParameters({ prompt: "select_account" });
      try {
        await firebase.auth().signInWithPopup(provider);
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "";
        if (["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(code)) {
          await firebase.auth().signInWithRedirect(provider);
          return;
        }
        throw error;
      }
    } catch (error) {
      setAuthError(errorMessage(error));
    }
  }, [config.status]);

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      await window.firebase?.auth().signOut();
    } catch (error) {
      setAuthError(errorMessage(error));
    }
  }, []);

  const configReady = config.status === "ready" && Boolean(config.data?.firebase?.apiKey && config.data?.firebase?.projectId);
  const isLocal = ["127.0.0.1", "localhost"].includes(window.location.hostname);
  const localPreview = isLocal && config.status === "error" && (config.error ?? "").toLowerCase().includes("http 404");
  const configProblem = localPreview
    ? ""
    : config.status === "error"
      ? `Sign-in is not configured: ${config.error}`
      : config.status === "ready" && !configReady
        ? "Sign-in is not configured: the Firebase public config is missing apiKey or projectId."
        : "";

  return {
    api,
    user,
    profile,
    signedIn: Boolean(user) && profile.status === "ready",
    /** Still finding out whether there is a session (or still asking /me about it). */
    checking: !resolved || (Boolean(user) && profile.status === "loading"),
    email: profile.data?.email || user?.email || "",
    isAdmin: Boolean(profile.data?.is_admin),
    configReady,
    configLoading: config.status === "idle" || config.status === "loading",
    configProblem,
    localPreview,
    authError: authError || profile.error || "",
    cliLoginPending,
    signIn,
    signOut,
  };
}

export type OperatorAuth = ReturnType<typeof useOperatorAuth>;
