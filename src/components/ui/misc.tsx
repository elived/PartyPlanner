import { AlertCircle, CheckCircle2, Info, Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "info" | "success" | "error" | "warning";

const ALERT_TONES: Record<Tone, { className: string; Icon: LucideIcon }> = {
  info: { className: "bg-sky-50 text-sky-900 border-sky-200", Icon: Info },
  success: { className: "bg-emerald-50 text-emerald-900 border-emerald-200", Icon: CheckCircle2 },
  error: { className: "bg-red-50 text-red-900 border-red-200", Icon: AlertCircle },
  warning: { className: "bg-amber-50 text-amber-900 border-amber-200", Icon: AlertCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon } = ALERT_TONES[tone];
  return (
    <div
      // Errors are announced immediately; the rest wait for a natural pause.
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", toneClass, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  ATTENDING: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  NOT_ATTENDING: "bg-red-100 text-red-800 ring-red-600/20",
  MAYBE: "bg-amber-100 text-amber-800 ring-amber-600/20",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-500/20",
  PUBLISHED: "bg-brand-100 text-brand-800 ring-brand-600/20",
  ARCHIVED: "bg-slate-100 text-slate-500 ring-slate-400/20",
  neutral: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export function Badge({ tone = "neutral", children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        BADGE_TONES[tone] ?? BADGE_TONES.neutral,
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "warning" | "brand";
}) {
  const toneClass = {
    default: "text-slate-900",
    positive: "text-emerald-700",
    negative: "text-red-700",
    warning: "text-amber-700",
    brand: "text-brand-700",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
        <Icon aria-hidden className="size-5" />
      </span>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Inline busy indicator with an accessible name. */
export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-sm text-slate-500", className)}>
      <Loader2 aria-hidden className="size-4 animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Skeleton block for loading.tsx files. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}
