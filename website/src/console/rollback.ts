// WHEN THE ROLL BACK BUTTON IS ARMED.
//
// Rolling a patch back withdraws it from every device and cannot be undone from the console, so the
// button arms only when every one of these holds, checked in this order (the first that fails is the
// reason shown):
//
//   1. a patch is chosen;
//   2. it is one of THIS app's patches -- the list the console loaded for the open app, so a patch id
//      pasted from another app (or another tab's URL) cannot be withdrawn from here;
//   3. it is still live;
//   4. its device health has loaded, for this exact patch -- the operator sees what devices reported
//      before deciding;
//   5. the operator typed the exact patch id.
//
// Pure: the page passes what it knows and renders what comes back.

import type { Patch } from "./model";

export type RollbackGuardInput = {
  appId: string;
  appName: string;
  /** The patch id being considered (from the picker or the URL). */
  target: string;
  /** What the operator typed into the confirmation field. */
  confirmation: string;
  /** The open app's patches, as loaded for it. */
  appPatches: Patch[];
  /** Patch health: which patch it was loaded for, and its state. */
  health: { status: "idle" | "loading" | "ready" | "error"; patchId: string };
  signedIn: boolean;
  /** A rollback request is already in flight. */
  submitting: boolean;
};

export type RollbackGuard = {
  armed: boolean;
  /** Why it is not armed; "" when armed. */
  reason: string;
  /** "error" when something is wrong with the choice itself, "info" when a step is simply not done yet. */
  tone: "info" | "error";
  patch: Patch | null;
};

export function rollbackGuard(input: RollbackGuardInput): RollbackGuard {
  const target = input.target.trim();
  const patch = input.appPatches.find((p) => p.id === target) ?? null;
  const blocked = (reason: string, tone: RollbackGuard["tone"] = "info"): RollbackGuard => ({
    armed: false,
    reason,
    tone,
    patch,
  });

  if (!input.signedIn) return blocked("Sign in to roll back a patch.");
  if (!target) return blocked("Choose a patch first.");
  if (!patch) return blocked(`${target} is not one of ${input.appName || input.appId}'s patches.`, "error");
  if (patch.rolledBack) return blocked(`Patch #${patch.number} is already rolled back.`);
  if (input.health.patchId !== target || input.health.status === "idle") {
    return blocked("Loading what devices reported about this patch…");
  }
  if (input.health.status === "loading") return blocked("Loading what devices reported about this patch…");
  if (input.health.status === "error") {
    return blocked("Device reports for this patch could not be loaded. Refresh and try again.", "error");
  }
  if (input.confirmation.trim() !== target) return blocked("Type the patch id to confirm.");
  if (input.submitting) return blocked("Rolling back…");
  return { armed: true, reason: "", tone: "info", patch };
}
