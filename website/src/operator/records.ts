import type { JsonRecord } from "./types";

export function getRecordValue(
  record: JsonRecord | null | undefined,
  keys: string[],
) {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

export function formatMetric(value: unknown, fallback = "0") {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : fallback;
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return fallback;
}

export function formatReceivedAt(value?: string) {
  if (!value) {
    return "not checked";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function formatRecordText(
  record: JsonRecord | null | undefined,
  keys: string[],
  fallback = "unknown",
) {
  const value = getRecordValue(record, keys);
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

export function recordId(record: JsonRecord | null | undefined) {
  return formatRecordText(record, ["id", "patch_id", "release_id", "app_id"], "");
}

export function recordFlag(record: JsonRecord | null | undefined, keys: string[]) {
  const value = getRecordValue(record, keys);
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return ["true", "yes", "1", "rolled_back"].includes(value.trim().toLowerCase());
  }
  return false;
}

export function apiList(data: JsonRecord[] | null) {
  return Array.isArray(data) ? data : [];
}

export function mergeRecords(
  primary: JsonRecord | null | undefined,
  secondary: JsonRecord | null | undefined,
) {
  if (!primary && !secondary) {
    return null;
  }

  return { ...(secondary ?? {}), ...(primary ?? {}) };
}

export function nestedRecord(record: JsonRecord | null | undefined, key: string) {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export function nestedRecords(record: JsonRecord | null | undefined, key: string) {
  const value = record?.[key];
  return Array.isArray(value) ? (value.filter(Boolean) as JsonRecord[]) : [];
}

export function operatorPath(path: string, filters: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(filters)) {
    const value = rawValue.trim();
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function collectRecentClients(record: JsonRecord | null) {
  const candidates = getRecordValue(record, [
    "recent_clients",
    "client_ids",
    "failed_client_ids",
    "clients",
  ]);

  if (!Array.isArray(candidates)) {
    return [];
  }

  return candidates
    .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
    .slice(0, 6);
}

export function shortRecord(value: string) {
  if (!value) {
    return "";
  }

  return value.length > 14 ? `${value.slice(0, 10)}...` : value;
}
