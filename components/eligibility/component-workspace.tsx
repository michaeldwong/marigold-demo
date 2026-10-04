"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import type { Fact, ID } from "@/lib/domain/types";
import { CATEGORY_RATES, kwhPerUnit } from "@/lib/calculations/credit";
import { batchesInScope } from "@/lib/calculations/material-assistance";
import { yearOf } from "@/lib/calculations/dates";
import { CITATIONS } from "@/lib/compliance/citations";
import { useWorkspace } from "@/lib/state/workspace";
import { useInspector, SourceLink, IssueList } from "@/components/provenance/inspector";
import { fmtKwh, fmtMoney, fmtNum } from "@/lib/format";
import { Card, CardHeader, Empty, FilterChip, InfoKindBadge, PageHeader, Pill, PrototypeNote, Tabs, cx, Button } from "@/components/ui/primitives";
import { CHECK_LABEL, CheckIcon, ELIGIBILITY, RequirementPill } from "@/components/ui/status";
import { CreditLinesTable, LotsTable, SalesTable } from "@/components/tables/records";
import { BomTable, BomVersionTimeline, MacrPanel } from "@/components/supply-chain/bom";
import { ReviewPanel, ReviewStepper } from "./review-panel";

type Tab = "determination" | "calculation" | "bom" | "records" | "missing" | "review";

export function ComponentWorkspace({ id }: { id: ID }) {
  const { dataset, analysis, state } = useWorkspace();
  const [tab, setTab] = useState<Tab>("determination");
  const comp = dataset.components.find((c) => c.id === id);
  if (!comp) {
    return <Empty title="Component not found">No eligible component with ID {id}.</Empty>;
  }
  const det = analysis.determinations[id];
  const cc = analysis.credit.byComponent.find((c) => c.componentId === id);
  const facility = dataset.facilities.find((f) => f.id === comp.facilityId)!;
  const missing = analysis.evidence.requirements.filter((r) => r.componentIds.includes(id) && r.status !== "supported");
  const lots = batchesInScope(dataset).filter((b) => b.componentId === id);
  const sales = dataset.sales.filter((s) => s.componentId === id && yearOf(s.saleDate) === dataset.taxYear);
  const reviews = state.reviews.filter((r) => r.componentId === id);
  const evaluated = det.status !== "not_evaluated";

  return (
    <div>
      <Link href="/eligibility" className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Eligibility
      </Link>
      <PageHeader
        eyebrow={`${CATEGORY_RATES[comp.category].label} · ${comp.sku}`}
        title={comp.name}
        subtitle={`${facility.name} · Tax year ${dataset.taxYear} · ${comp.chemistry} · ${comp.format}`}
        meta={
          <>
            <Pill tone={ELIGIBILITY[det.status].tone}>{det.headline}</Pill>
            <span className="font-mono text-[11px] text-ink-3">{det.ruleVersionId}</span>
          </>
        }
        actions={
          cc ? (
            <div className="flex gap-5 rounded-lg border border-line bg-surface px-4 py-2.5">
              <div>
                <div className="eyebrow">Estimated</div>
                <div className="text-[17px] font-semibold num">{fmtMoney(cc.estimated)}</div>
              </div>
              <div>
                <div className="eyebrow">Supported</div>
                <div className="text-[17px] font-semibold text-ok num">{fmtMoney(cc.supported)}</div>
              </div>
              <div>
                <div className="eyebrow">At risk</div>
                <div className={cx("text-[17px] font-semibold num", cc.atRisk ? "text-warn" : "text-ink-4")}>{fmtMoney(cc.atRisk)}</div>
              </div>
            </div>
          ) : undefined
        }
      />
      <div className="mb-4">
        <ReviewStepper stage={state.reviewStages[id] ?? "automated"} />
      </div>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "determination", label: "Determination" },
          { value: "calculation", label: "Calculation" },
          { value: "bom", label: "BOM & suppliers", count: comp.bomVersionIds.length },
          { value: "records", label: "Production & sales", count: lots.length + sales.length },
          { value: "missing", label: "Missing evidence", count: missing.length },
          { value: "review", label: "Professional review", count: reviews.length },
        ]}
      />
      <div className="mt-4">
        {!evaluated && tab !== "review" ? (
          <Card>
            <CardHeader title="Not evaluated" />
            <div className="space-y-3 px-4 py-4 text-[12.5px] text-ink-2">
              <p>{comp.evaluationNote}</p>
              <PrototypeNote>Electrode active materials use a different formula (10% of eligible production costs). The prototype does not model cost accounting; this component is shown to make the gap visible rather than silently omitted.</PrototypeNote>
            </div>
          </Card>
        ) : (
          <>
            {tab === "determination" && <DeterminationTab id={id} />}
            {tab === "calculation" && <CalculationTab id={id} />}
            {tab === "bom" && <BomTab id={id} />}
            {tab === "records" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader title={`Sale records (${sales.length})`} subtitle="2027 sales from the ERP sales register, matched to customers and allocated to production lots (mock FIFO matcher). Click a row for the source record." />
                  <SalesTable sales={sales} />
                </Card>
                <Card>
                  <CardHeader title={`Production lots (${lots.length})`} subtitle="MES lot records in scope: produced in 2027, or produced earlier and sold in 2027." />
                  <LotsTable batches={lots} />
                </Card>
              </div>
            )}
            {tab === "missing" && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader title="Evidence requirements not yet supported" />
                  <RequirementsList ids={missing.map((r) => r.id)} />
                </Card>
                <Card>
                  <CardHeader title="Open issues" subtitle="Detected from missing, stale, conflicting or ambiguous facts." />
                  <div className="p-3">
                    <IssueList ids={analysis.issues.filter((i) => i.componentIds.includes(id)).map((i) => i.id)} />
                  </div>
                </Card>
              </div>
            )}
            {tab === "review" && (
              <div className="max-w-3xl">
                <ReviewPanel componentId={id} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** "380,000 units sold to Meridian Power Tools Inc. on 2027-01-24" → "380,000 units sold to Meridian…" */
function shortFinding(f: string): string {
  return f.length > 34 ? `${f.slice(0, 32).trimEnd()}…` : f;
}

/* -------------------------------------------------------------------------- */

function DeterminationTab({ id }: { id: ID }) {
  const { analysis, dataset } = useWorkspace();
  const det = analysis.determinations[id];
  const cc = analysis.credit.byComponent.find((c) => c.componentId === id)!;
  const comp = dataset.components.find((c) => c.id === id)!;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <Card>
          <CardHeader title="45X eligibility" subtitle="Structured determination — each element links to the facts and evidence behind it." />
          <div className="divide-y divide-line">
            {det.checks.map((c) => (
              <div key={c.key} className="grid grid-cols-[20px_minmax(140px,190px)_1fr] gap-3 px-4 py-3">
                <div className="pt-0.5">
                  <CheckIcon status={c.status} />
                </div>
                <div>
                  <div className="text-[12.5px] font-medium">{c.label}</div>
                  <div className={cx("text-[11px]", { supported: "text-ok", pending: "text-warn", issue: "text-bad", not_applicable: "text-ink-4", not_evaluated: "text-ink-4" }[c.status])}>{CHECK_LABEL[c.status]}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{c.value}</div>
                  <div className="mt-0.5 text-[12px] text-ink-3">{c.detail}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {c.sourceIds.length === 1 && <SourceLink target={{ kind: "source", id: c.sourceIds[0] }} />}
                    {c.sourceIds.length > 1 &&
                      c.sourceIds.slice(0, 4).map((sid) => (
                        <SourceLink key={sid} target={{ kind: "source", id: sid }} label={`Source: ${shortFinding(dataset.sources.find((s) => s.id === sid)?.finding ?? sid)}`} />
                      ))}
                    {c.citationIds.map((cid) => (
                      <SourceLink key={cid} target={{ kind: "citation", id: cid }} label={`§ ${CITATIONS[cid].short}`} className="text-ink-3" />
                    ))}
                  </div>
                  {c.issueIds.length > 0 && (
                    <div className="mt-2">
                      <IssueList ids={c.issueIds} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-4 xl:col-span-4">
        <Card>
          <div className="px-4 py-4">
            <div className="eyebrow">Current result</div>
            <div className={cx("mt-1 text-[16px] font-semibold", { ok: "text-ok", warn: "text-warn", bad: "text-bad", mute: "text-ink-3", info: "text-info" }[ELIGIBILITY[det.status].tone])}>{det.headline}</div>
            <p className="mt-2 text-[12px] text-ink-2">{det.finding.finding}</p>
            <div className="mt-2 text-[11px] text-ink-3">
              Automated assessment under <span className="font-mono">{det.ruleVersionId}</span> (placeholder). Requires professional review before it can be relied on.
            </div>
          </div>
          <div className="border-t border-line px-4 py-4">
            <div className="eyebrow">Estimated credit</div>
            <div className="mt-2 rounded-md bg-subtle px-3 py-2 font-mono text-[12px] leading-relaxed text-ink-2">
              ${cc.ratePerKwh} / kWh × {fmtKwh(cc.kwh)} qualifying production sold
              <br />= {fmtNum(cc.unitsSold)} units × {fmtNum(kwhPerUnit(comp), 4)} kWh × ${cc.ratePerKwh}
              <br />= <span className="font-semibold text-ink">{fmtMoney(cc.estimated, { precise: true })}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-md border border-ok-line bg-ok-bg px-2.5 py-1.5">
                <div className="text-ok">Supported</div>
                <div className="font-semibold num">{fmtMoney(cc.supported)}</div>
              </div>
              <div className="rounded-md border border-warn-line bg-warn-bg px-2.5 py-1.5">
                <div className="text-warn">Requires substantiation</div>
                <div className="font-semibold num">{fmtMoney(cc.atRisk)}</div>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Reasoning" />
          <div className="space-y-2 px-4 py-3 text-[12px] text-ink-2">
            <p>{det.finding.reasoning}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {det.finding.sources.map((c) => (
                <SourceLink key={c.id} target={{ kind: "citation", id: c.id }} label={`§ ${c.short}`} />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((v) => (typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v))).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function FactRow({ label, fact, unit, derived }: { label: string; fact?: Fact<number | string | boolean | null>; unit?: string; derived?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5">
      <span className="w-[200px] text-[12.5px] text-ink-3">{label}</span>
      <span className="font-mono text-[12.5px] font-medium">
        {derived ?? (fact?.value === null || fact?.value === undefined ? "—" : `${fact.value}${unit ? ` ${unit}` : ""}`)}
      </span>
      <InfoKindBadge kind={derived ? "derived" : fact?.kind ?? "missing"} />
      {fact?.sourceId && <SourceLink target={{ kind: "source", id: fact.sourceId }} />}
      {fact?.note && <span className="w-full pl-[208px] text-[11px] text-warn">{fact.note}</span>}
    </div>
  );
}

function CalculationTab({ id }: { id: ID }) {
  const { analysis, dataset } = useWorkspace();
  const comp = dataset.components.find((c) => c.id === id)!;
  const cc = analysis.credit.byComponent.find((c) => c.componentId === id)!;
  const [filter, setFilter] = useState<"all" | "supported" | "at_risk">("all");
  const lines = cc.lines.filter((l) => filter === "all" || l.status === filter);
  const cap = comp.capacity!;
  const isModule = comp.category === "battery_module_with_cells";
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Calculation"
          subtitle="Deterministic and traceable: every input is a known fact, derived value or labelled assumption."
          actions={
            <Button
              size="sm"
              onClick={() =>
                exportCsv(`${comp.sku}_TY${dataset.taxYear}_credit_workpaper.csv`, [
                  ["component", "sale_id", "invoice", "lot", "bom_version", "units", "kwh_per_unit", "kwh", "rate_per_kwh", "phase_out", "credit_usd", "status", "blocking_issues", "rule_version"],
                  ...cc.lines.map((l) => [
                    comp.sku,
                    l.saleId,
                    dataset.sales.find((s) => s.id === l.saleId)!.invoiceNumber,
                    l.batchId ?? "",
                    l.bomVersionId ? dataset.bomVersions.find((b) => b.id === l.bomVersionId)!.version : "",
                    l.units,
                    l.kwhPerUnit.toFixed(5),
                    l.kwh.toFixed(2),
                    l.ratePerKwh,
                    l.phaseOutPct,
                    l.credit.toFixed(2),
                    l.status,
                    l.blockers.map((b) => b.issueId).join(" "),
                    analysis.ruleVersionId,
                  ]),
                ])
              }
            >
              <Download className="h-3.5 w-3.5" /> Export workpaper (CSV)
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-2">
          <div>
            <div className="eyebrow mb-1">Inputs</div>
            {isModule ? (
              <FactRow label="Aggregate capacity" fact={cap.aggregateCapacityKwh} unit="kWh" />
            ) : (
              <>
                <FactRow label="Nominal voltage" fact={cap.nominalVoltageV} unit="V" />
                <FactRow label="Rated capacity" fact={cap.ratedCapacityAh} unit="Ah" />
                <FactRow label="Energy per unit (V × Ah ÷ 1000)" derived={`${fmtNum(kwhPerUnit(comp), 5)} kWh`} />
              </>
            )}
            <FactRow label="Units sold in 2027 (allocated)" derived={fmtNum(cc.unitsSold)} />
            <div className="flex flex-wrap items-center gap-2 py-1.5">
              <span className="w-[200px] text-[12.5px] text-ink-3">Rate</span>
              <span className="font-mono text-[12.5px] font-medium">${cc.ratePerKwh} / kWh</span>
              <InfoKindBadge kind="known" />
              <SourceLink target={{ kind: "citation", id: CATEGORY_RATES[comp.category].citationId }} label="Form 7207 line" />
            </div>
            <FactRow label="Phase-out (2027 sales)" derived="100%" />
          </div>
          <div>
            <div className="eyebrow mb-1">Result</div>
            <div className="rounded-md bg-subtle px-3 py-3 font-mono text-[12.5px] leading-7">
              {fmtNum(cc.unitsSold)} units × {fmtNum(kwhPerUnit(comp), 5)} kWh = {fmtNum(cc.kwh, 1)} kWh
              <br />
              {fmtNum(cc.kwh, 1)} kWh × ${cc.ratePerKwh} × 100% = <b>{fmtMoney(cc.estimated, { precise: true })}</b>
              <br />
              <span className="text-ok">supported {fmtMoney(cc.supported, { precise: true })}</span> · <span className="text-warn">at risk {fmtMoney(cc.atRisk, { precise: true })}</span>
              {cc.excluded > 0 && <> · excluded {fmtMoney(cc.excluded, { precise: true })}</>}
            </div>
            <div className="mt-3">
              <PrototypeNote>Credit is computed per sale and per production lot. A line is supported only if every gating fact (capacity, claimant, §48C, sale treatment, lot-level MACR) is supported by evidence or resolved by review. Placeholder logic — not tax advice.</PrototypeNote>
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader
          title={`Credit lines (${cc.lines.length})`}
          subtitle="One line per sale × production lot."
          actions={
            <div className="flex gap-1.5">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={cc.lines.length}>All</FilterChip>
              <FilterChip active={filter === "supported"} onClick={() => setFilter("supported")} count={cc.lines.filter((l) => l.status === "supported").length}>Supported</FilterChip>
              <FilterChip active={filter === "at_risk"} onClick={() => setFilter("at_risk")} count={cc.lines.filter((l) => l.status === "at_risk").length}>At risk</FilterChip>
            </div>
          }
        />
        <CreditLinesTable lines={lines} />
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function BomTab({ id }: { id: ID }) {
  const { dataset, analysis } = useWorkspace();
  const versions = dataset.bomVersions.filter((b) => b.componentId === id);
  const [bomId, setBomId] = useState(versions.find((v) => v.status === "active")?.id ?? versions[0]?.id);
  const bom = versions.find((v) => v.id === bomId);
  if (!bom) return <Empty title="No BOM versions" />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <BomVersionTimeline versions={versions} value={bomId} onChange={setBomId} />
        <Link href={`/supply-chain?component=${id}&bom=${bomId}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-info hover:underline">
          Open in Supply Chain explorer <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      <Card>
        <CardHeader title={`BOM ${bom.version}`} subtitle={`${bom.changeSummary} · Approved ${bom.approvedBy}`} />
        <BomTable bom={bom} />
      </Card>
      <MacrPanel summary={analysis.macr[id].summary} focusBomId={bomId} />
    </div>
  );
}

export function RequirementsList({ ids }: { ids: ID[] }) {
  const { analysis } = useWorkspace();
  const { open } = useInspector();
  if (!ids.length) return <Empty title="Nothing outstanding" />;
  return (
    <div className="divide-y divide-line">
      {ids.map((rid) => {
        const r = analysis.evidence.requirements.find((x) => x.id === rid)!;
        return (
          <button key={rid} onClick={() => open({ kind: "requirement", id: rid })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle">
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-medium">{r.label}</div>
              <div className="truncate text-[11.5px] text-ink-3">{r.detail}</div>
            </div>
            <RequirementPill status={r.status} />
          </button>
        );
      })}
    </div>
  );
}

