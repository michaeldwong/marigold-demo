"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { DocumentCategory } from "@/lib/domain/types";
import type { RequirementStatus } from "@/lib/compliance/types";
import { REVIEW_THRESHOLD } from "@/lib/calculations/data-quality";
import { DOCUMENT_CATEGORIES, categoryLabel } from "@/lib/documents/analyzer";
import { useWorkspace } from "@/lib/state/workspace";
import { useScopedAnalysis } from "@/lib/state/scope";
import { useInspector, SourceLink } from "@/components/provenance/inspector";
import { fmtPct } from "@/lib/format";
import { Bar, Card, CardHeader, Empty, FilterChip, PageHeader, Pill, PrototypeNote, Select, Tabs } from "@/components/ui/primitives";
import { REQUIREMENT, RequirementPill } from "@/components/ui/status";

type Tab = "requirements" | "data-quality";

export function EvidencePage({ initialStatus, initialTab }: { initialStatus?: string; initialTab?: string }) {
  const [tab, setTab] = useState<Tab>(initialTab === "data-quality" ? "data-quality" : "requirements");
  const { evidence } = useScopedAnalysis();
  const { analysis } = useWorkspace();
  return (
    <div>
      <PageHeader
        eyebrow="Evidence sufficiency & data confidence"
        title="Evidence"
        subtitle="What the claim needs to be substantiated, what is on file, and how confident the system is that it read the data correctly. These are separate questions."
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "requirements", label: "Evidence requirements", count: evidence.total },
          { value: "data-quality", label: "Data quality", count: analysis.dataQuality.needsReview + analysis.dataQuality.unmatched },
        ]}
      />
      <div className="mt-4">{tab === "requirements" ? <Requirements initialStatus={initialStatus as RequirementStatus | "gaps" | undefined} /> : <DataQualityTab />}</div>
    </div>
  );
}

function Requirements({ initialStatus }: { initialStatus?: RequirementStatus | "gaps" }) {
  const { evidence } = useScopedAnalysis();
  const { dataset } = useWorkspace();
  const { open } = useInspector();
  const [status, setStatus] = useState<RequirementStatus | "all" | "gaps">(initialStatus === "gaps" ? "gaps" : initialStatus && initialStatus in REQUIREMENT ? initialStatus : "all");
  const [category, setCategory] = useState<DocumentCategory | "all">("all");
  const [q, setQ] = useState("");
  const statuses = Object.keys(REQUIREMENT) as RequirementStatus[];
  const rows = evidence.requirements
    .filter((r) => status === "all" || (status === "gaps" ? r.status !== "supported" : r.status === status))
    .filter((r) => category === "all" || r.category === category)
    .filter((r) => !q || `${r.label} ${r.detail}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => order(a.status) - order(b.status));
  const cats = [...new Set(evidence.requirements.map((r) => r.category))];

  return (
    <div className="space-y-4">
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="eyebrow">Evidence coverage</div>
            <div className="text-[26px] font-semibold num">{fmtPct(evidence.pctComplete, 0)} complete</div>
          </div>
          <div className="min-w-[240px] flex-1">
            <Bar
              height={10}
              segments={[
                { value: evidence.supported + evidence.expiring, tone: "ok", label: "Supported" },
                { value: evidence.pendingReview, tone: "info", label: "Pending review" },
                { value: evidence.conflicting, tone: "warn", label: "Conflicting" },
                { value: evidence.missing + evidence.expired, tone: "bad", label: "Missing / expired" },
              ]}
            />
            <div className="mt-1.5 flex flex-wrap gap-4 text-[12px] text-ink-2 num">
              <span>{evidence.supported} supported</span>
              <span className="text-bad">{evidence.missing} missing</span>
              <span className="text-bad">{evidence.expired} expired</span>
              <span className="text-warn">{evidence.expiring} expiring</span>
              <span className="text-warn">{evidence.conflicting} conflicting</span>
              <span className="text-info">{evidence.pendingReview} pending review</span>
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <FilterChip active={status === "all"} onClick={() => setStatus("all")} count={evidence.total}>
            All
          </FilterChip>
          <FilterChip active={status === "gaps"} onClick={() => setStatus("gaps")} count={evidence.total - evidence.supported}>
            All gaps
          </FilterChip>
          {statuses.map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(s)} count={evidence.requirements.filter((r) => r.status === s).length}>
              {REQUIREMENT[s].label}
            </FilterChip>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select<DocumentCategory | "all">
              label="Category"
              value={category}
              onChange={setCategory}
              options={[{ value: "all", label: "All categories" }, ...DOCUMENT_CATEGORIES.filter((c) => cats.includes(c.value))]}
            />
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-8 w-full rounded-md border sm:w-44 border-line-strong pr-2 pl-7 text-[12.5px] outline-none focus:border-info" />
            </div>
          </div>
        </div>
        {rows.length === 0 ? (
          <Empty title="No requirements match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Category</th>
                  <th>Affects</th>
                  <th>Detail</th>
                  <th className="r">Docs</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => open({ kind: "requirement", id: r.id })}>
                    <td className="font-medium">{r.label}</td>
                    <td className="text-ink-2 whitespace-nowrap">{categoryLabel(r.category)}</td>
                    <td className="text-[12px] whitespace-nowrap">{r.componentIds.map((c) => dataset.components.find((x) => x.id === c)?.shortName).slice(0, 3).join(", ")}{r.componentIds.length > 3 ? "…" : ""}</td>
                    <td className="max-w-[340px] text-[12px] text-ink-3">{r.detail}</td>
                    <td className="r num">{r.evidenceIds.length}</td>
                    <td>
                      <RequirementPill status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function order(s: RequirementStatus) {
  return { expired: 0, missing: 1, conflicting: 2, pending_review: 3, expiring: 4, supported: 5 }[s];
}

function DataQualityTab() {
  const { analysis } = useWorkspace();
  const dq = analysis.dataQuality;
  const [state, setState] = useState<"attention" | "all">("attention");
  const rows = dq.records.filter((r) => state === "all" || r.state !== "high_confidence").sort((a, b) => a.confidence - b.confidence);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="px-4 py-3">
          <div className="eyebrow">High-confidence records</div>
          <div className="mt-1 text-[22px] font-semibold num">{fmtPct(dq.highConfidencePct, 0)}</div>
          <div className="text-[11.5px] text-ink-3">of {dq.totalRecords} records (≥ {Math.round(REVIEW_THRESHOLD * 100)}% confidence)</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="eyebrow">Needs review</div>
          <div className="mt-1 text-[22px] font-semibold text-warn num">{dq.needsReview}</div>
          <div className="text-[11.5px] text-ink-3">Low-confidence extraction or alias match</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="eyebrow">Unmatched records</div>
          <div className="mt-1 text-[22px] font-semibold text-bad num">{dq.unmatched}</div>
          <div className="text-[11.5px] text-ink-3">Could not be tied to a master record</div>
        </Card>
      </div>
      <PrototypeNote>Data confidence measures whether a value was extracted, mapped or matched correctly. It is not a measure of legal compliance — an attestation can be read with 99% confidence and still be expired.</PrototypeNote>
      <Card>
        <CardHeader
          title="Records"
          actions={
            <div className="flex gap-1.5">
              <FilterChip active={state === "attention"} onClick={() => setState("attention")} count={dq.needsReview + dq.unmatched}>
                Needs attention
              </FilterChip>
              <FilterChip active={state === "all"} onClick={() => setState("all")} count={dq.totalRecords}>
                All
              </FilterChip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record</th>
                <th>Kind</th>
                <th className="r">Confidence</th>
                <th>State</th>
                <th>Detail</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-[360px]">{r.label}</td>
                  <td className="text-ink-2 whitespace-nowrap">{r.kind.replace("_", " ")}</td>
                  <td className="r num">{Math.round(r.confidence * 100)}%</td>
                  <td>
                    <Pill tone={r.state === "high_confidence" ? "ok" : r.state === "needs_review" ? "warn" : "bad"}>{r.state.replace("_", " ")}</Pill>
                  </td>
                  <td className="text-[12px] text-ink-3">{r.detail}</td>
                  <td>{r.sourceId ? <SourceLink target={{ kind: "source", id: r.sourceId }} /> : <span className="text-ink-4">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
