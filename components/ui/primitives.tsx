"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Info } from "lucide-react";
import type { InfoKind } from "@/lib/domain/types";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Tone & pills                                                               */
/* -------------------------------------------------------------------------- */

export type Tone = "ok" | "warn" | "bad" | "mute" | "info";

const PILL: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok border-ok-line",
  warn: "bg-warn-bg text-warn border-warn-line",
  bad: "bg-bad-bg text-bad border-bad-line",
  mute: "bg-mute-bg text-mute border-mute-line",
  info: "bg-info-bg text-info border-info-line",
};
const DOT: Record<Tone, string> = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", mute: "bg-ink-4", info: "bg-info" };

export function Pill({ tone = "mute", children, dot = true, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2 py-[1px] text-[11px] font-medium whitespace-nowrap", PILL[tone], className)}>
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  return <span className={cx("inline-block h-2 w-2 rounded-full", DOT[tone])} />;
}

export const toneText: Record<Tone, string> = { ok: "text-ok", warn: "text-warn", bad: "text-bad", mute: "text-ink-3", info: "text-info" };

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                   */
/* -------------------------------------------------------------------------- */

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx("rounded-lg border border-line bg-surface shadow-[0_1px_0_rgba(0,0,0,0.02)]", onClick && "cursor-pointer transition hover:border-line-strong", className)}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
        <div className="text-[13.5px] font-semibold text-ink">{title}</div>
        {subtitle && <div className="mt-0.5 text-[12px] text-ink-3">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  meta,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        {subtitle && <div className="mt-1 max-w-3xl text-[13px] text-ink-3">{subtitle}</div>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "ok";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2 border-ink",
  secondary: "bg-surface text-ink border-line-strong hover:bg-subtle",
  ghost: "bg-transparent text-ink-2 border-transparent hover:bg-mute-bg",
  danger: "bg-surface text-bad border-bad-line hover:bg-bad-bg",
  ok: "bg-ok text-white border-ok hover:opacity-90",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[12.5px]",
        BTN[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ButtonLink({ href, children, variant = "secondary", size = "md" }: { href: string; children: ReactNode; variant?: BtnVariant; size?: "sm" | "md" }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[12.5px]",
        BTN[variant],
      )}
    >
      {children}
    </Link>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
  className?: string;
  label?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cx("h-8 rounded-md border border-line-strong bg-surface px-2 text-[12.5px] text-ink outline-none focus:border-info", className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line thin-scroll" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-medium whitespace-nowrap transition",
            value === t.value ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink-2",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cx("rounded-full px-1.5 text-[10.5px] num", value === t.value ? "bg-ink text-white" : "bg-mute-bg text-ink-3")}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function FilterChip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition",
        active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:bg-subtle",
      )}
    >
      {children}
      {count !== undefined && <span className={cx("num text-[11px]", active ? "text-white/70" : "text-ink-4")}>{count}</span>}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* People                                                                     */
/* -------------------------------------------------------------------------- */

const AVATAR_COLORS = ["#334155", "#7c2d12", "#14532d", "#1e3a8a", "#581c87", "#713f12", "#0f766e", "#9f1239"];

export function Avatar({ initials, name, size = 22 }: { initials: string; name?: string; size?: number }) {
  const idx = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42, background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
    >
      {initials}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                    */
/* -------------------------------------------------------------------------- */

export function Tip({ content, children, width = 260 }: { content: ReactNode; children?: ReactNode; width?: number }) {
  return (
    <span className="group relative inline-flex">
      {children ?? <Info className="h-3.5 w-3.5 text-ink-4" aria-hidden />}
      <span
        role="tooltip"
        style={{ width }}
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 rounded-md bg-ink px-2.5 py-2 text-[11.5px] leading-snug font-normal normal-case tracking-normal text-white shadow-lg group-hover:block"
      >
        {content}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Information kinds                                                          */
/* -------------------------------------------------------------------------- */

export const INFO_KIND: Record<InfoKind, { label: string; tone: Tone; help: string }> = {
  known: { label: "Known fact", tone: "ok", help: "Supported by source evidence." },
  derived: { label: "Derived", tone: "info", help: "Calculated deterministically from known facts." },
  assumption: { label: "Assumption", tone: "warn", help: "Provisionally assumed for analysis — not confirmed." },
  missing: { label: "Missing", tone: "bad", help: "Cannot currently be determined; requires information or review." },
};

export function InfoKindBadge({ kind, compact }: { kind: InfoKind; compact?: boolean }) {
  const k = INFO_KIND[kind];
  return (
    <Tip content={<><b>{k.label}.</b> {k.help}</>} width={220}>
      <span
        className={cx(
          "inline-flex items-center rounded border px-1.5 text-[10px] font-semibold tracking-wide uppercase",
          { ok: "border-ok-line text-ok", info: "border-info-line text-info", warn: "border-warn-line text-warn bg-warn-bg", bad: "border-bad-line text-bad bg-bad-bg", mute: "border-mute-line text-mute" }[k.tone],
        )}
      >
        {compact ? k.label.split(" ")[0] : k.label}
      </span>
    </Tip>
  );
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                       */
/* -------------------------------------------------------------------------- */

export function Stat({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={cx("mt-1 text-[20px] font-semibold tracking-[-0.01em] num", tone ? toneText[tone] : "text-ink")}>{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function KV({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("grid grid-cols-[minmax(120px,38%)_1fr] gap-3 py-1.5 text-[12.5px]", className)}>
      <div className="text-ink-3">{label}</div>
      <div className="min-w-0 text-ink">{children}</div>
    </div>
  );
}

export function Bar({ segments, height = 8 }: { segments: { value: number; tone: Tone; label?: string }[]; height?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex w-full overflow-hidden rounded-full bg-mute-bg" style={{ height }}>
      {segments.map((s, i) =>
        s.value > 0 ? (
          <div
            key={i}
            title={s.label}
            className={cx(DOT[s.tone], i > 0 && "border-l border-white")}
            style={{ width: `${(s.value / total) * 100}%`, opacity: s.tone === "mute" ? 0.35 : 1 }}
          />
        ) : null,
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="text-[13px] font-medium text-ink-2">{title}</div>
      {children && <div className="mt-1 text-[12px] text-ink-3">{children}</div>}
    </div>
  );
}

export function PrototypeNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed border-line-strong bg-subtle px-3 py-2 text-[11.5px] text-ink-3">
      <Info className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
