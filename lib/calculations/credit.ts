/**
 * Estimated 45X credit — PROTOTYPE CALCULATION.
 *
 * PLACEHOLDER ONLY.
 * This logic is for demonstrating the product workflow. It must eventually be
 * replaced by advisor-reviewed, versioned regulatory logic.
 *
 * Credit is computed per sale, per production lot the sale is allocated to:
 *     credit = units × kWh per unit × rate per kWh × phase-out %
 * Each credit line is then classified:
 *   - supported: every gating fact is supported by evidence (or resolved by review)
 *   - at_risk:   one or more open issues block substantiation — the line's credit
 *                is attributed to the primary blocking issue(s)
 *   - excluded:  an issue was resolved as "not substantiated", or MACR fails
 *                even if all pending evidence resolves favourably
 *
 * Attribution priority (primary blocker): component-level (claimant, capacity,
 * §48C) → sale-level (unmatched, related party) → lot-level MACR blockers
 * (split pro rata by BOM line cost).
 */

import type { EligibleComponent, ID, ManufacturerDataset } from "@/lib/domain/types";
import type {
  CategoryRate,
  ComplianceContext,
  ComponentCredit,
  CreditLine,
  CreditSummary,
  Issue,
} from "@/lib/compliance/types";
import type { MaterialAssistanceResult } from "./material-assistance";
import { IssueIds } from "@/lib/compliance/issue-ids";
import { yearOf } from "./dates";

export const CATEGORY_RATES: Record<EligibleComponent["category"], CategoryRate> = {
  battery_cell: { category: "battery_cell", label: "Battery cell", basis: "$35 per kWh of capacity", ratePerKwh: 35, citationId: "CIT-RATE-CELL" },
  battery_module_with_cells: { category: "battery_module_with_cells", label: "Battery module (using cells)", basis: "$10 per kWh of capacity", ratePerKwh: 10, citationId: "CIT-RATE-MODULE" },
  electrode_active_material: { category: "electrode_active_material", label: "Electrode active material", basis: "10% of eligible production costs", citationId: "CIT-AGGREGATE-CAPACITY" },
};

/** Phase-out applies to components sold after 2029 (see CIT-PHASEOUT). */
export function phaseOutPct(saleYear: number): number {
  if (saleYear <= 2029) return 1;
  return { 2030: 0.75, 2031: 0.5, 2032: 0.25 }[saleYear] ?? 0;
}

export function kwhPerUnit(c: EligibleComponent): number {
  const cap = c.capacity;
  if (!cap) return 0;
  if (c.category === "battery_module_with_cells") return cap.aggregateCapacityKwh?.value ?? 0;
  return ((cap.nominalVoltageV.value ?? 0) * (cap.ratedCapacityAh?.value ?? 0)) / 1000;
}

export function calculateEstimatedCredit(
  ds: ManufacturerDataset,
  ctx: ComplianceContext,
  issues: Issue[],
  macr: Record<ID, MaterialAssistanceResult>,
): CreditSummary {
  const issueById = new Map(issues.map((i) => [i.id, i]));
  const res = (id: ID) => ctx.resolutions[id];
  const isOpen = (id: ID) => issueById.get(id)?.gatesCredit && res(id)?.state !== "resolved";
  const notSubstantiated = (id: ID) => res(id)?.state === "resolved" && res(id)?.outcome === "not_substantiated";

  const byComponent: ComponentCredit[] = [];

  for (const comp of ds.components) {
    const rate = CATEGORY_RATES[comp.category].ratePerKwh;
    if (!rate) continue; // electrode active materials: cost basis not modeled in prototype
    const kwhUnit = kwhPerUnit(comp);
    const compIssueIds = issues
      .filter((i) => i.componentIds.includes(comp.id) && (i.type === "claimant_undetermined" || i.type === "capacity_test_missing" || i.type === "section_48c_unknown"))
      .sort((a, b) => order(a.type) - order(b.type))
      .map((i) => i.id);
    const otherCompIds = issues.filter((i) => i.componentIds.includes(comp.id) && i.type === "capacity_conflict" && res(i.id)?.state !== "resolved").map((i) => i.id);
    const lines: CreditLine[] = [];

    for (const sale of ds.sales.filter((s) => s.componentId === comp.id && yearOf(s.saleDate) === ds.taxYear)) {
      const phase = phaseOutPct(yearOf(sale.saleDate));
      const saleIssueIds = [
        ...(sale.matchStatus === "unmatched" ? [IssueIds.unmatchedSale(sale.id)] : []),
        ...(sale.relatedParty ? [IssueIds.relatedParty(comp.id)] : []),
      ];
      const parts = sale.allocations.length ? sale.allocations : [{ batchId: undefined as ID | undefined, quantity: sale.quantity }];
      for (const part of parts) {
        const kwh = part.quantity * kwhUnit;
        const credit = kwh * rate * phase;
        const window = part.batchId ? macr[comp.id]?.windowByBatch[part.batchId] : undefined;
        const line: CreditLine = {
          id: `CL-${sale.id}-${part.batchId ?? "UNALLOC"}`,
          componentId: comp.id,
          saleId: sale.id,
          batchId: part.batchId,
          bomVersionId: window?.bomVersionId,
          units: part.quantity,
          kwhPerUnit: kwhUnit,
          kwh,
          ratePerKwh: rate,
          phaseOutPct: phase,
          credit,
          status: "supported",
          blockers: [],
          otherIssueIds: [...otherCompIds],
          macr: window ? { supportedRatio: window.supportedRatio, potentialRatio: window.potentialRatio, threshold: window.threshold } : undefined,
        };

        const hardStop = [...compIssueIds, ...saleIssueIds].find(notSubstantiated);
        const openComp = compIssueIds.filter(isOpen);
        const openSale = saleIssueIds.filter(isOpen);
        const macrBlockers = window?.result === "pass_pending_evidence" ? window.blockingShares.filter((b) => isOpen(b.issueId)) : [];

        if (hardStop) {
          line.status = "excluded";
          line.excludedReason = `${issueById.get(hardStop)?.riskLabel ?? hardStop} — resolved as not substantiated`;
        } else if (window?.result === "fail") {
          line.status = "excluded";
          line.excludedReason = `MACR below ${Math.round(window.threshold * 100)}% threshold even if pending evidence resolves`;
        } else if (openComp.length) {
          line.status = "at_risk";
          line.blockers = [{ issueId: openComp[0], share: 1 }];
          line.otherIssueIds.push(...openComp.slice(1), ...openSale, ...macrBlockers.map((b) => b.issueId));
        } else if (openSale.length) {
          line.status = "at_risk";
          line.blockers = [{ issueId: openSale[0], share: 1 }];
          line.otherIssueIds.push(...openSale.slice(1), ...macrBlockers.map((b) => b.issueId));
        } else if (macrBlockers.length) {
          const total = macrBlockers.reduce((s, b) => s + b.share, 0);
          line.status = "at_risk";
          line.blockers = macrBlockers.map((b) => ({ issueId: b.issueId, share: b.share / total }));
        }
        lines.push(line);
      }
    }

    const sum = (f: (l: CreditLine) => boolean) => lines.filter(f).reduce((s, l) => s + l.credit, 0);
    const supported = sum((l) => l.status === "supported");
    const atRisk = sum((l) => l.status === "at_risk");
    byComponent.push({
      componentId: comp.id,
      supported,
      atRisk,
      estimated: supported + atRisk,
      excluded: sum((l) => l.status === "excluded"),
      unitsSold: lines.reduce((s, l) => s + l.units, 0),
      kwh: lines.reduce((s, l) => s + l.kwh, 0),
      ratePerKwh: rate,
      lines,
    });
  }

  const atRiskMap = new Map<ID, number>();
  for (const l of byComponent.flatMap((c) => c.lines)) {
    for (const b of l.blockers) atRiskMap.set(b.issueId, (atRiskMap.get(b.issueId) ?? 0) + l.credit * b.share);
  }

  const total = (k: "estimated" | "supported" | "atRisk" | "excluded") => byComponent.reduce((s, c) => s + c[k], 0);
  return {
    estimated: total("estimated"),
    supported: total("supported"),
    atRisk: total("atRisk"),
    excluded: total("excluded"),
    byComponent,
    atRiskByIssue: [...atRiskMap]
      .map(([issueId, amount]) => ({ issueId, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

function order(t: Issue["type"]): number {
  return ({ claimant_undetermined: 0, capacity_test_missing: 1, section_48c_unknown: 2 } as Record<string, number>)[t] ?? 9;
}
