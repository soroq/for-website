import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateNotice } from "@/operator/components/ConsolePrimitives";
import { PatchHealthPanel } from "@/operator/components/ConsoleShell";
import type { ApiState, JsonRecord } from "@/operator/types";
import { formatCount, formatDateTime, patchKindLabel, platformName } from "../model";
import { rollbackGuard } from "../rollback";
import type { PatchRow } from "./PatchesPage";

function identityOf(row: PatchRow | null, patchId: string) {
  if (!row) return [{ label: "Patch id", value: patchId }];
  const { patch } = row;
  return [
    { label: "Patch id", value: patch.id },
    { label: "Patch number", value: `#${patch.number}` },
    { label: "Version", value: `${row.version} · ${platformName(row.platform, row.platformRaw)}` },
    { label: "Release", value: patch.releaseId },
    { label: "Channel", value: patch.channel + (patch.rolloutPercent < 100 ? ` · ${patch.rolloutPercent}% rollout` : "") },
    { label: "Kind", value: patchKindLabel(patch.kind) },
    { label: "Runtime", value: patch.runtimeId || "Not recorded" },
    { label: "Published", value: formatDateTime(patch.createdAt) },
  ];
}

/** One patch: what devices reported about it, and what it is. */
export function PatchDetailPage({
  patchId,
  row,
  health,
  onRollback,
  onOpenDeviceHealth,
}: {
  patchId: string;
  row: PatchRow | null;
  health: ApiState<JsonRecord>;
  onRollback: () => void;
  onOpenDeviceHealth: () => void;
}) {
  return (
    <div className="grid gap-4">
      {patchId && !row ? <StateNotice tone="warning" message={`${patchId} is not one of this app's patches.`} /> : null}
      <PatchHealthPanel
        patchId={patchId}
        delivery={row?.delivery ?? null}
        identity={identityOf(row, patchId)}
        loading={health.status === "loading" && !health.data}
        error={health.error ?? ""}
        raw={health.data}
        onRollback={onRollback}
        onOpenDeviceHealth={onOpenDeviceHealth}
      />
    </div>
  );
}

/** Withdraw a live patch from every device. Armed only by the rollback guard (see rollback.ts). */
export function RollbackPage({
  appId,
  appName,
  patchId,
  rows,
  health,
  healthFor,
  rollbackState,
  signedIn,
  onChoose,
  onRollback,
}: {
  appId: string;
  appName: string;
  patchId: string;
  rows: PatchRow[];
  health: ApiState<JsonRecord>;
  healthFor: string;
  rollbackState: ApiState<JsonRecord>;
  signedIn: boolean;
  onChoose: (patchId: string) => void;
  onRollback: (patchId: string) => Promise<boolean>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [done, setDone] = useState<{ patchId: string; number: number } | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // A different patch starts over.
  useEffect(() => {
    setConfirmation("");
    setDialogOpen(false);
    setDone((prev) => (prev?.patchId === patchId ? prev : null));
  }, [patchId]);

  useEffect(() => {
    if (!dialogOpen) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialogOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen]);

  const guard = rollbackGuard({
    appId,
    appName,
    target: patchId,
    confirmation,
    appPatches: rows.map((r) => r.patch),
    health: { status: health.status, patchId: healthFor },
    signedIn,
    submitting: rollbackState.status === "loading",
  });
  const chosen = rows.find((r) => r.patch.id === patchId) ?? null;

  // Live patches, failing ones first, then newest.
  const choices = rows
    .filter((r) => !r.patch.rolledBack)
    .sort((a, b) => Number(b.health === "failing") - Number(a.health === "failing") || b.patch.createdAt - a.patch.createdAt);

  async function submit() {
    setDialogOpen(false);
    if (!guard.armed || !guard.patch) return;
    const number = guard.patch.number;
    const id = guard.patch.id;
    if (await onRollback(id)) {
      setDone({ patchId: id, number });
      setConfirmation("");
    }
  }

  return (
    <div className="grid gap-4">
      {done ? (
        <div className="flex items-start gap-3 rounded-lg border border-[#2f7d4f]/30 bg-[#f2f8f4] px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#2f7d4f]" />
          <div>
            <p className="text-sm font-semibold text-[#23603c]">Patch #{done.number} is rolled back</p>
            <p className="mt-0.5 text-sm text-[#4d4d52]">Devices stop receiving it and return to the previous version on their next launch.</p>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="text-base font-semibold">Withdraw a patch from every device</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6d6d72]">
          Devices stop receiving it and return to the previous good version on their next launch. This cannot be undone
          from the console. Pick the patch, check what devices reported, then type its id to confirm.
        </p>

        <label className="mt-5 grid max-w-2xl gap-1 text-xs text-[#6d6d72]">
          Patch
          <select
            value={patchId}
            onChange={(event) => onChoose(event.target.value)}
            className="focus-ring h-9 rounded-md border border-black/10 bg-white px-2.5 text-sm text-black"
          >
            <option value="">Choose a live patch…</option>
            {patchId && !choices.some((c) => c.patch.id === patchId) ? (
              <option value={patchId}>{chosen ? `#${chosen.patch.number} on ${chosen.version} (rolled back)` : patchId}</option>
            ) : null}
            {choices.map((c) => (
              <option key={c.patch.id} value={c.patch.id}>
                #{c.patch.number} on {c.version} · {platformName(c.platform, c.platformRaw)}
                {c.health === "failing" && c.delivery ? ` · failing on ${formatCount(c.delivery.failedDevices)}` : ""}
                {c.health === "healthy" && c.delivery ? ` · ${formatCount(c.delivery.successfulDevices)} booted` : ""}
              </option>
            ))}
          </select>
        </label>

        {chosen ? (
          <dl className="mt-4 grid max-w-2xl gap-px overflow-hidden rounded-md border border-black/10 bg-black/[0.06] sm:grid-cols-3">
            {[
              ["Patch", `#${chosen.patch.number} on ${chosen.version}`],
              ["Devices booted", chosen.delivery?.observed ? formatCount(chosen.delivery.successfulDevices) : "No reports"],
              ["Devices failing", chosen.delivery?.observed ? formatCount(chosen.delivery.failedDevices) : "No reports"],
            ].map(([label, value]) => (
              <div key={label} className="bg-white px-3 py-2">
                <dt className="text-xs text-[#6d6d72]">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-4 grid max-w-2xl gap-3">
          <label className="grid gap-1 text-xs text-[#6d6d72]">
            Confirm
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={patchId ? `Type ${patchId}` : "Choose a patch first"}
              disabled={!patchId || Boolean(chosen?.patch.rolledBack)}
              spellCheck={false}
              autoComplete="off"
              className="focus-ring h-9 w-full rounded-md border border-black/10 bg-white px-3 font-mono text-sm text-black outline-none placeholder:text-[#9a9aa1] disabled:bg-[#f7f7f8]"
            />
          </label>
          {guard.reason && patchId ? (
            <p className={`text-sm ${guard.tone === "error" ? "text-[#8f2a20]" : "text-[#6d6d72]"}`}>{guard.reason}</p>
          ) : null}
          {rollbackState.error ? <StateNotice tone="error" message={`Rollback failed: ${rollbackState.error}`} /> : null}
          <div>
            <Button
              type="button"
              className="h-9 bg-[#c0392b] px-5 text-white hover:bg-[#a53125] disabled:bg-[#e9e9eb] disabled:text-[#8d8d93]"
              disabled={!guard.armed}
              onClick={() => setDialogOpen(true)}
            >
              {rollbackState.status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Roll back
            </Button>
          </div>
        </div>
      </section>

      {dialogOpen && guard.patch ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setDialogOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rollback-dialog-title"
            className="w-full max-w-md rounded-lg border border-black/10 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="rollback-dialog-title" className="text-base font-semibold">
              Roll back patch #{guard.patch.number}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6d6d72]">
              Every device on {appName} stops receiving <span className="break-all font-mono text-black">{guard.patch.id}</span> and returns to the
              previous version on its next launch. This cannot be undone from the console.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-9 border-black/10 bg-white px-4 text-black hover:bg-[#f3f3f4]" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button ref={confirmRef} type="button" className="h-9 bg-[#c0392b] px-5 text-white hover:bg-[#a53125]" disabled={!guard.armed} onClick={() => void submit()}>
                Roll back patch #{guard.patch.number}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
