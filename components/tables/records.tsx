"use client";

import type { ProductionBatch, SaleRecord } from "@/lib/domain/types";
import type { CreditLine } from "@/lib/compliance/types";
import { useWorkspace } from "@/lib/state/workspace";
import { useInspector, SourceLink } from "@/components/provenance/inspector";
import { bomVersionFor } from "@/lib/calculations/material-assistance";
import { IssueIds } from "@/lib/compliance/issue-ids";
import { fmtDate, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { Pill, cx } from "@/components/ui/primitives";

export function LotsTable({ batches, showComponent }: { batches: ProductionBatch[]; showComponent?: boolean }) {
  const { dataset, analysis } = useWorkspace();
  const { open } = useInspector();
  const soldByLot = new Map<string, number>();
  for (const s of dataset.sales) for (const a of s.allocations) soldByLot.set(a.batchId, (soldByLot.get(a.batchId) ?? 0) + a.quantity);
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Lot</th>
            {showComponent && <th>Component</th>}
            <th>Facility / line</th>
            <th>Production period</th>
            <th>BOM</th>
            <th className="r">Quantity</th>
            <th className="r">Sold (allocated)</th>
            <th>MACR window</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const comp = dataset.components.find((c) => c.id === b.componentId)!;
            const fac = dataset.facilities.find((f) => f.id === b.facilityId)!;
            const bom = bomVersionFor(dataset, b.componentId, b.productionDate);
            const w = analysis.macr[b.componentId]?.windowByBatch[b.id];
            const sold = soldByLot.get(b.id) ?? 0;
            return (
              <tr key={b.id} className="clickable" onClick={() => open({ kind: "source", id: b.mesSourceId })}>
                <td className="font-mono text-[12px]">{b.id}</td>
                {showComponent && <td className="font-medium">{comp.shortName}</td>}
                <td className="text-ink-2">
                  {fac.shortName}
                  <div className="text-[11px] text-ink-3">{fac.lines.find((l) => l.id === b.lineId)?.name}</div>
                </td>
                <td className="num whitespace-nowrap">
                  {fmtDate(b.productionDate)} – {fmtDate(b.periodEnd, { year: false })}
                </td>
                <td>{bom?.version ?? "—"}</td>
                <td className="r num">{fmtNum(b.quantity)}</td>
                <td className="r num text-ink-2">{sold ? fmtNum(sold) : "—"}</td>
                <td>
                  {w ? (
                    <Pill tone={w.result === "pass" ? "ok" : w.result === "fail" ? "bad" : "warn"}>
                      {w.result === "pass" ? "Pass" : w.result === "fail" ? "Fail" : "Pending evidence"} · {fmtPct(w.supportedRatio, 0)}
                    </Pill>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <SourceLink target={{ kind: "source", id: b.mesSourceId }} label="MES extract" />
                    {b.workOrderEvidenceId ? (
                      <SourceLink target={{ kind: "evidence", id: b.workOrderEvidenceId }} label="Work order" />
                    ) : (
                      <span className="text-[11.5px] font-medium text-bad">Work order missing</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SalesTable({ sales, showComponent }: { sales: SaleRecord[]; showComponent?: boolean }) {
  const { dataset, analysis, state } = useWorkspace();
  const { open } = useInspector();
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Invoice</th>
            {showComponent && <th>Component</th>}
            <th>Customer</th>
            <th>Sale date</th>
            <th className="r">Quantity</th>
            <th>Related party</th>
            <th>Match</th>
            <th>Lots</th>
            <th className="r">Credit</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => {
            const comp = dataset.components.find((c) => c.id === s.componentId)!;
            const lines = analysis.credit.byComponent.find((c) => c.componentId === s.componentId)?.lines.filter((l) => l.saleId === s.id) ?? [];
            const credit = lines.reduce((a, l) => a + l.credit, 0);
            const atRisk = lines.some((l) => l.status === "at_risk");
            const rpRes = state.resolutions[IssueIds.relatedParty(s.componentId)];
            return (
              <tr key={s.id} className="clickable" onClick={() => open({ kind: "source", id: s.sourceId })}>
                <td className="font-mono text-[12px]">{s.invoiceNumber}</td>
                {showComponent && <td className="font-medium">{comp.shortName}</td>}
                <td>
                  {s.customerName}
                  {s.matchNote && <div className="max-w-[260px] truncate text-[11px] text-bad">{s.matchNote}</div>}
                </td>
                <td className="num whitespace-nowrap">{fmtDate(s.saleDate)}</td>
                <td className="r num">{fmtNum(s.quantity)}</td>
                <td>
                  {s.relatedParty ? (
                    <Pill tone={rpRes?.state === "resolved" ? "ok" : "warn"}>{rpRes?.state === "resolved" ? "Related — reviewed" : "Related — review"}</Pill>
                  ) : (
                    <span className="text-[12px] text-ink-3">Unrelated</span>
                  )}
                </td>
                <td>{s.matchStatus === "matched" ? <Pill tone="ok">Matched</Pill> : <Pill tone="bad">Unmatched</Pill>}</td>
                <td className="text-[11.5px] text-ink-3 whitespace-nowrap">{s.allocations.length ? `${s.allocations.length} lot${s.allocations.length > 1 ? "s" : ""}` : "Unallocated"}</td>
                <td className={cx("r num", atRisk ? "text-warn" : "text-ink")}>{fmtMoney(credit)}</td>
                <td>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <SourceLink target={{ kind: "source", id: s.sourceId }} label="Sales register" />
                    {s.invoiceEvidenceId ? <SourceLink target={{ kind: "evidence", id: s.invoiceEvidenceId }} label="Invoice" /> : <span className="text-[11.5px] font-medium text-bad">No invoice</span>}
                    {s.contractEvidenceId && <SourceLink target={{ kind: "evidence", id: s.contractEvidenceId }} label="Contract" />}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CreditLinesTable({ lines }: { lines: CreditLine[] }) {
  const { dataset, analysis } = useWorkspace();
  const { open } = useInspector();
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Sale</th>
            <th>Lot</th>
            <th>BOM</th>
            <th className="r">Units</th>
            <th className="r">kWh</th>
            <th className="r">Rate</th>
            <th className="r">Credit</th>
            <th>Status</th>
            <th>Blocking issue</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const sale = dataset.sales.find((s) => s.id === l.saleId)!;
            return (
              <tr key={l.id}>
                <td>
                  <SourceLink target={{ kind: "source", id: sale.sourceId }} label={sale.invoiceNumber} className="font-mono" />
                  <div className="text-[11px] text-ink-3">
                    {sale.customerName} · {fmtDate(sale.saleDate)}
                  </div>
                </td>
                <td>{l.batchId ? <SourceLink target={{ kind: "source", id: dataset.batches.find((b) => b.id === l.batchId)!.mesSourceId }} label={l.batchId} className="font-mono" /> : <span className="text-[12px] text-bad">Unallocated</span>}</td>
                <td>{l.bomVersionId ? dataset.bomVersions.find((b) => b.id === l.bomVersionId)?.version : "—"}</td>
                <td className="r num">{fmtNum(l.units)}</td>
                <td className="r num">{fmtNum(l.kwh, 1)}</td>
                <td className="r num">${l.ratePerKwh}</td>
                <td className="r num font-medium">{fmtMoney(l.credit, { precise: true })}</td>
                <td>
                  <Pill tone={l.status === "supported" ? "ok" : l.status === "at_risk" ? "warn" : "mute"}>{l.status === "supported" ? "Supported" : l.status === "at_risk" ? "At risk" : "Excluded"}</Pill>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {l.blockers.map((b) => {
                      const i = analysis.issues.find((x) => x.id === b.issueId);
                      return (
                        <button key={b.issueId} onClick={() => open({ kind: "issue", id: b.issueId })} className="rounded border border-warn-line bg-warn-bg px-1.5 py-0.5 text-[11px] text-warn hover:border-warn">
                          {i?.riskLabel ?? b.issueId}
                          {l.blockers.length > 1 && ` · ${Math.round(b.share * 100)}%`}
                        </button>
                      );
                    })}
                    {l.excludedReason && <span className="text-[11.5px] text-ink-3">{l.excludedReason}</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
