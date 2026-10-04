/**
 * Issue detection — derives the exception queue from the manufacturing record.
 *
 * Issues are *facts about missing, stale, conflicting or ambiguous information*,
 * not legal conclusions. Each one names the trigger that produced it so the UI
 * can answer "why is the system asking?".
 *
 * TODO: Replace with compliance reasoning grounded in documents under
 * docs/compliance/ (rule-specific evidence requirements per rule version).
 */

import type { ID, ManufacturerDataset } from "@/lib/domain/types";
import type { ComplianceContext, Issue } from "./types";
import { IssueIds } from "./issue-ids";
import { batchesInScope, bomVersionFor, supplierAttestations } from "@/lib/calculations/material-assistance";
import { addDays, covers, yearOf } from "@/lib/calculations/dates";
import { fmtDate, fmtRange } from "@/lib/format";

const EXPIRING_WINDOW_DAYS = 60;

export function detectIssues(ds: ManufacturerDataset, _ctx: ComplianceContext): Issue[] {
  const issues: Issue[] = [];
  const comp = (id: ID) => ds.components.find((c) => c.id === id)!;
  const lots = batchesInScope(ds);

  /* ---------------------------- supplier usage ---------------------------- */
  type Usage = { componentIds: Set<ID>; bomVersionIds: Set<ID>; periods: { from: string; to: string; batchId: ID }[] };
  const usage = new Map<ID, Usage>();
  for (const lot of lots) {
    const bom = bomVersionFor(ds, lot.componentId, lot.productionDate);
    if (!bom) continue;
    for (const line of bom.lines) {
      const u = usage.get(line.supplierId) ?? { componentIds: new Set(), bomVersionIds: new Set(), periods: [] };
      u.componentIds.add(lot.componentId);
      u.bomVersionIds.add(bom.id);
      u.periods.push({ from: lot.productionDate, to: lot.periodEnd, batchId: lot.id });
      usage.set(line.supplierId, u);
    }
  }

  for (const [supplierId, u] of usage) {
    if (supplierId === "SUP-INT") continue;
    const sup = ds.suppliers.find((s) => s.id === supplierId)!;
    const componentIds = [...u.componentIds];
    const compNames = componentIds.map((c) => comp(c).shortName).join(", ");
    const bomVersionIds = [...u.bomVersionIds];
    const years = [...new Set(u.periods.map((p) => yearOf(p.from)))];
    const pfe = years.map((y) => sup.pfeStatusByYear[y]).find((s) => s === "pfe_risk" || s === "review_required");

    if (pfe === "pfe_risk") {
      issues.push({
        id: IssueIds.pfe(sup.id),
        type: "pfe_risk",
        severity: "medium",
        title: `Possible PFE supplier — ${sup.name}`,
        riskLabel: "Possible PFE supplier",
        description: `${sup.pfeRationale} Cost of ${sup.name} lines is excluded from the qualifying MACR numerator for affected BOM versions.`,
        componentIds,
        supplierId: sup.id,
        bomVersionIds,
        trigger: `PFE screening flag on ${sup.name} (ultimate parent: ${sup.ultimateParent.value ?? "unknown"})`,
        gatesCredit: false,
      });
      continue;
    }
    if (pfe === "review_required") {
      issues.push({
        id: IssueIds.pfe(sup.id),
        type: "pfe_review",
        severity: "medium",
        title: `PFE review not completed — ${sup.name}`,
        riskLabel: "PFE review incomplete",
        description: `${sup.pfeRationale} Until reviewed, the line is treated as non-qualifying (explicit conservative assumption).`,
        componentIds,
        supplierId: sup.id,
        bomVersionIds,
        trigger: `Supplier PFE status "Review required" for ${years.join(", ")}`,
        gatesCredit: false,
      });
      continue;
    }

    const atts = supplierAttestations(ds, sup.id);
    const uncovered = u.periods.filter((p) => !atts.some((a) => covers(a.attestation!.coverage.from, a.attestation!.coverage.to, p.from, p.to)));
    if (uncovered.length) {
      const from = uncovered.reduce((m, p) => (p.from < m ? p.from : m), uncovered[0].from);
      const to = uncovered.reduce((m, p) => (p.to > m ? p.to : m), uncovered[0].to);
      if (atts.length) {
        const lastEnd = atts.map((a) => a.attestation!.coverage.to ?? "").sort().find((e) => e < from) ?? from;
        issues.push({
          id: IssueIds.attestationGap(sup.id),
          type: "attestation_expired",
          severity: "high",
          title: `Supplier attestation expired — ${sup.name}`,
          riskLabel: "Supplier attestation expired",
          description: `Attestation coverage lapsed after ${fmtDate(lastEnd)}. Production of ${compNames} between ${fmtRange(from, to)} used this supplier's material with no attestation in force.`,
          componentIds,
          supplierId: sup.id,
          bomVersionIds,
          batchIds: uncovered.map((p) => p.batchId),
          evidenceIds: atts.map((a) => a.id),
          trigger: `No attestation covers ${fmtRange(from, to)}`,
          gatesCredit: true,
        });
      } else {
        issues.push({
          id: IssueIds.attestationMissing(sup.id),
          type: "attestation_missing",
          severity: "medium",
          title: `Supplier attestation missing — ${sup.name}`,
          riskLabel: "Supplier attestation missing",
          description: `No supplier certification has been received for material supplied to ${compNames}.`,
          componentIds,
          supplierId: sup.id,
          bomVersionIds,
          trigger: "No supplier attestation on file",
          gatesCredit: true,
        });
      }
    }

    const conflicting = atts.find((a) => a.status === "conflicting");
    if (conflicting) {
      issues.push({
        id: IssueIds.einConflict(sup.id),
        type: "ein_conflict",
        severity: "medium",
        title: `Conflicting EIN — ${sup.name}`,
        riskLabel: "Conflicting supplier evidence",
        description: `Attestation states EIN ${conflicting.attestation!.ein}; supplier master states ${sup.ein.value}. The attestation cannot be relied on until the supplier identity is confirmed.`,
        componentIds,
        supplierId: sup.id,
        evidenceIds: [conflicting.id],
        trigger: "EIN mismatch between attestation and supplier master",
        gatesCredit: true,
      });
    }

    {
      if (sup.ultimateParent.kind !== "known" && atts.length) {
        const immediate = sup.ownership.find((o) => o.relationship === "immediate_parent");
        issues.push({
          id: IssueIds.ownership(sup.id),
          type: "ownership_unknown",
          severity: "high",
          title: `Ultimate parent unresolved — ${sup.name}`,
          riskLabel: "Ultimate parent ownership unresolved",
          description: `Ownership is known only to ${immediate ? `${immediate.entityName} (${immediate.country})` : "the supplier entity"}. PFE status cannot be determined, so the line cannot count toward the supported MACR numerator.`,
          componentIds,
          supplierId: sup.id,
          bomVersionIds,
          evidenceIds: atts.map((a) => a.id),
          trigger: "Ultimate parent field is empty in supplier record and attestation",
          gatesCredit: true,
        });
      }
    }

    // Continuity: attestations expiring shortly after the as-of date for suppliers still on an active BOM.
    const activeUse = bomVersionIds.some((id) => ds.bomVersions.find((b) => b.id === id)?.effective.to === null);
    const latestEnd = atts.map((a) => a.attestation!.coverage.to ?? "9999-12-31").sort().at(-1);
    if (activeUse && latestEnd && latestEnd >= ds.asOf && latestEnd <= addDays(ds.asOf, EXPIRING_WINDOW_DAYS)) {
      issues.push({
        id: IssueIds.attestationExpiring(sup.id),
        type: "attestation_expiring",
        severity: "low",
        title: `Attestation expiring ${fmtDate(latestEnd)} — ${sup.name}`,
        riskLabel: "Attestation expiring",
        description: `Current attestation covers ${ds.taxYear} production but expires ${fmtDate(latestEnd)}. Renewal is needed for ${ds.taxYear + 1} continuity; no ${ds.taxYear} credit impact.`,
        componentIds,
        supplierId: sup.id,
        evidenceIds: atts.map((a) => a.id),
        trigger: `Attestation coverage ends within ${EXPIRING_WINDOW_DAYS} days`,
        gatesCredit: false,
      });
    }
  }

  /* --------------------------- component-level --------------------------- */
  for (const c of ds.components) {
    if (c.category === "electrode_active_material") continue;
    const cap = c.capacity!;
    if (!cap.capacityTestEvidenceId) {
      issues.push({
        id: IssueIds.capacityMissing(c.id),
        type: "capacity_test_missing",
        severity: "high",
        title: `Capacity test report not uploaded — ${c.shortName}`,
        riskLabel: "Capacity test not uploaded",
        description: `Rated capacity drives kWh and therefore the entire ${c.shortName} credit. Only a marketing datasheet is on file.`,
        componentIds: [c.id],
        trigger: "Capacity test evidence missing for component",
        gatesCredit: true,
      });
    }
    const conflictDocs = ds.evidence.filter((e) => e.status === "conflicting" && e.category !== "supplier_attestation" && e.links.componentIds?.includes(c.id));
    if (conflictDocs.length >= 2) {
      issues.push({
        id: IssueIds.capacityConflict(c.id),
        type: "capacity_conflict",
        severity: "medium",
        title: `Conflicting rated capacity — ${c.shortName}`,
        riskLabel: "Conflicting capacity values",
        description: "Datasheet states 26.0 Ah; engineering specification ES-4680-002 states a 25.4 Ah minimum. The estimate currently uses 26.0 Ah (assumption).",
        componentIds: [c.id],
        evidenceIds: conflictDocs.map((e) => e.id),
        trigger: "Two sources disagree on rated capacity",
        gatesCredit: false,
      });
    }
    const cl = c.claimant;
    if (cl.claimingEntityId.kind !== "known" || (cl.contractManufacturing.value && !cl.claimantAgreementEvidenceId)) {
      issues.push({
        id: IssueIds.claimant(c.id),
        type: "claimant_undetermined",
        severity: "high",
        title: `Claimant not established — ${c.shortName} contract manufacturing`,
        riskLabel: "Claimant / contract manufacturing unresolved",
        description: `${c.shortName} is assembled by ${ds.entities.find((e) => e.id === cl.manufacturingEntityId.value)?.name}. No signed agreement designates the claiming party, and the draft agreement reserves the tax-credit clause.`,
        componentIds: [c.id],
        facilityId: c.facilityId,
        evidenceIds: ["EV-CMA-DRAFT"],
        trigger: "Contract manufacturing = Yes; claimant agreement evidence missing",
        gatesCredit: true,
      });
    }
  }

  /* ---------------------------- facility-level --------------------------- */
  for (const f of ds.facilities) {
    if (f.section48C.value === "unknown") {
      const componentIds = ds.components.filter((c) => c.facilityId === f.id).map((c) => c.id);
      issues.push({
        id: IssueIds.section48C(f.id),
        type: "section_48c_unknown",
        severity: "medium",
        title: `Section 48C status unconfirmed — ${f.shortName}`,
        riskLabel: "Section 48C status unconfirmed",
        description: "Eligible components produced using property that received a post-2022 §48C credit are excluded. No confirmation has been obtained for this facility.",
        componentIds,
        facilityId: f.id,
        trigger: "Facility §48C status is Unknown",
        gatesCredit: true,
      });
    }
  }

  /* ------------------------------ sale-level ----------------------------- */
  const yearSales = ds.sales.filter((s) => yearOf(s.saleDate) === ds.taxYear);
  const rpByComp = new Map<ID, ID[]>();
  for (const s of yearSales.filter((x) => x.relatedParty)) rpByComp.set(s.componentId, [...(rpByComp.get(s.componentId) ?? []), s.id]);
  for (const [componentId, saleIds] of rpByComp) {
    const units = yearSales.filter((s) => saleIds.includes(s.id)).reduce((n, s) => n + s.quantity, 0);
    issues.push({
      id: IssueIds.relatedParty(componentId),
      type: "related_party_sale",
      severity: "medium",
      title: `Related-party sale treatment requires review — ${comp(componentId).shortName}`,
      riskLabel: "Related-party sale treatment requires review",
      description: `${units.toLocaleString("en-US")} units sold to Volterra Energy Storage LLC (common control). Without a §45X(a)(3)(B) election, these sales may not be qualified sales to an unrelated person.`,
      componentIds: [componentId],
      saleIds,
      trigger: "Sale flagged related-party; no related-person election certification on file",
      gatesCredit: true,
    });
  }
  for (const s of yearSales.filter((x) => x.matchStatus === "unmatched")) {
    issues.push({
      id: IssueIds.unmatchedSale(s.id),
      type: "unmatched_sale",
      severity: "medium",
      title: `Unmatched sales record — ${s.invoiceNumber}`,
      riskLabel: "Unmatched sales record",
      description: s.matchNote ?? "Sales record could not be matched.",
      componentIds: [s.componentId],
      saleIds: [s.id],
      trigger: "Sales register line has no customer-master match and no production-lot allocation",
      gatesCredit: true,
    });
  }

  /* ----------------------------- batch-level ----------------------------- */
  for (const b of lots.filter((x) => !x.workOrderEvidenceId)) {
    issues.push({
      id: IssueIds.workOrder(b.id),
      type: "work_order_missing",
      severity: "low",
      title: `Work order missing — ${b.id}`,
      riskLabel: "Work order missing",
      description: `Work order ${b.workOrder} is not in the work-order extract. MES lot record exists; quantities are supported by MES only.`,
      componentIds: [b.componentId],
      batchIds: [b.id],
      trigger: "MES lot has no matching work order",
      gatesCredit: false,
    });
  }

  return issues;
}
