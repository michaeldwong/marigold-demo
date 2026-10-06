"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BadgeCheck, Boxes, CircleAlert, CircleDollarSign, FolderOpen, Gauge, Menu } from "lucide-react";
import { analysis } from "@/lib/analysis";
import { cx } from "@/components/ui/primitives";

const NAV = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/eligibility", label: "Eligibility", icon: BadgeCheck },
  { href: "/credits", label: "Credits", icon: CircleDollarSign },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/missing-information", label: "Missing Information", icon: CircleAlert, badge: analysis.issues.length },
  { href: "/sourcing", label: "Sourcing", icon: FolderOpen },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex h-full flex-col bg-side text-side-ink">
      <div className="px-5 pt-5 pb-6">
        <div className="text-[15px] font-semibold tracking-tight">Marigold</div>
        <div className="mt-0.5 text-[12px] text-side-ink-2">Section 45X analysis</div>
      </div>
      <div className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] transition",
                active ? "bg-side-2 text-white" : "text-side-ink-2 hover:bg-side-2/60 hover:text-side-ink",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {!!badge && <span className="num rounded-full bg-side-line px-1.5 text-[11px] text-side-ink">{badge}</span>}
            </Link>
          );
        })}
      </div>
      <div className="px-5 py-4 text-[11.5px] leading-snug text-side-ink-2">
        Demo on fictional data.
        <br />
        Not tax advice.
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-[240px]">{nav}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-8">
          <button className="rounded p-1.5 text-ink-2 hover:bg-mute-bg lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 truncate text-[14px] font-medium">{analysis.company.name}</div>
          <span className="text-ink-4">·</span>
          <div className="shrink-0 text-[14px] text-ink-3">Tax year {analysis.tax_year}</div>
        </header>
        <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
