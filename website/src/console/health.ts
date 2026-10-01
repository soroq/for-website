// PATCH HEALTH, AS DEVICES REPORTED IT. Pure rules and one palette, shared by every console screen.

import type { PatchDeliveryRow } from "@/operator/analytics";

export type Health = "failing" | "healthy" | "silent" | "rolledBack";

// One palette for health, used by the timeline, the table and the details panel alike.
export const HEALTH: Record<Health, { label: string; block: string; dot: string; text: string }> = {
  failing: { label: "Failing on devices", block: "bg-[#c0392b] text-white border-[#c0392b]", dot: "bg-[#c0392b]", text: "text-[#8f2a20]" },
  healthy: { label: "Healthy", block: "bg-[#2f7d4f] text-white border-[#2f7d4f]", dot: "bg-[#2f7d4f]", text: "text-[#23603c]" },
  silent: { label: "No reports yet", block: "bg-[#f1f1f3] text-[#6d6d72] border-[#dcdce0]", dot: "bg-[#c4c4ca]", text: "text-[#6d6d72]" },
  rolledBack: { label: "Rolled back", block: "bg-white text-[#9a9aa1] border-[#c4c4ca] border-dashed line-through", dot: "bg-white border border-[#9a9aa1]", text: "text-[#6d6d72]" },
};

export const REASON_EXPLAINED: Record<string, string> = {
  crash_before_first_frame: "The patched app died before it could show anything. Those devices went back to their last good code on their own.",
  crash_after_launch: "The patched app ran, then crashed. The patch stays active on those devices (Android 11+ reports this).",
  anr_after_launch: "The patched app ran, then stopped responding. The patch stays active on those devices.",
  signature_refused: "The device rejected the download because it was not signed by a key the app trusts. It never ran.",
  hash_mismatch: "The download did not match what was published (corrupt or tampered). It never ran.",
  activation_failed: "The patch was downloaded but could not be switched on.",
  patch_rejected: "The device refused the patch as invalid for this app build.",
  patch_missing: "The patch was scheduled but missing on the device at launch.",
  launch_failed: "The app reported the launch as failed.",
  unspecified: "Reported by an older app build that does not send a reason.",
};

export function healthOf(row: PatchDeliveryRow): Health {
  if (row.rolledBack) return "rolledBack";
  if (row.failedDevices > 0) return "failing";
  if (!row.observed || row.successfulDevices + row.failedDevices === 0) return "silent";
  return "healthy";
}

export function rate(ok: number, failed: number): number | null {
  return ok + failed ? ok / (ok + failed) : null;
}

export function pct(value: number | null): string {
  if (value === null) return "—";
  const p = value * 100;
  return `${Number.isInteger(p) ? p : p.toFixed(1)}%`;
}
