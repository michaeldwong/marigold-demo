"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { ID } from "@/lib/domain/types";
import { batchesInScope, bomVersionFor } from "@/lib/calculations/material-assistance";
import { yearOf } from "@/lib/calculations/dates";
import { useWorkspace } from "@/lib/state/workspace";
import { useScopedAnalysis } from "@/lib/state/scope";
import { fmtMoney, fmtNum } from "@/lib/format";
import { Card, CardHeader, FilterChip, PageHeader, PrototypeNote, Select, Tabs } from "@/components/ui/primitives";
import { LotsTable, SalesTable } from "./records";

type Tab = "reconciliation" | "lots" | "sales";

export function ProductionSalesPage() {
  const { dataset } = useWorkspace();
  const { componentIds } = useScopedAnalysis();
  const [tab, setTab] = useState<Tab>("reconciliation");
  const [comp, setComp] = useState<ID | "all">("all");
  const [q, setQ] = useState("");
  const [saleFilter, setSaleFilter] = useState<"all" | "related" | "unmatched">("all");
  const comps = dataset.components.filter((c) => componentIds.includes(c.id) && c.bomVersionIds.length);
  const inComp = (id: ID) => (comp === "all" ? componentIds.includes(id) : id === comp);
  const lots = batchesInScope(dataset).filter((b) => inComp(b.componentId) && (!q || `${b.id} ${b.workOrder}`.toLowerCase().includes(q.toLowerCase())));
  const sales = dataset.sales
    .filter((s) => yearOf(s.saleDate) === dataset.taxYear && inComp(s.componentId))
    .filter((s) => saleFilter === "all" || (saleFilter === "related" ? s.relatedParty : s.matchStatus === "unmatched"))
    .filter((s) => !q || `${s.invoiceNumber} ${s.customerName}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow="Operational records"
        title="Production & Sales"
        subtitle="MES production lots and ERP sales records, reconciled. Credit requires that a component was produced in the U.S. and sold — capacity and output are not the same thing."
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "reconciliation", label: "Reconciliation" },
          { value: "lots", label: "Production lots", count: batchesInScope(dataset).filter((b) => componentIds.includes(b.componentId)).length },
          { value: "sales", label: "Sale records", count: dataset.sales.filter((s) => yearOf(s.saleDate) === dataset.taxYear && componentIds.includes(s.componentId)).length },
        ]}
      />
      {tab !== "reconciliation" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Select<ID | "all"> label="Component" value={comp} onChange={setComp} options={[{ value: "all", label: "All components" }, ...comps.map((c) => ({ value: c.id, label: c.name }))]} />
          {tab === "sales" && (
            <>
              <FilterChip active={saleFilter === "all"} onClick={() => setSaleFilter("all")}>
                All sales
              </FilterChip>
              <FilterChip active={saleFilter === "related"} onClick={() => setSaleFilter("related")}>
                Related party
              </FilterChip>
              <FilterChip active={saleFilter === "unmatched"} onClick={() => setSaleFilter("unmatched")}>
                Unmatched
              </FilterChip>
            </>
          )}
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "lots" ? "Lot or work order" : "Invoice or customer"} className="h-8 w-52 rounded-md border border-line-strong pr-2 pl-7 text-[12.5px] outline-none focus:border-info" />
          </div>
        </div>
      )}
      <div className="mt-4">
        {tab === "reconciliation" && <Reconciliation />}
        {tab === "lots" && (
          <Card>
            <CardHeader title="Production lots" subtitle="Click a row for the MES source record." />
            <LotsTable batches={lots} showComponent />
          </Card>
        )}
        {tab === "sales" && (
          <Card>
            <CardHeader title="Sale records" subtitle="Click a row for the ERP sales-register record." />
            <SalesTable sales={sales} showComponent />
          </Card>
        )}
      </div>
    </div>
  );
}

function Reconciliation() {
  const { dataset, analysis } = useWorkspace();
  const { componentIds } = useScopedAnalysis();
  const lots = batchesInScope(dataset);
  const rows = dataset.components
    .filter((c) => componentIds.includes(c.id) && c.bomVersionIds.length)
    .flatMap((c) =>
      dataset.bomVersions
        .filter((b) => b.componentId === c.id)
        .map((b) => {
          const vlots = lots.filter((l) => l.componentId === c.id && bomVersionFor(dataset, c.id, l.productionDate)?.id === b.id);
          const produced = vlots.reduce((s, l) => s + l.quantity, 0);
          const sold2027 = dataset.sales
            .filter((s) => yearOf(s.saleDate) === dataset.taxYear)
            .flatMap((s) => s.allocations)
            .filter((a) => vlots.some((l) => l.id === a.batchId))
            .reduce((s, a) => s + a.quantity, 0);
          const credit = analysis.credit.byComponent.find((x) => x.componentId === c.id)?.lines.filter((l) => l.bomVersionId === b.id) ?? [];
          return { c, b, produced, sold2027, credit };
        })
        .filter((r) => r.produced > 0),
    );
  const transfers = lots.filter((l) => l.componentId === "CMP-VM16").reduce((s, l) => s + l.quantity * 18, 0);
  const unallocated = dataset.sales.filter((s) => yearOf(s.saleDate) === dataset.taxYear && !s.allocations.length && componentIds.includes(s.componentId));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Produced → sold → credit, by BOM version" subtitle="Units produced under each BOM version (in scope), units from those lots sold in 2027, and resulting credit status." />
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>BOM</th>
                <th className="r">Produced</th>
                <th className="r">Sold in 2027</th>
                <th className="r">Unsold / other</th>
                <th className="r">Credit supported</th>
                <th className="r">Credit at risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, b, produced, sold2027, credit }) => (
                <tr key={b.id}>
                  <td className="font-medium">{c.shortName}</td>
                  <td>
                    {b.version} <span className="text-[11px] text-ink-3">{b.status}</span>
                  </td>
                  <td className="r num">{fmtNum(produced)}</td>
                  <td className="r num">{fmtNum(sold2027)}</td>
                  <td className="r num text-ink-3">{fmtNum(produced - sold2027)}</td>
                  <td className="r num text-ok">{fmtMoney(credit.filter((l) => l.status === "supported").reduce((s, l) => s + l.credit, 0))}</td>
                  <td className="r num text-warn">{fmtMoney(credit.filter((l) => l.status === "at_risk").reduce((s, l) => s + l.credit, 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="px-4 py-3">
          <div className="eyebrow">Internal transfers (not sales)</div>
          <div className="mt-1 text-[18px] font-semibold num">{fmtNum(transfers)} VX-P280 cells</div>
          <div className="text-[12px] text-ink-3">Consigned to Lakeshore for VM-16 assembly (18 per module). Excluded from VX-P280 cell credit; integration treatment is part of the VM-16 professional-review item.</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="eyebrow">Sales not allocated to production</div>
          <div className="mt-1 text-[18px] font-semibold text-bad num">{fmtNum(unallocated.reduce((s, x) => s + x.quantity, 0))} units</div>
          <div className="text-[12px] text-ink-3">{unallocated.map((s) => `${s.invoiceNumber} (${s.customerName})`).join(", ") || "None"}</div>
        </Card>
      </div>
      <PrototypeNote>Lot allocation uses a mock FIFO matcher (earliest lot with remaining quantity, same component). A real implementation would use shipment-level lot traceability from ERP/WMS.</PrototypeNote>
    </div>
  );
}
