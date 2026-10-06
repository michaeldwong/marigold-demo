"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import type { Severity, Status } from "@/lib/analysis";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cx("scroll-mt-20 rounded-xl border border-line bg-surface", className)}>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.015em] text-ink">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-2xl text-[14px] text-ink-3">{subtitle}</p>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-[13px] font-semibold tracking-wide text-ink-3 uppercase">{children}</h2>
      {aside}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[13px] font-medium text-info hover:underline">
      {children}
    </Link>
  );
}

const MARK = {
  satisfied: { Icon: Check, cls: "bg-ok-bg text-ok", label: "Satisfied" },
  review: { Icon: TriangleAlert, cls: "bg-warn-bg text-warn", label: "Needs information or review" },
  not_satisfied: { Icon: X, cls: "bg-bad-bg text-bad", label: "Not satisfied" },
} as const;

/** Check / warning / X - the only status vocabulary in the UI. */
export function StatusMark({ status, size = 22 }: { status: Status; size?: number }) {
  const m = MARK[status];
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center rounded-full", m.cls)} style={{ width: size, height: size }} title={m.label} aria-label={m.label}>
      <m.Icon style={{ width: size * 0.58, height: size * 0.58 }} strokeWidth={2.6} />
    </span>
  );
}

const SEV: Record<Severity, string> = {
  CRITICAL: "bg-bad text-white",
  HIGH: "bg-bad-bg text-bad",
  MEDIUM: "bg-warn-bg text-warn",
  LOW: "bg-mute-bg text-mute",
};

export function SeverityTag({ severity }: { severity: Severity }) {
  return <span className={cx("inline-block rounded px-1.5 py-[1px] text-[10.5px] font-semibold tracking-wide", SEV[severity])}>{severity}</span>;
}
