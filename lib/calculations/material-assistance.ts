/**
 * Material-assistance cost ratio (MACR) — PROTOTYPE CALCULATION.
 *
 * PLACEHOLDER ONLY.
 * This logic is for demonstrating the product workflow. It must eventually be
 * replaced by advisor-reviewed, versioned regulatory logic (including the
 * official MACR formula, safe-harbor tables, certification rules, and the
 * correct threshold-year basis).
 *
 * Simplified model used here:
 *   ratio = Σ cost of qualifying BOM lines / Σ cost of all BOM lines
 * evaluated per production lot, using the BOM version and the supplier
 * evidence in effect on that lot's production dates. A line's treatment is:
 *   - qualifying:     internal U.S. production, or a supplier attestation covers
 *                     the lot dates AND the ultimate parent is known AND the
 *                     supplier is not flagged as a possible PFE
 *   - pending:        evidence is missing/expired/conflicting or ownership is
 *                     unknown — counted only in the "potential" ratio
 *   - non_qualifying: supplier flagged as possible PFE, or PFE review not
 *                     completed (conservative assumption, shown explicitly)
 */

import type { BomLine, BomVersion, ID, ISODate, ManufacturerDataset, ProductionBatch } from "@/lib/domain/types";
import type { ComplianceContext, MacrLineResult, MacrSummary, MacrWindow } from "@/lib/compliance/types";
import { IssueIds } from "@/lib/compliance/issue-ids";
import { covers, inEffect, yearOf } from "./dates";

/** Thresholds per sale year — sourced from the diligence paper, not official guidance (see CIT-MACR-THRESHOLDS). */
export const MACR_THRESHOLDS: Record<number, number> = { 2026: 0.6, 2027: 0.65, 2028: 0.7, 2029: 0.8 };

export function macrThreshold(year: number): number {
  if (year < 2026) return 0;
  return MACR_THRESHOLDS[year] ?? 0.85;
}

export function bomVersionFor(ds: ManufacturerDataset, componentId: ID, date: ISODate): BomVersion | undefined {
  return ds.bomVersions.find((b) => b.componentId === componentId && inEffect(b.effective.from, b.effective.to, date));
}

/** Lots that matter for the tax year: produced in the year, or produced earlier and sold in the year. */
export function batchesInScope(ds: ManufacturerDataset): ProductionBatch[] {
  const soldLots = new Set(
    ds.sales.filter((s) => yearOf(s.saleDate) === ds.taxYear).flatMap((s) => s.allocations.map((a) => a.batchId)),
  );
  return ds.batches.filter((b) => yearOf(b.productionDate) === ds.taxYear || soldLots.has(b.id));
}

export function supplierAttestations(ds: ManufacturerDataset, supplierId: ID) {
  return ds.evidence.filter(
    (e) => e.category === "supplier_attestation" && e.attestation?.supplierId === supplierId && e.status !== "superseded",
  );
}

export function evaluateBomLine(
  ds: ManufacturerDataset,
  ctx: ComplianceContext,
  line: BomLine,
  from: ISODate,
  to: ISODate,
): MacrLineResult {
  const sup = ds.suppliers.find((s) => s.id === line.supplierId)!;
  const base = { bomLineId: line.id, materialId: line.materialId, supplierId: sup.id, unitCost: line.unitCost.value ?? 0 };
  const resolution = (id: ID) => ctx.resolutions[id];
  const settled = (id: ID): MacrLineResult | null => {
    const r = resolution(id);
    if (r?.state !== "resolved") return null;
    return r.outcome === "not_substantiated"
      ? { ...base, treatment: "non_qualifying", reason: `Resolved as not substantiated by ${r.by}`, issueIds: [id] }
      : { ...base, treatment: "qualifying", reason: `Substantiated — accepted by ${r.by}`, issueIds: [] };
  };

  if (sup.id === "SUP-INT") {
    return { ...base, treatment: "qualifying", reason: "Internal production at a U.S. facility (MES production records)", issueIds: [] };
  }

  const pfe = sup.pfeStatusByYear[yearOf(from)] ?? "not_evaluated";
  if (pfe === "pfe_risk" || pfe === "review_required") {
    const id = IssueIds.pfe(sup.id);
    const s = settled(id);
    if (s) return s;
    return {
      ...base,
      treatment: "non_qualifying",
      reason:
        pfe === "pfe_risk"
          ? "Possible prohibited foreign entity — excluded from qualifying numerator"
          : "Assumption: treated as non-qualifying until PFE review is completed",
      issueIds: [id],
    };
  }

  const atts = supplierAttestations(ds, sup.id);
  const cover = atts.find((a) => covers(a.attestation!.coverage.from, a.attestation!.coverage.to, from, to));
  if (!cover) {
    const id = atts.length ? IssueIds.attestationGap(sup.id) : IssueIds.attestationMissing(sup.id);
    const s = settled(id);
    if (s) return s;
    return {
      ...base,
      treatment: "pending",
      reason: atts.length ? `No supplier attestation covers ${from} – ${to}` : "No supplier attestation received",
      issueIds: [id],
    };
  }
  if (cover.status === "conflicting") {
    const id = IssueIds.einConflict(sup.id);
    const s = settled(id);
    if (s) return s;
    return { ...base, treatment: "pending", reason: "Attestation conflicts with supplier master (EIN mismatch)", issueIds: [id] };
  }
  if (sup.ultimateParent.kind !== "known") {
    const id = IssueIds.ownership(sup.id);
    const s = settled(id);
    if (s) return s;
    return {
      ...base,
      treatment: "pending",
      reason:
        sup.ultimateParent.kind === "assumption"
          ? `Ultimate parent reported but not verified (${sup.ultimateParent.value})`
          : "Ultimate parent unknown — PFE status cannot be determined",
      issueIds: [id],
    };
  }
  return {
    ...base,
    treatment: "qualifying",
    reason: `Attestation ${cover.fileName} covers period; ultimate parent ${sup.ultimateParent.value}`,
    issueIds: [],
  };
}

interface BatchMacr {
  bom: BomVersion;
  lines: MacrLineResult[];
  denominator: number;
  supported: number;
  potential: number;
}

function evaluateBatch(ds: ManufacturerDataset, ctx: ComplianceContext, batch: ProductionBatch): BatchMacr | null {
  const bom = bomVersionFor(ds, batch.componentId, batch.productionDate);
  if (!bom) return null;
  const lines = bom.lines.map((l) => evaluateBomLine(ds, ctx, l, batch.productionDate, batch.periodEnd));
  const denominator = lines.reduce((s, l) => s + l.unitCost, 0);
  const supported = lines.filter((l) => l.treatment === "qualifying").reduce((s, l) => s + l.unitCost, 0);
  const pending = lines.filter((l) => l.treatment === "pending").reduce((s, l) => s + l.unitCost, 0);
  return { bom, lines, denominator, supported, potential: supported + pending };
}

/**
 * Greedy minimal blocking set: add pending lines (largest cost first) until the
 * ratio clears the threshold. At-risk credit is attributed to those issues pro
 * rata by line cost. PLACEHOLDER attribution method.
 */
function blockingSet(b: BatchMacr, threshold: number) {
  if (b.supported / b.denominator >= threshold) return { ids: [] as ID[], shares: [] as MacrWindow["blockingShares"] };
  const pending = b.lines.filter((l) => l.treatment === "pending").sort((x, y) => y.unitCost - x.unitCost);
  let acc = b.supported;
  const chosen: MacrLineResult[] = [];
  for (const l of pending) {
    if (acc / b.denominator >= threshold) break;
    chosen.push(l);
    acc += l.unitCost;
  }
  const total = chosen.reduce((s, l) => s + l.unitCost, 0);
  const shareMap = new Map<ID, number>();
  for (const l of chosen) {
    for (const id of l.issueIds) shareMap.set(id, (shareMap.get(id) ?? 0) + l.unitCost / total / l.issueIds.length);
  }
  return { ids: [...shareMap.keys()], shares: [...shareMap].map(([issueId, share]) => ({ issueId, share })) };
}

export interface MaterialAssistanceResult {
  summary: MacrSummary;
  windowByBatch: Record<ID, MacrWindow>;
}

export function evaluatePFEMaterialAssistance(
  ds: ManufacturerDataset,
  ctx: ComplianceContext,
  componentId: ID,
  saleYear: number = ds.taxYear,
): MaterialAssistanceResult {
  const comp = ds.components.find((c) => c.id === componentId)!;
  const threshold = macrThreshold(saleYear);
  const empty: MacrSummary = {
    componentId, threshold, windows: [], denominator: 0, supportedNumerator: 0, potentialNumerator: 0,
    supportedRatio: 0, potentialRatio: 0, result: "not_applicable",
  };
  if (comp.category === "electrode_active_material") return { summary: empty, windowByBatch: {} };

  const lots = batchesInScope(ds)
    .filter((b) => b.componentId === componentId)
    .sort((a, b) => a.productionDate.localeCompare(b.productionDate));

  const windows: MacrWindow[] = [];
  const windowByBatch: Record<ID, MacrWindow> = {};
  for (const lot of lots) {
    const r = evaluateBatch(ds, ctx, lot);
    if (!r) continue;
    const signature = r.bom.id + "|" + r.lines.map((l) => `${l.treatment}:${l.issueIds.join(",")}`).join(";");
    let w = windows.find((x) => x.key === signature);
    if (!w) {
      const blk = blockingSet(r, threshold);
      const sr = r.supported / r.denominator;
      const pr = r.potential / r.denominator;
      w = {
        key: signature,
        bomVersionId: r.bom.id,
        from: lot.productionDate,
        to: lot.periodEnd,
        threshold,
        denominatorPerUnit: r.denominator,
        supportedNumeratorPerUnit: r.supported,
        potentialNumeratorPerUnit: r.potential,
        supportedRatio: sr,
        potentialRatio: pr,
        result: sr >= threshold ? "pass" : pr >= threshold ? "pass_pending_evidence" : "fail",
        blockingIssueIds: blk.ids,
        blockingShares: blk.shares,
        lines: r.lines,
        unitsProduced: 0,
        batchIds: [],
      };
      windows.push(w);
    }
    if (lot.productionDate < w.from) w.from = lot.productionDate;
    if (lot.periodEnd > w.to) w.to = lot.periodEnd;
    w.unitsProduced += lot.quantity;
    w.batchIds.push(lot.id);
    windowByBatch[lot.id] = w;
  }

  const denominator = windows.reduce((s, w) => s + w.denominatorPerUnit * w.unitsProduced, 0);
  const supportedNumerator = windows.reduce((s, w) => s + w.supportedNumeratorPerUnit * w.unitsProduced, 0);
  const potentialNumerator = windows.reduce((s, w) => s + w.potentialNumeratorPerUnit * w.unitsProduced, 0);
  const result: MacrSummary["result"] = windows.some((w) => w.result === "fail")
    ? "fail"
    : windows.some((w) => w.result === "pass_pending_evidence")
      ? "pass_pending_evidence"
      : windows.length
        ? "pass"
        : "not_applicable";

  return {
    summary: {
      componentId,
      threshold,
      windows,
      denominator,
      supportedNumerator,
      potentialNumerator,
      supportedRatio: denominator ? supportedNumerator / denominator : 0,
      potentialRatio: denominator ? potentialNumerator / denominator : 0,
      result,
    },
    windowByBatch,
  };
}
