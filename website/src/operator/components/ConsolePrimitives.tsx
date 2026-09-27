import { AlertCircle, FileCode2, Loader2 } from "lucide-react";
import type { ComponentType } from "react";

import type { ApiState, JsonRecord } from "../types";

export function OperatorSummaryTile({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="operator-summary-tile p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.64rem] font-medium uppercase tracking-[0.12em] text-[#8d8d93]">
          {label}
        </p>
        <span className="grid size-7 place-items-center border border-black/10 bg-[#f5f5f6]">
          <Icon className="size-3.5 text-black" />
        </span>
      </div>
      <p className="mt-2 break-words text-lg font-semibold tracking-[-0.01em]">
        {value}
      </p>
      <p className="mt-1 break-words text-xs leading-5 text-[#6d6d72]">{helper}</p>
    </div>
  );
}

export function ConsoleMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-black/[0.08] bg-[#fafafa] px-3 py-2.5">
      <p className="text-xs text-[#6d6d72]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-black" title={value}>{value}</p>
    </div>
  );
}

export function ConsoleEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <p className="text-sm font-semibold text-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#6d6d72]">{body}</p>
    </div>
  );
}

export function OperatorMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <p className="text-xs text-[#6d6d72]">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold tabular-nums text-black">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#6d6d72]">{helper}</p>
    </div>
  );
}

export function ApiStatusPill({
  state,
  readyLabel,
  idleLabel,
  className = "",
}: {
  state: ApiState<unknown>["status"];
  readyLabel: string;
  idleLabel: string;
  className?: string;
}) {
  const content = {
    idle: {
      label: idleLabel,
      className: "border-black/10 bg-white text-[#6d6d72]",
    },
    loading: {
      label: "checking",
      className: "border-black/10 bg-[#f0f0f2] text-black",
    },
    ready: {
      label: readyLabel,
      className: "border-black bg-black text-white",
    },
    error: {
      label: "needs attention",
      className: "border-black/20 bg-[#ededee] text-black",
    },
  }[state];

  return (
    <span
      className={`inline-flex h-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${content.className} ${className}`}
    >
      {state === "loading" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : state === "error" ? (
        <AlertCircle className="size-3" />
      ) : (
        <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      )}
      {content.label}
    </span>
  );
}

export function StateNotice({
  tone,
  message,
}: {
  tone: "error" | "warning";
  message: string;
}) {
  const toneClass =
    tone === "error"
      ? "border-[#c0392b]/30 bg-[#fdf3f2] text-[#8f2a20]"
      : "border-[#b7791f]/30 bg-[#fdf8ee] text-[#7a5212]";

  return (
    <div className={`rounded-md border px-3 py-2 text-sm leading-5 ${toneClass}`}>
      <div className="flex min-w-0 gap-2.5">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        <p className="min-w-0 break-words">{message}</p>
      </div>
    </div>
  );
}

export function JsonPreview({ data, empty }: { data: JsonRecord | null; empty: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white text-black">
      <div className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-2.5">
        <span className="text-xs text-[#6d6d72]">Server response</span>
        <FileCode2 className="size-4 text-[#6d6d72]" />
      </div>
      <pre className="max-h-72 overflow-auto p-4 text-xs leading-5 text-[#323236]">
        {data ? JSON.stringify(data, null, 2) : empty}
      </pre>
    </div>
  );
}
