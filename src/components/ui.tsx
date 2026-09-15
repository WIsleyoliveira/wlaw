import * as React from "react";

export function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/* ---------- Superfícies ---------- */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cx("rounded-card border border-ink-200 bg-white", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  action,
  hint,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  hint?: string;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink-950">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
        <div className="gold-rule mt-2 h-px w-10" />
      </div>
      {action}
    </header>
  );
}

/* ---------- Botões ---------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "gold";
  size?: "sm" | "md";
};

export function Button({ variant = "outline", size = "md", className, ...rest }: BtnProps) {
  const styles = {
    primary: "bg-ink-950 text-white hover:bg-ink-900 border-ink-950",
    outline: "bg-white text-ink-900 border-ink-200 hover:border-ink-400 hover:bg-ink-50",
    ghost: "bg-transparent text-ink-700 border-transparent hover:bg-ink-100",
    gold: "bg-gold-50 text-gold-600 border-gold-200 hover:bg-gold-200/50",
  }[variant];
  const dims = size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3.5 text-sm";
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400",
        styles,
        dims,
        className,
      )}
      {...rest}
    />
  );
}

/* ---------- Selo de status ---------- */

const toneMap = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  gold: "bg-gold-50 text-gold-600 ring-gold-200",
  ok: "bg-emerald-50 text-ok ring-emerald-200",
  warn: "bg-amber-50 text-warn ring-amber-200",
  danger: "bg-red-50 text-danger ring-red-200",
} as const;

export type Tone = keyof typeof toneMap;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        toneMap[tone],
      )}
    >
      {children}
    </span>
  );
}
