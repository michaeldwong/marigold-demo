/**
 * Sourcing scenario engine — PROTOTYPE.
 *
 * Swaps the supplier (and unit cost) on one BOM line, re-runs the same rules
 * engine on the modified dataset, and compares the result with the baseline.
 * No optimization; tariffs/freight are simple per-unit adders entered by the
 * user. PLACEHOLDER ONLY — demonstrates connecting compliance outcomes to
 * sourcing economics.
 */

import type { ID, ManufacturerDataset } from "@/lib/domain/types";
import type { ComplianceContext } from "@/lib/compliance/types";
import type { ComplianceRulesEngine } from "@/lib/compliance/rules-engine";

export interface ScenarioInput {
  componentId: ID;
  bomVersionId: ID;
  bomLineId: ID;
  alternativeSupplierId: ID;
  alternativeUnitCost: number;
  /** Landed-cost adders per unit (tariff, freight, duties), USD. */
  currentAddersPerUnit: number;
  alternativeAddersPerUnit: number;
}

export interface ScenarioResult {
  unitsAffected: number;
  current: { supplierId: ID; unitCost: number; landed: number; supported: number; estimated: number; atRiskFromLine: number; macrSupported: number };
  alternative: { supplierId: ID; unitCost: number; landed: number; supported: number; estimated: number; atRiskFromLine: number; macrSupported: number };
  incrementalPurchaseCost: number;
  creditPreserved: number;
  netImpact: number;
}

export function runSourcingScenario(
  engine: ComplianceRulesEngine,
  ds: ManufacturerDataset,
  ctx: ComplianceContext,
  input: ScenarioInput,
): ScenarioResult {
  const base = engine.analyze(ds, ctx);
  const bom = ds.bomVersions.find((b) => b.id === input.bomVersionId)!;
  const line = bom.lines.find((l) => l.id === input.bomLineId)!;

  const modified: ManufacturerDataset = {
    ...ds,
    bomVersions: ds.bomVersions.map((b) =>
      b.id !== bom.id
        ? b
        : {
            ...b,
            lines: b.lines.map((l) =>
              l.id !== line.id
                ? l
                : {
                    ...l,
                    supplierId: input.alternativeSupplierId,
                    supplierFacilityId: `${input.alternativeSupplierId}-F1`,
                    unitCost: { value: input.alternativeUnitCost, kind: "assumption", note: "Scenario input" },
                  },
            ),
          },
    ),
  };
  const alt = engine.analyze(modified, ctx);

  const units = base.macr[input.componentId].summary.windows.filter((w) => w.bomVersionId === bom.id).reduce((s, w) => s + w.unitsProduced, 0);
  const cc = (a: typeof base) => a.credit.byComponent.find((c) => c.componentId === input.componentId)!;
  const lineRisk = (a: typeof base, supplierId: ID) => {
    const ids = new Set(a.issues.filter((i) => i.supplierId === supplierId).map((i) => i.id));
    return cc(a)
      .lines.filter((l) => l.bomVersionId === bom.id)
      .reduce((s, l) => s + l.blockers.filter((b) => ids.has(b.issueId)).reduce((x, b) => x + l.credit * b.share, 0), 0);
  };
  const currentCost = line.unitCost.value ?? 0;
  const currentLanded = currentCost + input.currentAddersPerUnit;
  const altLanded = input.alternativeUnitCost + input.alternativeAddersPerUnit;
  const incremental = (altLanded - currentLanded) * units;
  const preserved = cc(alt).supported - cc(base).supported;

  return {
    unitsAffected: units,
    current: {
      supplierId: line.supplierId,
      unitCost: currentCost,
      landed: currentLanded,
      supported: cc(base).supported,
      estimated: cc(base).estimated,
      atRiskFromLine: lineRisk(base, line.supplierId),
      macrSupported: base.macr[input.componentId].summary.supportedRatio,
    },
    alternative: {
      supplierId: input.alternativeSupplierId,
      unitCost: input.alternativeUnitCost,
      landed: altLanded,
      supported: cc(alt).supported,
      estimated: cc(alt).estimated,
      atRiskFromLine: lineRisk(alt, input.alternativeSupplierId),
      macrSupported: alt.macr[input.componentId].summary.supportedRatio,
    },
    incrementalPurchaseCost: incremental,
    creditPreserved: preserved,
    netImpact: preserved - incremental,
  };
}
