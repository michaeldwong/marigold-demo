"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarRange, Search } from "lucide-react";
import type { ID, Supplier } from "@/lib/domain/types";
import { IssueIds } from "@/lib/compliance/issue-ids";
import { useWorkspace } from "@/lib/state/workspace";
import { useScopedAnalysis } from "@/lib/state/scope";
import { useInspector } from "@/components/provenance/inspector";
import { fmtMoney, fmtPct, fmtRange } from "@/lib/format";
import { Card, CardHeader, FilterChip, PageHeader, Select, Tabs } from "@/components/ui/primitives";
import { BOM_ROW, BomRowPill, PfePill, type BomRowStatus } from "@/components/ui/status";
import { BomTable, BomVersionTimeline, MacrPanel } from "./bom";

type Tab = "bom" | "suppliers";

/** Reads ?component= and ?bom= in the browser (static-export friendly). */
export function SupplyChainRoute() {
  const sp = useSearchParams();
  return <SupplyChainExplorer componentId={sp.get("component") ?? undefined} bomId={sp.get("bom") ?? undefined} />;
}

export function SupplyChainExplorer({ componentId, bomId }: { componentId?: string; bomId?: string }) {
  const { dataset, analysis } = useWorkspace();
  const { componentIds } = useScopedAnalysis();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("bom");
  const [lineFilter, setLineFilter] = useState<"all" | "issues">("all");
  const comps = dataset.components.filter((c) => c.bomVersionIds.length && componentIds.includes(c.id));
  const comp = comps.find((c) => c.id === componentId) ?? comps[0];
  const versions = dataset.bomVersions.filter((b) => b.componentId === comp?.id);
  const bom = versions.find((v) => v.id === bomId) ?? versions.find((v) => v.status === "active") ?? versions[0];

  const go = (c: ID, b?: ID) => router.replace(`/supply-chain?component=${c}${b ? `&bom=${b}` : ""}`, { scroll: false });

  return (
    <div>
      <PageHeader
        eyebrow="Supply chain"
        title="BOM & supplier explorer"
        subtitle="Versioned BOMs, the suppliers and ultimate parents behind every material, and how each line counts toward the material-assistance cost ratio."
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "bom", label: "BOM explorer" },
          { value: "suppliers", label: "Supplier exposure", count: dataset.suppliers.filter((s) => s.id !== "SUP-INT").length },
        ]}
      />
      <div className="mt-4">
        {tab === "bom" && comp && bom && (
          <div className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-start gap-4 px-4 py-3">
                <div>
                  <div className="eyebrow mb-1">Eligible component</div>
                  <Select label="Component" value={comp.id} onChange={(v) => go(v)} options={comps.map((c) => ({ value: c.id, label: c.name }))} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="eyebrow mb-1">BOM version</div>
                  <BomVersionTimeline versions={versions} value={bom.id} onChange={(b) => go(comp.id, b)} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-line bg-subtle px-4 py-2.5">
                <CalendarRange className="h-4 w-4 text-ink-3" />
                <span className="text-[14px] font-semibold">
                  {comp.shortName} · BOM {bom.version}
                </span>
                <span className="text-[13px] text-ink-2 num">Effective {fmtRange(bom.effective.from, bom.effective.to)}</span>
                <span className="text-[12px] text-ink-3">· {bom.changeSummary}</span>
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Bill of materials"
                subtitle="Click a row for supplier ownership, PFE status by year, attestations and every BOM that uses it."
                actions={
                  <div className="flex gap-1.5">
                    <FilterChip active={lineFilter === "all"} onClick={() => setLineFilter("all")} count={bom.lines.length}>
                      All lines
                    </FilterChip>
                    <FilterChip active={lineFilter === "issues"} onClick={() => setLineFilter("issues")}>
                      Lines with issues
                    </FilterChip>
                  </div>
                }
              />
              <BomTable bom={bom} filter={lineFilter} />
            </Card>
            <MacrPanel summary={analysis.macr[comp.id].summary} focusBomId={bom.id} />
          </div>
        )}
        {tab === "suppliers" && <SupplierExposure />}
      </div>
    </div>
  );
}

function supplierStatus(s: Supplier, openIssue: (id: ID) => boolean, year: number): BomRowStatus {
  const pfe = s.pfeStatusByYear[year];
  if (pfe === "pfe_risk" && openIssue(IssueIds.pfe(s.id))) return "pfe_risk";
  if (pfe === "review_required" && openIssue(IssueIds.pfe(s.id))) return "review_required";
  if (openIssue(IssueIds.attestationMissing(s.id))) return "missing_certification";
  if (openIssue(IssueIds.attestationGap(s.id))) return "attestation_expired";
  if (openIssue(IssueIds.einConflict(s.id))) return "conflicting";
  if (openIssue(IssueIds.ownership(s.id))) return "ownership_unknown";
  if (openIssue(IssueIds.attestationExpiring(s.id))) return "attestation_expiring";
  return "clear";
}

function SupplierExposure() {
  const { dataset, analysis, state } = useWorkspace();
  const { open } = useInspector();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BomRowStatus | "all">("all");
  const openIssue = (id: ID) => analysis.issues.some((i) => i.id === id) && state.resolutions[id]?.state !== "resolved";

  const rows = useMemo(() => {
    return dataset.suppliers
      .filter((s) => s.id !== "SUP-INT")
      .map((s) => {
        // Production-weighted annual spend across all in-scope MACR windows.
        let spend = 0;
        let total = 0;
        const comps = new Set<string>();
        for (const m of Object.values(analysis.macr)) {
          for (const w of m.summary.windows) {
            total += w.denominatorPerUnit * w.unitsProduced;
            for (const l of w.lines.filter((x) => x.supplierId === s.id)) {
              spend += l.unitCost * w.unitsProduced;
              comps.add(m.summary.componentId);
            }
          }
        }
        const atts = dataset.evidence.filter((e) => e.attestation?.supplierId === s.id);
        const latest = atts.map((a) => a.attestation!.coverage.to ?? "").sort().at(-1);
        const atRisk = analysis.issues.filter((i) => i.supplierId === s.id).reduce((a, i) => a + (analysis.credit.atRiskByIssue.find((x) => x.issueId === i.id)?.amount ?? 0), 0);
        return { s, spend, share: total ? spend / total : 0, comps: [...comps], latest, status: supplierStatus(s, openIssue, dataset.taxYear), atRisk };
      })
      .sort((a, b) => b.atRisk - a.atRisk || b.spend - a.spend);
  }, [dataset, analysis, state.resolutions]);

  const shown = rows.filter((r) => (status === "all" || r.status === status) && (!q || `${r.s.name} ${r.s.id} ${r.s.ultimateParent.value ?? ""} ${r.s.aliases.join(" ")}`.toLowerCase().includes(q.toLowerCase())));
  const statuses = [...new Set(rows.map((r) => r.status))];
  const flaggedSpend = rows.filter((r) => r.status !== "clear" && r.status !== "attestation_expiring").reduce((a, r) => a + r.spend, 0);
  const totalSpend = rows.reduce((a, r) => a + r.spend, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="px-4 py-3">
          <div className="eyebrow">Direct material spend in scope</div>
          <div className="mt-1 text-[20px] font-semibold num">{fmtMoney(totalSpend)}</div>
          <div className="text-[11.5px] text-ink-3">Production-weighted, all eligible components</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="eyebrow">Spend with flagged suppliers</div>
          <div className="mt-1 text-[20px] font-semibold text-warn num">{fmtMoney(flaggedSpend)}</div>
          <div className="text-[11.5px] text-ink-3">{fmtPct(totalSpend ? flaggedSpend / totalSpend : 0)} — PFE risk, ownership unknown, or evidence gaps</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="eyebrow">Suppliers requiring action</div>
          <div className="mt-1 text-[20px] font-semibold num">{rows.filter((r) => r.status !== "clear").length}</div>
          <div className="text-[11.5px] text-ink-3">of {rows.length} suppliers on in-scope BOMs</div>
        </Card>
      </div>
      <Card>
        <CardHeader
          title="Supplier exposure"
          subtitle="Each supplier's spend share, ownership resolution, PFE status and evidence coverage — ranked by credit at risk."
          actions={
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter suppliers" className="h-7 w-48 rounded-md border border-line-strong pr-2 pl-7 text-[12px] outline-none focus:border-info" />
            </div>
          }
        />
        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
          <FilterChip active={status === "all"} onClick={() => setStatus("all")} count={rows.length}>
            All
          </FilterChip>
          {statuses.map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(s)} count={rows.filter((r) => r.status === s).length}>
              {BOM_ROW[s].label}
            </FilterChip>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Supplier facility</th>
                <th>Ultimate parent</th>
                <th>PFE {dataset.taxYear}</th>
                <th>PFE {dataset.taxYear + 1}</th>
                <th>Used in</th>
                <th className="r">Spend</th>
                <th className="r">Share</th>
                <th>Attestation through</th>
                <th className="r">Credit at risk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ s, spend, share, comps, latest, status: st, atRisk }) => (
                <tr key={s.id} className="clickable" onClick={() => open({ kind: "supplier", id: s.id })}>
                  <td>
                    <div className="font-medium">{s.name}</div>
                    <div className="font-mono text-[11px] text-ink-3">{s.id}</div>
                  </td>
                  <td className="text-ink-2">
                    {s.facilities[0].city}, {s.facilities[0].country}
                  </td>
                  <td className={s.ultimateParent.kind === "missing" ? "font-medium text-bad" : s.ultimateParent.kind === "assumption" ? "text-warn" : ""}>
                    {s.ultimateParent.value ?? "Unknown"}
                    <div className="text-[11px] text-ink-3">{s.ultimateParentCountry ?? "—"}</div>
                  </td>
                  <td>
                    <PfePill status={s.pfeStatusByYear[dataset.taxYear] ?? "not_evaluated"} />
                  </td>
                  <td>
                    <PfePill status={s.pfeStatusByYear[dataset.taxYear + 1] ?? "not_evaluated"} />
                  </td>
                  <td className="text-[12px]">{comps.map((c) => dataset.components.find((x) => x.id === c)?.shortName).join(", ") || <span className="text-ink-4">Superseded BOM only</span>}</td>
                  <td className="r num">{spend ? fmtMoney(spend) : "—"}</td>
                  <td className="r num text-ink-2">{share ? fmtPct(share) : "—"}</td>
                  <td className="num whitespace-nowrap text-[12px]">{latest ? latest : <span className="font-medium text-bad">None</span>}</td>
                  <td className="r num font-medium text-bad">{atRisk ? fmtMoney(atRisk) : <span className="text-ink-4">—</span>}</td>
                  <td>
                    <BomRowPill status={st} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
