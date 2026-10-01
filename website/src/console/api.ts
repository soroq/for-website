// THE CONTROL PLANE, AS THE CONSOLE CALLS IT.
//
// Every request the console makes goes through here: one place that attaches the operator's token,
// turns an error response into a readable message, and lets a caller cancel a request it no longer
// needs. The endpoints are the hosted proxy's (/api/operator/*), which check the operator's Firebase
// session before forwarding to the control plane.

import type { FirebaseConfigResponse, JsonRecord, OperatorProfile } from "@/operator/types";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isAbortError(error: unknown): boolean {
  // A fetch abort rejects with a DOMException named "AbortError", which is not reliably an Error
  // subclass in every browser: match on the name.
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

export function extractApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as JsonRecord;
  const message = typeof record.error === "string" ? record.error : null;
  const detail = typeof record.detail === "string" ? record.detail : null;
  if (message && detail) return `${message} ${detail}`;
  return message || detail;
}

export async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`The server answered HTTP ${response.status} with something other than JSON.`);
    }
  }
  if (!response.ok) {
    throw new Error(extractApiError(payload) || `Request failed with HTTP ${response.status}`);
  }
  return payload as T;
}

export async function fetchFirebaseConfig(): Promise<FirebaseConfigResponse> {
  const response = await fetch("/api/operator/firebase-config", { headers: { Accept: "application/json" } });
  return readApiJson<FirebaseConfigResponse>(response);
}

/** A fresh ID token for the signed-in operator, or null when nobody is signed in. */
export type TokenSource = () => Promise<string | null>;

function query(params: Record<string, string>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value.trim()) search.set(key, value.trim());
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function createOperatorApi(getToken: TokenSource) {
  async function call<T>(path: string, init: { method?: "GET" | "POST"; signal?: AbortSignal; token?: string } = {}): Promise<T> {
    const token = init.token ?? (await getToken());
    if (!token) throw new Error("Sign in as an operator before calling the control plane.");
    const response = await fetch(path, {
      method: init.method ?? "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: init.signal,
    });
    return readApiJson<T>(response);
  }

  return {
    /** Called with the token from sign-in itself, before the session is stored. */
    me: (token: string) => call<OperatorProfile>("/api/operator/me", { token }),
    healthz: (signal?: AbortSignal) => call<JsonRecord>("/api/operator/healthz", { signal }),
    productReadiness: (signal?: AbortSignal) => call<JsonRecord>("/api/operator/product-readiness", { signal }),
    apps: (signal?: AbortSignal) => call<unknown>("/api/operator/apps", { signal }),
    /** Every release the operator can see (all apps), so the console knows each app's platforms. */
    releases: (signal?: AbortSignal) => call<unknown>("/api/operator/releases", { signal }),
    patches: (appId: string, signal?: AbortSignal) =>
      call<unknown>(`/api/operator/patches${query({ app_id: appId })}`, { signal }),
    analytics: (appId: string, signal?: AbortSignal) =>
      call<JsonRecord>(`/api/operator/analytics${query({ app_id: appId })}`, { signal }),
    patchHealth: (patchId: string, signal?: AbortSignal) =>
      call<JsonRecord>(`/api/operator/patch-health${query({ patch_id: patchId })}`, { signal }),
    rollback: (patchId: string) =>
      call<JsonRecord>(`/api/operator/rollback${query({ patch_id: patchId })}`, { method: "POST" }),
  };
}

export type OperatorApi = ReturnType<typeof createOperatorApi>;
