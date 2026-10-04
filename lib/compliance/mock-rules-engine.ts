/**
 * Mock compliance rules engine.
 *
 * PLACEHOLDER ONLY.
 * This logic is for demonstrating the product workflow. It must eventually be
 * replaced by advisor-reviewed, versioned regulatory logic.
 *
 * Everything here is deterministic: the same facts + context always produce
 * the same analysis. No authoritative legal interpretation is attempted —
 * determinations are framed as automated assessments that require
 * professional review.
 */

import type { EligibleComponent, ID, ManufacturerDataset } from "@/lib/domain/types";
import type {
  CheckStatus,
  ComplianceContext,
  ComponentDetermination,
  CreditSummary,
  DeterminationCheck,
  EligibilityStatus,
  Issue,
  MacrSummary,
  Question,
  QuestionOption,
  Team,
} from "./types";
import type { ComplianceRulesEngine, WorkspaceAnalysis } from "./rules-engine";
import { CITATIONS } from "./citations";
import { IssueIds } from "./issue-ids";
import { detectIssues } from "./issues";
import { batchesInScope, evaluatePFEMaterialAssistance, type MaterialAssistanceResult } from "@/lib/calculations/material-assistance";
import { calculateEstimatedCredit, kwhPerUnit } from "@/lib/calculations/credit";
import { evaluateEvidenceCoverage } from "@/lib/calculations/evidence";
import { evaluateDataQuality } from "@/lib/calculations/data-quality";
import { yearOf } from "@/lib/calculations/dates";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";

export { calculateEstimatedCredit, evaluatePFEMaterialAssistance, evaluateEvidenceCoverage };

/* -------------------------------------------------------------------------- */
/* Individual evaluators                                                      */
/* -------------------------------------------------------------------------- */

type Ctx = { ds: ManufacturerDataset; ctx: ComplianceContext; issues: Issue[] };

function openIssues(c: Ctx, componentId: ID, types: Issue["type"][]): Issue[] {
  return c.issues.filter(
    (i) => i.componentIds.includes(componentId) && types.includes(i.type) && c.ctx.resolutions[i.id]?.state !== "resolved",
  );
}
function notSubstantiated(c: Ctx, ids: ID[]): boolean {
  return ids.some((id) => c.ctx.resolutions[id]?.state === "resolved" && c.ctx.resolutions[id]?.outcome === "not_substantiated");
}

export function evaluateCapacityEvidence(c: Ctx, comp: EligibleComponent): DeterminationCheck[] {
  const cap = comp.capacity!;
  const isModule = comp.category === "battery_module_with_cells";
  const kwh = kwhPerUnit(comp);
  const facts = isModule
    ? [cap.aggregateCapacityKwh!]
    : [cap.nominalVoltageV, cap.ratedCapacityAh!, cap.energyDensityWhPerL, cap.capacityToPowerRatio];
  const allKnown = facts.every((f) => f.kind === "known");
  const meets = isModule
    ? kwh >= 7
    : kwh * 1000 >= 12 && (cap.energyDensityWhPerL.value ?? 0) >= 100 && (cap.capacityToPowerRatio.value ?? 999) <= 100;

  const classification: DeterminationCheck = {
    key: "classification",
    label: "Component classification",
    status: !meets ? "issue" : allKnown ? "supported" : "pending",
    value: !meets ? "Does not meet definition" : isModule ? "Eligible battery module (using cells)" : "Eligible battery cell",
    detail: isModule
      ? `Aggregate capacity ${fmtNum(kwh, 2)} kWh (≥ 7 kWh required).`
      : `${fmtNum(kwh * 1000, 2)} Wh per cell (≥ 12 Wh), ${cap.energyDensityWhPerL.value} Wh/L (≥ 100 Wh/L), capacity-to-power ${cap.capacityToPowerRatio.value}:1 (≤ 100:1).${allKnown ? "" : " Relies on untested datasheet values."}`,
    sourceIds: facts.map((f) => f.sourceId).filter(Boolean) as ID[],
    issueIds: [],
    citationIds: isModule ? ["CIT-BATTERY-MODULE-DEF"] : ["CIT-BATTERY-CELL-DEF", "CIT-BATTERY-CELL-TD10010"],
  };

  const capIssues = openIssues(c, comp.id, ["capacity_test_missing", "capacity_conflict"]);
  const capIds = [IssueIds.capacityMissing(comp.id), IssueIds.capacityConflict(comp.id)];
  const capacityValue = isModule ? `${fmtNum(cap.aggregateCapacityKwh!.value ?? 0, 2)} kWh` : `${cap.ratedCapacityAh!.value} Ah`;
  const capacity: DeterminationCheck = {
    key: "capacity",
    label: "Capacity",
    status: notSubstantiated(c, capIds) ? "issue" : capIssues.some((i) => i.gatesCredit) ? "issue" : capIssues.length ? "pending" : "supported",
    value: capIssues.some((i) => i.type === "capacity_test_missing") ? `${capacityValue} (untested)` : capacityValue,
    detail: cap.capacityTestEvidenceId
      ? `${cap.testStandard}. ${fmtNum(kwh, 4)} kWh per unit.`
      : `No capacity test report. Estimate assumes ${capacityValue} from the product datasheet.`,
    sourceIds: [(isModule ? cap.aggregateCapacityKwh : cap.ratedCapacityAh)!.sourceId].filter(Boolean) as ID[],
    issueIds: capIssues.map((i) => i.id),
    citationIds: ["CIT-AGGREGATE-CAPACITY"],
  };
  return [classification, capacity];
}

export function evaluateProductionAndSale(c: Ctx, comp: EligibleComponent): DeterminationCheck[] {
  const { ds } = c;
  const facility = ds.facilities.find((f) => f.id === comp.facilityId)!;
  const lots = batchesInScope(ds).filter((b) => b.componentId === comp.id);
  const sales = ds.sales.filter((s) => s.componentId === comp.id && yearOf(s.saleDate) === ds.taxYear);
  const woIssues = openIssues(c, comp.id, ["work_order_missing"]);
  const saleIssues = openIssues(c, comp.id, ["unmatched_sale", "related_party_sale"]);
  const saleIds = c.issues.filter((i) => i.componentIds.includes(comp.id) && (i.type === "unmatched_sale" || i.type === "related_party_sale")).map((i) => i.id);
  const first = lots[0]?.productionDate;
  const last = lots.at(-1)?.periodEnd;
  return [
    {
      key: "us_production",
      label: "U.S. production",
      status: "supported",
      value: "Supported",
      detail: `${facility.name} (${facility.address}, ${facility.city}, ${facility.state}).`,
      sourceIds: facility.sourceId ? [facility.sourceId] : [],
      issueIds: [],
      citationIds: ["CIT-QUALIFIED-SALES"],
    },
    {
      key: "production_period",
      label: "Produced during period",
      status: lots.length ? "supported" : "not_evaluated",
      value: lots.length ? "Supported" : "No production",
      detail: lots.length
        ? `${lots.length} MES lots, ${fmtDate(first)} – ${fmtDate(last)}, ${fmtNum(lots.reduce((s, b) => s + b.quantity, 0))} units.${woIssues.length ? ` ${woIssues.length} lot without work order (MES record only).` : ""}`
        : "No production records in scope.",
      sourceIds: lots.slice(0, 3).map((b) => b.mesSourceId),
      issueIds: woIssues.map((i) => i.id),
      citationIds: [],
    },
    {
      key: "sale",
      label: "Sale requirement",
      status: notSubstantiated(c, saleIds) ? "issue" : saleIssues.length ? "pending" : sales.length ? "supported" : "not_evaluated",
      value: saleIssues.length ? `Pending — ${saleIssues.length} item${saleIssues.length > 1 ? "s" : ""}` : sales.length ? "Supported" : "No sales",
      detail: `${sales.length} sale records, ${fmtNum(sales.reduce((s, x) => s + x.quantity, 0))} units sold in ${ds.taxYear}.${saleIssues.length ? ` ${saleIssues.map((i) => i.riskLabel).join("; ")}.` : ""}`,
      sourceIds: sales.slice(0, 3).map((s) => s.sourceId),
      issueIds: saleIssues.map((i) => i.id),
      citationIds: ["CIT-QUALIFIED-SALES", "CIT-RELATED-PERSON-ELECTION"],
    },
  ];
}

export function evaluateClaimant(c: Ctx, comp: EligibleComponent): DeterminationCheck {
  const ent = (id: ID | null) => c.ds.entities.find((e) => e.id === id)?.name ?? "Unknown";
  const issues = openIssues(c, comp.id, ["claimant_undetermined"]);
  const cl = comp.claimant;
  const failed = notSubstantiated(c, [IssueIds.claimant(comp.id)]);
  return {
    key: "claimant",
    label: "Claimant",
    status: failed ? "issue" : issues.length ? "issue" : "supported",
    value: issues.length ? `Not established (assumed: ${ent(cl.claimingEntityId.value)})` : ent(cl.claimingEntityId.value),
    detail: cl.contractManufacturing.value
      ? `Manufactured by ${ent(cl.manufacturingEntityId.value)} under a contract manufacturing arrangement. ${cl.notes ?? ""}`
      : `${ent(cl.manufacturingEntityId.value)} performs production and sells to customers. ${cl.relatedPartyConsiderations}`,
    sourceIds: [...new Set([cl.claimingEntityId.sourceId, cl.manufacturingEntityId.sourceId].filter(Boolean) as ID[])],
    issueIds: issues.map((i) => i.id),
    citationIds: cl.contractManufacturing.value ? ["CIT-CONTRACT-MFG", "CIT-CLAIMANT-TD10010"] : ["CIT-CLAIMANT-TD10010"],
  };
}

function materialAssistanceCheck(c: Ctx, comp: EligibleComponent, m: MacrSummary): DeterminationCheck {
  const supplierIssues = openIssues(c, comp.id, ["attestation_expired", "attestation_missing", "ownership_unknown", "ein_conflict", "pfe_review", "pfe_risk"]);
  const blocking = new Set(m.windows.flatMap((w) => w.blockingIssueIds));
  const blockingOpen = supplierIssues.filter((i) => blocking.has(i.id));
  const status: CheckStatus = m.result === "fail" ? "issue" : m.result === "pass_pending_evidence" ? "pending" : "supported";
  return {
    key: "material_assistance",
    label: "PFE / material assistance",
    status,
    value:
      m.result === "pass"
        ? `Pass — MACR ${fmtPct(m.supportedRatio)}`
        : m.result === "pass_pending_evidence"
          ? `Pending ${blockingOpen.length} supplier issue${blockingOpen.length === 1 ? "" : "s"}`
          : m.result === "fail"
            ? "Fails threshold"
            : "Not applicable",
    detail: `Production-weighted MACR ${fmtPct(m.supportedRatio)} supported / ${fmtPct(m.potentialRatio)} potential vs ${fmtPct(m.threshold, 0)} threshold across ${m.windows.length} BOM/evidence window${m.windows.length === 1 ? "" : "s"}.${
      m.windows.some((w) => w.result === "pass_pending_evidence")
        ? ` ${m.windows.filter((w) => w.result === "pass_pending_evidence").length} window(s) pass only if pending supplier evidence resolves.`
        : ""
    }`,
    sourceIds: [],
    issueIds: (blockingOpen.length ? blockingOpen : supplierIssues).map((i) => i.id),
    citationIds: ["CIT-MATERIAL-ASSISTANCE", "CIT-MACR-THRESHOLDS"],
  };
}

function section48CCheck(c: Ctx, comp: EligibleComponent): DeterminationCheck {
  const f = c.ds.facilities.find((x) => x.id === comp.facilityId)!;
  const issues = openIssues(c, comp.id, ["section_48c_unknown"]);
  return {
    key: "section_48c",
    label: "Section 48C property",
    status: issues.length ? "pending" : "supported",
    value: issues.length ? "Unconfirmed" : "No §48C allocation",
    detail: issues.length ? `${f.shortName}: ${f.section48C.note ?? "status unknown"}` : "Confirmed no post-2022 §48C credit for facility property.",
    sourceIds: f.section48C.sourceId ? [f.section48C.sourceId] : [],
    issueIds: issues.map((i) => i.id),
    citationIds: ["CIT-48C"],
  };
}

/* -------------------------------------------------------------------------- */
/* Determination                                                              */
/* -------------------------------------------------------------------------- */

export const STATUS_HEADLINES: Record<EligibilityStatus, string> = {
  eligible: "ELIGIBLE",
  likely_eligible: "LIKELY ELIGIBLE — REVIEW REQUIRED",
  pending_information: "PENDING INFORMATION",
  requires_review: "REQUIRES PROFESSIONAL REVIEW",
  ineligible: "INELIGIBLE",
  not_evaluated: "NOT EVALUATED",
};

export function determineComponentEligibility(
  c: Ctx,
  comp: EligibleComponent,
  macr: MacrSummary,
  credit: CreditSummary,
  ruleVersionId: string,
): ComponentDetermination {
  if (comp.category === "electrode_active_material") {
    return {
      componentId: comp.id,
      status: "not_evaluated",
      headline: STATUS_HEADLINES.not_evaluated,
      checks: [],
      ruleVersionId,
      finding: {
        id: `FND-${comp.id}`,
        subjectId: comp.id,
        status: "not_evaluated",
        finding: "Component not evaluated",
        reasoning: comp.evaluationNote ?? "",
        ruleVersion: ruleVersionId,
        sources: [],
        generatedAt: `${c.ds.asOf}T06:00:00Z`,
        generatedBy: "mock_rules_engine",
      },
    };
  }

  const [classification, capacity] = evaluateCapacityEvidence(c, comp);
  const [usProd, period, sale] = evaluateProductionAndSale(c, comp);
  const claimant = evaluateClaimant(c, comp);
  const ma = materialAssistanceCheck(c, comp, macr);
  const s48 = section48CCheck(c, comp);
  const checks = [classification, usProd, period, sale, capacity, claimant, ma, s48];

  const cc = credit.byComponent.find((x) => x.componentId === comp.id);
  let status: EligibilityStatus;
  if (classification.status === "issue" || ma.status === "issue" || (cc && cc.estimated === 0 && cc.excluded > 0)) status = "ineligible";
  else if (claimant.status === "issue") status = "requires_review";
  else if (capacity.status === "issue") status = "pending_information";
  else if (checks.some((k) => k.status === "pending" || k.status === "issue") || (cc?.atRisk ?? 0) > 0) status = "likely_eligible";
  else status = "eligible";

  const reasons = checks.filter((k) => k.status !== "supported" && k.status !== "not_applicable");
  const citationIds = [...new Set(checks.flatMap((k) => k.citationIds))];
  return {
    componentId: comp.id,
    status,
    headline: STATUS_HEADLINES[status],
    checks,
    ruleVersionId,
    finding: {
      id: `FND-${comp.id}`,
      subjectId: comp.id,
      status,
      finding:
        status === "eligible"
          ? `${comp.shortName} meets all modeled requirements with supporting evidence.`
          : `${comp.shortName}: open items — ${reasons.map((r) => r.label).join("; ")}.`,
      reasoning: reasons.length
        ? reasons.map((r) => `${r.label}: ${r.detail}`).join(" ")
        : "All determination elements are supported by linked evidence under the prototype rule set.",
      ruleVersion: ruleVersionId,
      sources: citationIds.map((id) => CITATIONS[id]),
      generatedAt: `${c.ds.asOf}T06:00:00Z`,
      generatedBy: "mock_rules_engine",
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Adaptive questions                                                         */
/* -------------------------------------------------------------------------- */

const yesNo = (yes: string, no: string, pending = "Not yet known — request information"): QuestionOption[] => [
  { id: "yes", label: yes, outcome: "substantiated" },
  { id: "no", label: no, outcome: "not_substantiated" },
  { id: "unknown", label: pending, outcome: "pending" },
];

/**
 * Generates questions from the information the system has and the information
 * it is missing. Questions exist only while their triggering issue is open.
 */
export function generateMissingInformationQuestions(c: Ctx, credit: CreditSummary, macr: Record<ID, MaterialAssistanceResult>): Question[] {
  const { ds } = c;
  const amount = (issueId: ID) => credit.atRiskByIssue.find((x) => x.issueId === issueId)?.amount ?? 0;
  const comp = (id: ID) => ds.components.find((x) => x.id === id)!;
  const sup = (id?: ID) => ds.suppliers.find((s) => s.id === id);

  /** Supplier share of the component's tax-year BOM cost (production-weighted). */
  const costShare = (supplierId: ID, componentId: ID) => {
    const m = macr[componentId]?.summary;
    if (!m?.denominator) return 0;
    const supCost = m.windows.reduce(
      (s, w) => s + w.lines.filter((l) => l.supplierId === supplierId).reduce((a, l) => a + l.unitCost, 0) * w.unitsProduced,
      0,
    );
    return supCost / m.denominator;
  };

  const qs: Question[] = [];
  // Questions are generated for every open-or-answered issue; resolved ones stay listed
  // (with zero credit affected) so the questionnaire history remains visible.
  for (const i of c.issues) {
    const s = sup(i.supplierId);
    const comps = i.componentIds.map((x) => comp(x).shortName).join(", ");
    const primary = i.componentIds[0];
    const base = {
      id: `Q-${i.id}`,
      issueId: i.id,
      componentIds: i.componentIds,
      creditAffected: amount(i.id),
      trigger: i.trigger,
    };
    const priority = (team: Team) => ({ priority: amount(i.id) > 500_000 || i.severity === "high" ? ("high" as const) : i.severity, assignedTeam: team });
    switch (i.type) {
      case "ownership_unknown":
        qs.push({
          ...base,
          ...priority("Procurement"),
          question: `Who is the ultimate parent of ${s!.name} (${s!.id})?`,
          whyItMatters: `This supplier contributes ${fmtPct(costShare(s!.id, primary))} of the ${ds.taxYear} BOM cost for the ${comp(primary).shortName} cell and its PFE status cannot currently be determined. Without it, affected production windows do not meet the MACR threshold on supported evidence.`,
          affectedLabel: `${s!.name} · ${comps}`,
          options: [
            { id: "provide", label: "Provide the ultimate parent (recorded as reported, pending verification)", outcome: "substantiated", requiresText: true, textPlaceholder: "e.g. Harborline Holdings Ltd. (Singapore), 100%" },
            { id: "refused", label: "Supplier refuses to disclose beneficial ownership", outcome: "not_substantiated" },
            { id: "unknown", label: "Not yet known — request from supplier", outcome: "pending" },
          ],
        });
        break;
      case "attestation_expired":
        qs.push({
          ...base,
          ...priority("Procurement"),
          question: `Can ${s!.name} provide an attestation covering ${i.trigger.replace("No attestation covers ", "")}?`,
          whyItMatters: `${s!.name} supplies ${fmtPct(costShare(s!.id, primary))} of ${comp(primary).shortName} BOM cost. Production during the gap cannot count this material toward the qualifying MACR numerator.`,
          affectedLabel: `${s!.name} · ${comps}`,
          options: yesNo("Yes — a bring-down attestation covering the gap will be uploaded", "No — supplier will not attest for the gap period"),
        });
        break;
      case "attestation_missing":
        qs.push({
          ...base,
          ...priority("Procurement"),
          question: `Has ${s!.name} provided a supplier certification for the materials it supplies?`,
          whyItMatters: `No certification is on file. The line (${fmtPct(costShare(s!.id, primary))} of ${comp(primary).shortName} BOM cost) is excluded from the supported MACR numerator.`,
          affectedLabel: `${s!.name} · ${comps}`,
          options: yesNo("Yes — certification will be uploaded", "No — supplier declined to certify"),
        });
        break;
      case "pfe_review":
        qs.push({
          ...base,
          ...priority("Legal"),
          question: `Has the prohibited-foreign-entity review of ${s!.name} been completed?`,
          whyItMatters: `The line is currently treated as non-qualifying (explicit assumption). Completing the review could raise the MACR for ${comps}.`,
          affectedLabel: `${s!.name} · ${comps}`,
          options: yesNo("Yes — no PFE indicators found (memo will be attached)", "Yes — supplier should be treated as a PFE"),
        });
        break;
      case "capacity_test_missing":
        qs.push({
          ...base,
          ...priority("Engineering"),
          question: `Can Engineering provide the rated capacity test report for ${comps}?`,
          whyItMatters: "Rated capacity determines kWh per cell and therefore the full credit amount for this component. Only a datasheet is on file.",
          affectedLabel: comps,
          options: yesNo("Yes — test report will be uploaded", "No test was performed for production cells"),
        });
        break;
      case "capacity_conflict":
        qs.push({
          ...base,
          ...priority("Engineering"),
          question: `Which rated capacity is correct for ${comps}: 26.0 Ah (datasheet) or 25.4 Ah (engineering spec)?`,
          whyItMatters: "The estimate currently uses 26.0 Ah as an assumption. A 25.4 Ah rating would reduce the estimated credit by about 2.3%.",
          affectedLabel: comps,
          options: [
            { id: "26", label: "26.0 Ah — datasheet value is the rated capacity", outcome: "substantiated" },
            { id: "254", label: "25.4 Ah — use engineering specification", outcome: "substantiated" },
            { id: "unknown", label: "Await capacity test", outcome: "pending" },
          ],
        });
        break;
      case "related_party_sale":
        qs.push({
          ...base,
          ...priority("Tax"),
          question: "Was an election made under §45X(a)(3)(B) to treat sales to Volterra Energy Storage LLC as sales to an unrelated person?",
          whyItMatters: `${fmtNum(ds.sales.filter((x) => i.saleIds?.includes(x.id)).reduce((n, x) => n + x.quantity, 0))} ${comps} cells were sold to a commonly controlled affiliate. Without the election (and Appendix B certification), these may not be qualified sales.`,
          affectedLabel: `Volterra Energy Storage LLC · ${comps}`,
          options: yesNo("Yes — election will be made; Appendix B certification to be attached", "No — no election will be made"),
        });
        break;
      case "unmatched_sale": {
        const sale = ds.sales.find((x) => x.id === i.saleIds?.[0])!;
        qs.push({
          ...base,
          ...priority("Finance"),
          question: `Which customer and production lots correspond to sales register line ${sale.invoiceNumber} (“${sale.customerName}”, ${fmtNum(sale.quantity)} units)?`,
          whyItMatters: "The record does not match the customer master and has no invoice or lot allocation, so it cannot be tied to qualifying production.",
          affectedLabel: `${sale.invoiceNumber} · ${comps}`,
          options: [
            { id: "match", label: "Matched — provide invoice and customer", outcome: "substantiated", requiresText: true, textPlaceholder: "e.g. Evolv Mobility, Inc. — INV-27-40139" },
            { id: "void", label: "Duplicate / voided line — remove from sales", outcome: "not_substantiated" },
            { id: "unknown", label: "Investigating", outcome: "pending" },
          ],
        });
        break;
      }
      case "claimant_undetermined":
        qs.push({
          ...base,
          ...priority("Legal"),
          question: `Is there a written agreement identifying which party will claim the Section 45X credit for ${comps} modules assembled by Lakeshore Precision Assembly?`,
          whyItMatters: "Under the contract-manufacturing rule the parties may designate the claimant by agreement entered into before production is completed. Production began July 2027; the draft agreement reserves the tax-credit clause.",
          affectedLabel: `Lakeshore Precision Assembly · ${comps}`,
          options: yesNo("Yes — signed agreement designates Volterra as claimant", "No — Lakeshore will claim, or no agreement predates production"),
        });
        break;
      case "section_48c_unknown":
        qs.push({
          ...base,
          ...priority("Legal"),
          question: `Has any property used to manufacture ${comps} at the Batavia facility received a post-2022 Section 48C allocation?`,
          whyItMatters: "Components produced using property that is part of a §48C facility cannot also generate §45X credit.",
          affectedLabel: `Batavia Module Plant · ${comps}`,
          options: yesNo("No §48C allocation — confirmation will be attached", "Yes — §48C property was used"),
        });
        break;
      case "ein_conflict":
        qs.push({
          ...base,
          ...priority("Procurement"),
          question: `Which EIN is correct for ${s!.name}: ${s!.ein.value} (supplier master) or the EIN on its attestation?`,
          whyItMatters: "An attestation that does not identify the supplier correctly cannot be relied on for the MACR numerator.",
          affectedLabel: `${s!.name} · ${comps}`,
          options: [
            { id: "master", label: "Supplier master is correct — request corrected attestation", outcome: "substantiated" },
            { id: "att", label: "Attestation is correct — update supplier master", outcome: "substantiated" },
            { id: "unknown", label: "Confirm with supplier", outcome: "pending" },
          ],
        });
        break;
      default:
        break;
    }
  }
  const rank = { high: 0, medium: 1, low: 2 };
  return qs.sort((a, b) => b.creditAffected - a.creditAffected || rank[a.priority] - rank[b.priority]);
}

/* -------------------------------------------------------------------------- */
/* Engine                                                                     */
/* -------------------------------------------------------------------------- */

export class MockRulesEngine implements ComplianceRulesEngine {
  analyze(ds: ManufacturerDataset, ctx: ComplianceContext): WorkspaceAnalysis {
    const issues = detectIssues(ds, ctx);
    const c: Ctx = { ds, ctx, issues };
    const macr: Record<ID, MaterialAssistanceResult> = {};
    for (const comp of ds.components) macr[comp.id] = evaluatePFEMaterialAssistance(ds, ctx, comp.id);
    const credit = calculateEstimatedCredit(ds, ctx, issues, macr);
    const determinations: WorkspaceAnalysis["determinations"] = {};
    for (const comp of ds.components) {
      determinations[comp.id] = determineComponentEligibility(c, comp, macr[comp.id].summary, credit, ctx.ruleVersion.id);
    }
    return {
      ruleVersionId: ctx.ruleVersion.id,
      issues,
      macr,
      credit,
      determinations,
      evidence: evaluateEvidenceCoverage(ds, ctx, issues),
      dataQuality: evaluateDataQuality(ds),
      questions: generateMissingInformationQuestions(c, credit, macr),
    };
  }
}

export const rulesEngine: ComplianceRulesEngine = new MockRulesEngine();
