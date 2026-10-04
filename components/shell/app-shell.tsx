"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  CircleHelp,
  FileStack,
  FolderOpen,
  Gauge,
  History,
  Menu,
  Network,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useWorkspace } from "@/lib/state/workspace";
import { useInspector } from "@/components/provenance/inspector";
import { fmtDate } from "@/lib/format";
import { Avatar, Select, cx } from "@/components/ui/primitives";

type NavItem = { href: string; label: string; icon: typeof Gauge; badge?: number; badgeTone?: "bad" | "warn" };

export function AppShell({ children }: { children: ReactNode }) {
  const { analysis, state } = useWorkspace();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const openQuestions = analysis.questions.filter((q) => (state.questionStates[q.id]?.status ?? "open") === "open" && state.resolutions[q.issueId]?.state !== "resolved").length;
  const evidenceGaps = analysis.evidence.missing + analysis.evidence.expired + analysis.evidence.conflicting;

  // Demo navigation. Production & Sales, Scenario Analysis and Settings still exist as routes
  // (/production-sales, /scenarios, /settings) but are intentionally not linked.
  const groups: { label?: string; items: NavItem[] }[] = [
    {
      label: "Analysis",
      items: [
        { href: "/overview", label: "Overview", icon: Gauge },
        { href: "/eligibility", label: "Eligibility", icon: BadgeCheck },
        { href: "/supply-chain", label: "Supply Chain", icon: Network },
      ],
    },
    {
      label: "Compliance",
      items: [
        { href: "/questions", label: "Missing Information", icon: CircleHelp, badge: openQuestions, badgeTone: "bad" },
        { href: "/evidence", label: "Evidence", icon: ShieldCheck, badge: evidenceGaps, badgeTone: "warn" },
        { href: "/documents", label: "Documents", icon: FolderOpen },
        { href: "/audit", label: "Audit Trail", icon: History },
      ],
    },
  ];

  const nav = (
    <nav className="flex h-full flex-col bg-side text-side-ink">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#e8e6dc] to-[#b9b6a6] text-[11px] font-bold text-side">45X</div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold">45X Compliance OS</div>
          <div className="text-[11px] text-side-ink-2">Volterra Battery Systems</div>
        </div>
      </div>
      <div className="thin-scroll flex-1 overflow-y-auto px-2">
        {groups.map((g, gi) => (
          <div key={gi} className={cx(gi > 0 && "mt-4 border-t border-side-line pt-3")}>
            {g.label && <div className="px-2 pb-1.5 text-[10.5px] font-semibold tracking-wider text-side-ink-2 uppercase">{g.label}</div>}
            {g.items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/") || (it.href === "/eligibility" && pathname.startsWith("/components"));
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setMobileOpen(false)}
                  className={cx(
                    "mb-0.5 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] transition",
                    active ? "bg-side-2 text-white" : "text-side-ink-2 hover:bg-side-2/60 hover:text-side-ink",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="flex-1">{it.label}</span>
                  {!!it.badge && (
                    <span className={cx("num rounded-full px-1.5 text-[10.5px] font-semibold", it.badgeTone === "bad" ? "bg-bad/90 text-white" : "bg-warn/90 text-white")}>{it.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <CurrentUser />
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 lg:block">{nav}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[240px]">{nav}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function CurrentUser() {
  const { persona } = useWorkspace();
  return (
    <div className="flex items-center gap-2.5 border-t border-side-line px-4 py-3">
      <Avatar initials={persona.initials} name={persona.name} size={26} />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[12.5px] text-side-ink">{persona.name}</div>
        <div className="truncate text-[11px] text-side-ink-2">{persona.role}</div>
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { dataset, state, dispatch } = useWorkspace();
  return (
    <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button className="rounded p-1.5 text-ink-2 hover:bg-mute-bg lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      <Select
        label="Facility"
        value={state.facilityId}
        onChange={(v) => dispatch({ type: "set_facility", facilityId: v })}
        options={[{ value: "all", label: "All facilities" }, ...dataset.facilities.map((f) => ({ value: f.id, label: f.name }))]}
        className="min-w-0 max-w-[60vw] sm:max-w-none md:shrink-0"
      />
      <span className="hidden h-8 shrink-0 items-center gap-1.5 rounded-md border border-line bg-subtle px-2.5 text-[12.5px] text-ink-2 md:inline-flex">
        <CalendarDays className="h-3.5 w-3.5 text-ink-3" /> Tax year {state.taxYear} · In preparation
      </span>
      <GlobalSearch />
      <div className="ml-auto hidden items-center gap-3 md:flex">
        <span className="whitespace-nowrap text-[11.5px] text-ink-3">Data as of {fmtDate(dataset.asOf)}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-warn-line bg-warn-bg px-2 py-0.5 text-[11px] font-medium text-warn">
          <Activity className="h-3 w-3" /> Prototype · mock data · placeholder rules
        </span>
      </div>
    </header>
  );
}

type Hit = { key: string; label: string; sub: string; group: string; go: () => void };

function GlobalSearch() {
  const { dataset, analysis } = useWorkspace();
  const { open } = useInspector();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.querySelector("input")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const m = (...xs: (string | undefined | null)[]) => xs.some((x) => x?.toLowerCase().includes(s));
    const out: Hit[] = [];
    for (const c of dataset.components) if (m(c.name, c.sku, c.chemistry)) out.push({ key: c.id, label: c.name, sub: c.sku, group: "Components", go: () => router.push(`/components/${c.id}`) });
    for (const sp of dataset.suppliers) if (m(sp.name, sp.id, ...sp.aliases, sp.ultimateParent.value)) out.push({ key: sp.id, label: sp.name, sub: `${sp.id} · ${sp.country}`, group: "Suppliers", go: () => open({ kind: "supplier", id: sp.id }) });
    for (const e of dataset.evidence) if (m(e.fileName, e.title)) out.push({ key: e.id, label: e.fileName, sub: e.title, group: "Documents", go: () => open({ kind: "evidence", id: e.id }) });
    for (const i of analysis.issues) if (m(i.title, i.id)) out.push({ key: i.id, label: i.title, sub: i.riskLabel, group: "Issues", go: () => open({ kind: "issue", id: i.id }) });
    for (const b of dataset.batches) if (m(b.id, b.workOrder)) out.push({ key: b.id, label: b.id, sub: `${b.workOrder} · ${b.quantity.toLocaleString("en-US")} units`, group: "Production lots", go: () => open({ kind: "source", id: b.mesSourceId }) });
    for (const sa of dataset.sales) if (m(sa.invoiceNumber, sa.customerName)) out.push({ key: sa.id, label: `${sa.invoiceNumber} · ${sa.customerName}`, sub: `${sa.quantity.toLocaleString("en-US")} units · ${sa.saleDate}`, group: "Sales", go: () => open({ kind: "source", id: sa.sourceId }) });
    return out.slice(0, 14);
  }, [q, dataset, analysis.issues, open, router]);

  return (
    <div ref={ref} className="relative hidden w-full max-w-[340px] sm:block">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search components, suppliers, documents, lots…"
        className="h-8 w-full rounded-md border border-line-strong bg-subtle pr-12 pl-8 text-[12.5px] outline-none focus:border-info focus:bg-surface"
      />
      {q ? (
        <button className="absolute top-1/2 right-2 -translate-y-1/2 text-ink-4" onClick={() => setQ("")} aria-label="Clear search">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-line px-1 text-[10px] text-ink-4">⌘K</kbd>
      )}
      {focused && q.trim().length >= 2 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[420px] overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-xl thin-scroll">
          {hits.length === 0 && <div className="px-3 py-3 text-[12px] text-ink-3">No matches.</div>}
          {hits.map((h, i) => (
            <div key={h.key}>
              {(i === 0 || hits[i - 1].group !== h.group) && <div className="px-3 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider text-ink-4 uppercase">{h.group}</div>}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  h.go();
                  setQ("");
                  setFocused(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-subtle"
              >
                <FileStack className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-4" />
                <div className="min-w-0">
                  <div className="truncate text-[12.5px]">{h.label}</div>
                  <div className="truncate text-[11px] text-ink-3">{h.sub}</div>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
