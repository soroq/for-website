import type { ComponentType } from "react";

export type ApiState<T> = {
  status: "idle" | "loading" | "ready" | "error";
  data: T | null;
  error: string | null;
  receivedAt?: string;
};

export type FirebaseConfigResponse = {
  firebase: Record<string, string>;
  provider?: string;
};

export type FirebaseAuthUser = {
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  refreshToken?: string | null;
  getIdToken: () => Promise<string>;
};

export type OperatorProfile = {
  email: string;
  is_admin?: boolean;
  ok: boolean;
};

export type JsonRecord = Record<string, unknown>;
export type FirebaseNamespace = any;

export type OperatorTab =
  | "overview"
  | "ownership"
  | "developer"
  | "billing"
  | "trust"
  | "patches"
  | "releases"
  | "health"
  | "rollback";

export type OperatorTabDefinition = {
  key: OperatorTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export type ConsoleStat = {
  label: string;
  value: string;
  helper: string;
};

export type ConsoleValueRow = {
  label: string;
  value: string;
};
