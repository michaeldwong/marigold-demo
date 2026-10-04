"use client";

import { useState } from "react";
import {
  ArrowRight,
  Calculator,
  FileInput,
  FileSearch,
  GitBranch,
  Link2,
  ListTodo,
  MessageSquareReply,
  PenLine,
  Replace,
  Scale,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { AuditEventType } from "@/lib/compliance/types";
import { useWorkspace } from "@/lib/state/workspace";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { Card, FilterChip, PageHeader, PrototypeNote } from "@/components/ui/primitives";

const TYPE_META: Record<AuditEventType, { label: string; icon: typeof FileInput }> = {
  document_uploaded: { label: "Document uploaded", icon: FileInput },
  data_extracted: { label: "Data extracted", icon: FileSearch },
  record_matched: { label: "Record matched", icon: Link2 },
  value_changed: { label: "Value changed", icon: PenLine },
  evidence_superseded: { label: "Evidence superseded", icon: Replace },
  question_answered: { label: "Question answered", icon: MessageSquareReply },
  bom_changed: { label: "BOM changed", icon: GitBranch },
  supplier_changed: { label: "Supplier changed", icon: Truck },
  determination_changed: { label: "Determination changed", icon: Scale },
  reviewer_decision: { label: "Reviewer decision", icon: ShieldCheck },
  calculation_refreshed: { label: "Calculation refreshed", icon: Calculator },
  task_updated: { label: "Task updated", icon: ListTodo },
};

export function AuditPage() {
  const { state } = useWorkspace();
  const [type, setType] = useState<AuditEventType | "all">("all");
  const [q, setQ] = useState("");
  const events = [...state.audit]
    .filter((e) => type === "all" || e.type === type)
    .filter((e) => !q || JSON.stringify(e).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.at.localeCompare(a.at));
  const types = [...new Set(state.audit.map((e) => e.type))];
  const byDay = new Map<string, typeof events>();
  for (const e of events) byDay.set(e.at.slice(0, 10), [...(byDay.get(e.at.slice(0, 10)) ?? []), e]);

  return (
    <div>
      <PageHeader
        eyebrow="Historical record"
        title="Audit trail"
        subtitle="Every upload, extraction, match, value change, answer, review decision and recalculation — append-only. Automated results and human decisions are both retained."
      />
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <FilterChip active={type === "all"} onClick={() => setType("all")} count={state.audit.length}>
          All events
        </FilterChip>
        {types.map((t) => (
          <FilterChip key={t} active={type === t} onClick={() => setType(t)} count={state.audit.filter((e) => e.type === t).length}>
            {TYPE_META[t].label}
          </FilterChip>
        ))}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" className="h-8 w-52 rounded-md border border-line-strong pr-2 pl-7 text-[12.5px] outline-none focus:border-info" />
        </div>
      </div>
      <div className="space-y-5">
        {[...byDay].map(([day, evs]) => (
          <div key={day}>
            <div className="eyebrow mb-2">{fmtDate(day)}</div>
            <Card>
              <ol className="divide-y divide-line">
                {evs.map((e) => {
                  const M = TYPE_META[e.type];
                  const Icon = M.icon;
                  return (
                    <li key={e.id} className="grid grid-cols-[110px_28px_1fr] gap-3 px-4 py-3">
                      <div className="pt-0.5 text-[11.5px] text-ink-3 num">{fmtDateTime(e.at)}</div>
                      <div>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-subtle">
                          <Icon className="h-3.5 w-3.5 text-ink-2" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold">{e.title}</span>
                          <span className="text-[11px] text-ink-3">
                            {M.label} · {e.actor}
                          </span>
                          <span className="font-mono text-[10.5px] text-ink-4">{e.id}</span>
                        </div>
                        {e.change && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px]">
                            <span className="text-ink-3">{e.change.field}:</span>
                            <span className="rounded bg-mute-bg px-1.5 py-0.5 text-ink-2 line-through decoration-ink-4">{e.change.from}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-ink-4" />
                            <span className="rounded bg-info-bg px-1.5 py-0.5 font-medium text-info">{e.change.to}</span>
                          </div>
                        )}
                        {e.triggeredBy && (
                          <div className="mt-1.5 text-[12px]">
                            <span className="text-ink-3">Triggered by </span>
                            <span className="font-mono text-[11.5px] break-all">{e.triggeredBy}</span>
                          </div>
                        )}
                        {e.affected.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <span className="text-[12px] text-ink-3">Affected</span>
                            {e.affected.map((a) => (
                              <span key={a} className="rounded border border-line px-1.5 py-0.5 text-[11.5px]">
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                        {e.recalculation && (
                          <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-md border border-line bg-subtle px-2.5 py-1.5 text-[12px]">
                            <Calculator className="h-3.5 w-3.5 text-ink-3" />
                            <span className="text-ink-3">Recalculation · {e.recalculation.label}:</span>
                            <span className="num">{e.recalculation.from}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-ink-4" />
                            <span className="font-medium num">{e.recalculation.to}</span>
                          </div>
                        )}
                        {e.note && <div className="mt-1.5 text-[12px] text-ink-2">{e.note}</div>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <PrototypeNote>Seeded history plus every action taken in this session. In production this becomes an immutable, append-only event log tied to versioned calculation snapshots.</PrototypeNote>
      </div>
    </div>
  );
}
