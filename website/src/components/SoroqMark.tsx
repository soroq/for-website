import { cn } from "@/lib/utils";

export function SoroqMark({
  className,
  textClassName,
}: {
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <span className={cn("font-mono text-sm font-bold", textClassName)}>S</span>
    </span>
  );
}
