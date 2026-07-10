import { useState } from "react";
import { ClipboardCheck, Copy, TerminalSquare } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          })
          .catch(() => undefined);
      }}
      className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 font-mono text-[0.68rem] uppercase text-white/62 transition-colors hover:bg-white/[0.12]"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? (
        <ClipboardCheck className="size-3.5 text-success" />
      ) : (
        <Copy className="size-3.5 text-coral" />
      )}
      {copied ? "copied" : "copy"}
    </button>
  );
}

export function CommandBlock({ code }: { code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151616] shadow-card ring-1 ring-white/5">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase text-white/45">
          <TerminalSquare className="size-3.5 text-coral" />
          shell
        </span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5">
        <code className="block whitespace-pre font-mono text-[0.78rem] leading-6 text-white/82">
          {code}
        </code>
      </pre>
    </div>
  );
}
