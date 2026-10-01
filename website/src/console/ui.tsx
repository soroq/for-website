import type { ReactNode } from "react";
import { HEALTH, type Health } from "./health";
import { platformName, type Platform } from "./model";

/** A section's title, an optional one-line explanation, and an optional action on the right. */
export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-[#6d6d72]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** What an empty list means, and what to do about it. */
export function EmptyCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <p className="text-sm font-semibold">{title}</p>
      {children ? <div className="mt-1 text-sm leading-6 text-[#6d6d72]">{children}</div> : null}
    </div>
  );
}

export function TableShell({ children, minWidth = 720 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children?: ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-2.5 text-xs font-medium text-[#6d6d72] ${align === "right" ? "text-right" : ""}`}>{children}</th>;
}

/** A figure the server did not give (as opposed to a zero it did give). */
export function Absent({ title = "No figure yet" }: { title?: string }) {
  return (
    <span className="text-[#a8a8ae]" title={title}>
      —
    </span>
  );
}

export function HealthBadge({ health, suffix }: { health: Health; suffix?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${HEALTH[health].text}`}>
      <span className={`size-2 shrink-0 rounded-full ${HEALTH[health].dot}`} />
      {HEALTH[health].label}
      {suffix ? <span className="text-[#8d8d93]">{suffix}</span> : null}
    </span>
  );
}

export function PlatformChips({ platforms }: { platforms: Platform[] }) {
  if (!platforms.length) return null;
  return (
    <span className="flex shrink-0 gap-1">
      {platforms.map((platform) => (
        <span key={platform} className="rounded border border-black/10 px-1.5 py-px text-[0.68rem] font-medium text-[#5f6066]">
          {platformName(platform)}
        </span>
      ))}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-[#f1f1f3] px-1 py-px font-mono text-[0.78rem] text-black">{children}</code>;
}
