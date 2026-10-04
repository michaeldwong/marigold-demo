"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { BomVersion, ID } from "@/lib/domain/types";
import type { MacrLineResult, MacrSummary } from "@/lib/compliance/types";
import { contextFor, useWorkspace } from "@/lib/state/workspace";
import { useInspector, SourceLink } from "@/components/provenance/inspector";
import { evaluateBomLine } from "@/lib/calculations/material-assistance";
import { IssueIds } from "@/lib/compliance/issue-ids";
import { fmtMoney, fmtNum, fmtPct, fmtRange, fmtUsd } from "@/lib/format";
import { Card, CardHeader, Pill, PrototypeNote, Tip, cx } from "@/components/ui/primitives";
import { BomRowPill, PfePill, type BomRowStatus } from "@/components/ui/status";

/* -------------------------------------------------------------------------- */
/* BOM version timeline                                                       */
/* -------------------------------------------------------------------------- */

export function BomVersionTimeline({ versions, value, onChange }: { versions: BomVersion[]; value: ID; onChange: (id: ID) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {versions.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={cx(
            "w-full rounded-md border px-3 py-2 text-left transition sm:w-auto sm:min-w-[180px]",
            v.id === value ? "border-ink bg-surface shadow-sm" : "border-line bg-subtle hover:border-line-strong",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold">BOM {v.version}</span>
            <Pill tone={v.status === "active" ? "ok" : v.status === "superseded" ? "mute" : "info"}>{v.status}</Pill>
          </div>
          <div className="mt-0.5 text-[11.5px] text-ink-3 num">Effective {fmtRange(v.effective.from, v.effective.to)}</div>
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Row status                                                                 */
/* -------------------------------------------------------------------------- */

export function useBomLineEvaluation(bom: BomVersion) {
  const { dataset, analysis, state } = useWorkspace();
  const windows = analysis.macr[bom.componentId]?.summary.windows.filter((w) => w.bomVersionId === bom.id) ?? [];
  const units = windows.reduce((s, w) => s + w.unitsProduced, 0);
  const ctx = contextFor(state);
  const evalFor = (lineId: ID): MacrLineResult[] => {
    if (windows.length) return windows.map((w) => w.lines.find((l) => l.bomLineId === lineId)!).filter(Boolean);
    const line = bom.lines.find((l) => l.id === lineId)!;
    return [evaluateBomLine(dataset, ctx, line, bom.effective.from, bom.effective.to ?? dataset.asOf)];
  };
  const status = (lineId: ID): { status: BomRowStatus; results: MacrLineResult[] } => {
    const results = evalFor(lineId);
    const line = bom.lines.find((l) => l.id === lineId)!;
    const sup = dataset.suppliers.find((s) => s.id === line.supplierId)!;
    const year = Number(bom.effective.from.slice(0, 4));
    const open = (id: ID) => analysis.issues.some((i) => i.id === id) && state.resolutions[id]?.state !== "resolved";
    const ids = new Set(results.flatMap((r) => r.issueIds));
    let s: BomRowStatus = "clear";
    if (results.some((r) => r.treatment === "non_qualifying")) s = sup.pfeStatusByYear[year] === "pfe_risk" ? "pfe_risk" : "review_required";
    else if ([...ids].some((id) => id === IssueIds.attestationMissing(sup.id))) s = "missing_certification";
    else if ([...ids].some((id) => id === IssueIds.attestationGap(sup.id))) s = "attestation_expired";
    else if ([...ids].some((id) => id === IssueIds.einConflict(sup.id))) s = "conflicting";
    else if ([...ids].some((id) => id === IssueIds.ownership(sup.id))) s = "ownership_unknown";
    else if (bom.effective.to === null && open(IssueIds.attestationExpiring(sup.id))) s = "attestation_expiring";
    return { status: s, results };
  };
  return { windows, units, status };
}

/* -------------------------------------------------------------------------- */
/* BOM table                                                                  */
/* -------------------------------------------------------------------------- */

export function BomTable({ bom, filter = "all" }: { bom: BomVersion; filter?: "all" | "issues" }) {
  const { dataset } = useWorkspace();
  const { open } = useInspector();
  const { units, status } = useBomLineEvaluation(bom);
  const total = bom.lines.reduce((s, l) => s + (l.unitCost.value ?? 0), 0);
  const rows = bom.lines.map((l) => ({ l, ...status(l.id) })).filter((r) => filter === "all" || r.status !== "clear");
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Supplier</th>
            <th>Ultimate parent</th>
            <th>Country</th>
            <th>PFE status</th>
            <th className="r">Cost / unit</th>
            <th className="r">Share</th>
            <th>MACR treatment</th>
            <th>Evidence</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ l, status: st, results }) => {
            const mat = dataset.materials.find((m) => m.id === l.materialId)!;
            const sup = dataset.suppliers.find((s) => s.id === l.supplierId)!;
            const year = Number(bom.effective.from.slice(0, 4));
            const treatments = [...new Set(results.map((r) => r.treatment))];
            const atts = dataset.evidence.filter((e) => e.attestation?.supplierId === sup.id);
            return (
              <tr key={l.id} className="clickable" onClick={() => open({ kind: "supplier", id: sup.id })}>
                <td className="min-w-[220px]">
                  <div className="font-medium">{mat.name}</div>
                  <div className="text-[11px] text-ink-3">
                    {mat.partNumber} · {l.quantityPerUnit}
                  </div>
                </td>
                <td className="min-w-[210px]">
                  <div>{sup.name}</div>
                  <div className="text-[11px] text-ink-3">
                    <span className="font-mono">{sup.id}</span> · {sup.facilities[0].city}
                  </div>
                </td>
                <td className={cx("min-w-[170px]", sup.ultimateParent.kind === "missing" && "font-medium text-bad", sup.ultimateParent.kind === "assumption" && "text-warn")}>
                  {sup.ultimateParent.value ?? "Unknown"}
                  {sup.ultimateParent.kind === "assumption" && <div className="text-[11px]">Reported — unverified</div>}
                </td>
                <td className="whitespace-nowrap">{sup.ultimateParentCountry ?? sup.country}</td>
                <td>
                  <PfePill status={sup.pfeStatusByYear[year] ?? "not_evaluated"} />
                </td>
                <td className="r num whitespace-nowrap">
                  {fmtUsd(l.unitCost.value ?? 0)}
                  {l.unitCost.sourceId && (
                    <span className="ml-1">
                      <SourceLink target={{ kind: "source", id: l.unitCost.sourceId }} label="↗" />
                    </span>
                  )}
                </td>
                <td className="r num text-ink-2">{fmtPct((l.unitCost.value ?? 0) / total)}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {treatments.map((t) => (
                      <Tip key={t} content={results.find((r) => r.treatment === t)?.reason} width={240}>
                        <Pill tone={t === "qualifying" ? "ok" : t === "pending" ? "warn" : "bad"}>{t === "qualifying" ? "Numerator" : t === "pending" ? "Pending" : "Excluded"}</Pill>
                      </Tip>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap text-[12px]">
                  {sup.id === "SUP-INT" ? <span className="text-ink-3">MES records</span> : atts.length ? `${atts.length} attestation${atts.length > 1 ? "s" : ""}` : <span className="font-medium text-bad">None</span>}
                </td>
                <td>
                  <BomRowPill status={st} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="border-t border-line bg-subtle px-3 py-2 text-[12px] text-ink-3">
              {bom.lines.length} lines · {units ? `${fmtNum(units)} units produced in scope under this version` : "no in-scope production"}
            </td>
            <td className="r border-t border-line bg-subtle px-3 py-2 font-semibold num">{fmtUsd(total)}</td>
            <td colSpan={4} className="border-t border-line bg-subtle" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MACR panel                                                                 */
/* -------------------------------------------------------------------------- */

export function MacrPanel({ summary, focusBomId }: { summary: MacrSummary; focusBomId?: ID }) {
  const { dataset, analysis } = useWorkspace();
  const { open } = useInspector();
  const [expanded, setExpanded] = useState<string | null>(null);
  const comp = dataset.components.find((c) => c.id === summary.componentId)!;
  if (summary.result === "not_applicable") {
    return (
      <Card>
        <CardHeader title={`Material assistance analysis — ${dataset.taxYear}`} />
        <div className="px-4 py-4 text-[12.5px] text-ink-3">Not applicable / not evaluated for this component.</div>
      </Card>
    );
  }
  const pass = summary.result === "pass";
  return (
    <Card>
      <CardHeader
        eyebrow={comp.shortName}
        title={`Material assistance analysis — ${dataset.taxYear}`}
        subtitle="Production-weighted across BOM versions and supplier-evidence windows."
        actions={<Pill tone={pass ? "ok" : summary.result === "fail" ? "bad" : "warn"}>{pass ? "Pass*" : summary.result === "fail" ? "Fail*" : "Pass pending evidence*"}</Pill>}
      />
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-4">
        <div>
          <div className="eyebrow">Qualifying numerator</div>
          <div className="mt-1 text-[17px] font-semibold num">{fmtMoney(summary.supportedNumerator)}</div>
          <div className="text-[11px] text-ink-3 num">{fmtMoney(summary.potentialNumerator)} if pending resolves</div>
        </div>
        <div>
          <div className="eyebrow">Total denominator</div>
          <div className="mt-1 text-[17px] font-semibold num">{fmtMoney(summary.denominator)}</div>
          <div className="text-[11px] text-ink-3">direct material cost</div>
        </div>
        <div>
          <div className="eyebrow">Calculated ratio</div>
          <div className={cx("mt-1 text-[17px] font-semibold num", summary.supportedRatio >= summary.threshold ? "text-ok" : "text-warn")}>{fmtPct(summary.supportedRatio)}</div>
          <div className="text-[11px] text-ink-3 num">{fmtPct(summary.potentialRatio)} potential</div>
        </div>
        <div>
          <div className="eyebrow flex items-center gap-1">
            {dataset.taxYear} threshold <SourceLink target={{ kind: "citation", id: "CIT-MACR-THRESHOLDS" }} label="ⓘ" />
          </div>
          <div className="mt-1 text-[17px] font-semibold num">{fmtPct(summary.threshold)}</div>
          <div className="text-[11px] text-ink-3">qualifying battery component</div>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-line">
        <table className="data-table">
          <thead>
            <tr>
              <th />
              <th>Window</th>
              <th>BOM</th>
              <th className="r">Units</th>
              <th className="r">Supported</th>
              <th className="r">Potential</th>
              <th>Result</th>
              <th>Blocking issues</th>
            </tr>
          </thead>
          <tbody>
            {summary.windows.map((w) => {
              const bom = dataset.bomVersions.find((b) => b.id === w.bomVersionId)!;
              const isOpen = expanded === w.key;
              return (
                <Fragment key={w.key}>
                  <tr className={cx("clickable", focusBomId && focusBomId !== w.bomVersionId && "opacity-60")} onClick={() => setExpanded(isOpen ? null : w.key)}>
                    <td className="w-6">{isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                    <td className="whitespace-nowrap num">{fmtRange(w.from, w.to)}</td>
                    <td>{bom.version}</td>
                    <td className="r num">{fmtNum(w.unitsProduced)}</td>
                    <td className={cx("r num font-medium", w.supportedRatio >= w.threshold ? "text-ok" : "text-warn")}>{fmtPct(w.supportedRatio)}</td>
                    <td className="r num text-ink-2">{fmtPct(w.potentialRatio)}</td>
                    <td>
                      <Pill tone={w.result === "pass" ? "ok" : w.result === "fail" ? "bad" : "warn"}>{w.result === "pass" ? "Pass" : w.result === "fail" ? "Fail" : "Pending evidence"}</Pill>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {w.blockingShares.map((b) => (
                          <button
                            key={b.issueId}
                            onClick={(e) => {
                              e.stopPropagation();
                              open({ kind: "issue", id: b.issueId });
                            }}
                            className="rounded border border-warn-line bg-warn-bg px-1.5 py-0.5 text-[11px] text-warn"
                          >
                            {analysis.issues.find((i) => i.id === b.issueId)?.riskLabel} · {Math.round(b.share * 100)}%
                          </button>
                        ))}
                        {!w.blockingShares.length && <span className="text-[12px] text-ink-4">—</span>}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className="bg-subtle">
                        <div className="overflow-x-auto rounded border border-line bg-surface">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Material</th>
                                <th>Supplier</th>
                                <th className="r">Denominator / unit</th>
                                <th className="r">Numerator / unit</th>
                                <th className="r">Annual denominator</th>
                                <th>Treatment & reason</th>
                                <th>Source</th>
                              </tr>
                            </thead>
                            <tbody>
                              {w.lines.map((l) => {
                                const bl = bom.lines.find((x) => x.id === l.bomLineId)!;
                                return (
                                  <tr key={l.bomLineId}>
                                    <td>{dataset.materials.find((m) => m.id === l.materialId)?.name}</td>
                                    <td>{dataset.suppliers.find((s) => s.id === l.supplierId)?.name}</td>
                                    <td className="r num">{fmtUsd(l.unitCost)}</td>
                                    <td className={cx("r num", l.treatment === "qualifying" ? "text-ok" : "text-ink-4")}>{l.treatment === "qualifying" ? fmtUsd(l.unitCost) : l.treatment === "pending" ? `(${fmtUsd(l.unitCost)})` : "—"}</td>
                                    <td className="r num">{fmtMoney(l.unitCost * w.unitsProduced)}</td>
                                    <td>
                                      <Pill tone={l.treatment === "qualifying" ? "ok" : l.treatment === "pending" ? "warn" : "bad"}>{l.treatment.replace("_", "-")}</Pill>
                                      <div className="mt-0.5 max-w-[340px] text-[11px] text-ink-3">{l.reason}</div>
                                    </td>
                                    <td>{bl.unitCost.sourceId && <SourceLink target={{ kind: "source", id: bl.unitCost.sourceId }} label="BOM row" />}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-4 py-3">
        <PrototypeNote>
          * Prototype calculation only. Final policy logic has not been implemented. Simplified ratio of qualifying to total direct material cost; supplier qualification policy, threshold-year basis and safe harbors are placeholders pending advisor-reviewed rules. Threshold sourced from the diligence paper, not official guidance.
        </PrototypeNote>
      </div>
    </Card>
  );
}
