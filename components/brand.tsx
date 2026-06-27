import { cn } from "@/lib/utils";

export const BRAND = {
  name: "Tandem",
  tagline: "Write together — even offline.",
};

/** Tandem mark: two interlocking rings (collaboration), flat single color. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <circle cx="9.5" cy="12" r="5" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="14.5" cy="12" r="5" stroke="currentColor" strokeWidth="2.2" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <Logo />
      <span className="text-base tracking-tight">{BRAND.name}</span>
    </span>
  );
}
