/**
 * Evidence sufficiency — does the evidence on file cover the relevant product,
 * supplier, facility and period? This is deliberately separate from both
 * compliance status and data (extraction) confidence.
 *
 * PLACEHOLDER ONLY: the requirement list is a demonstration of the shape of
 * evidence requirements. The authoritative list must come from the reviewed
 * rule version (TODO: derive requirements from versioned rules).
 */

import type { ID, ManufacturerDataset } from "@/lib/domain/types";
import type { ComplianceContext, EvidenceCoverage, EvidenceRequirement, Issue, RequirementStatus } from "@/lib/compliance/types";
import { IssueIds } from "@/lib/compliance/issue-ids";
import { batchesInScope, bomVersionFor, supplierAttestations } from "./material-assistance";
import { yearOf } from "./dates";
import { fmtDate } from "@/lib/format";

export function evaluateEvidenceCoverage(ds: ManufacturerDataset, ctx: ComplianceContext, issues: Issue[]): EvidenceCoverage {
  const reqs: EvidenceRequirement[] = [];
  const issueIds = new Set(issues.map((i) => i.id));
  const has = (id: ID) => issueIds.has(id);

  /** Applies workflow state (uploads awaiting review, reviewer resolutions) on top of the base status. */
  const withWorkflow = (r: Omit<EvidenceRequirement, "status"> & { status: RequirementStatus }): EvidenceRequirement => {
    if (r.status === "supported") return r;
    const resolved = r.issueIds.length > 0 && r.issueIds.every((id) => ctx.resolutions[id]?.state === "resolved");
    if (resolved) return { ...r, status: "supported", detail: `${r.detail} — resolved by professional review` };
    const uploads = r.issueIds.flatMap((id) => ctx.pendingEvidence[id] ?? []);
    if (uploads.length && r.status !== "expiring") return { ...r, status: "pending_review", evidenceIds: [...r.evidenceIds, ...uploads], detail: `${r.detail} — new evidence received, pending review` };
    return r;
  };
  const push = (r: Omit<EvidenceRequirement, "status"> & { status: RequirementStatus }) => reqs.push(withWorkflow(r));

  const lots = batchesInScope(ds);
  const yearSales = ds.sales.filter((s) => yearOf(s.saleDate) === ds.taxYear);

  /* Supplier certifications ------------------------------------------------ */
  const usedSuppliers = new Map<ID, Set<ID>>();
  for (const lot of lots) {
    const bom = bomVersionFor(ds, lot.componentId, lot.productionDate);
    for (const l of bom?.lines ?? []) {
      usedSuppliers.set(l.supplierId, (usedSuppliers.get(l.supplierId) ?? new Set()).add(lot.componentId));
    }
  }
  for (const [supplierId, comps] of usedSuppliers) {
    if (supplierId === "SUP-INT") continue;
    const sup = ds.suppliers.find((s) => s.id === supplierId)!;
    const atts = supplierAttestations(ds, supplierId);
    const componentIds = [...comps];
    const pfeIssue = IssueIds.pfe(supplierId);
    if (has(pfeIssue)) {
      const isRisk = sup.pfeStatusByYear[ds.taxYear] === "pfe_risk";
      push({
        id: `REQ-PFE-${supplierId}`,
        label: `PFE determination support — ${sup.name}`,
        category: "other",
        status: isRisk ? "supported" : "missing",
        evidenceIds: ds.evidence.filter((e) => e.links.supplierIds?.includes(supplierId)).map((e) => e.id),
        componentIds,
        supplierId,
        period: String(ds.taxYear),
        issueIds: isRisk ? [] : [pfeIssue],
        detail: isRisk ? "Documented as possible PFE; line excluded from qualifying numerator" : "Effective-control / licensing review documentation not received",
      });
      continue;
    }
    const gap = IssueIds.attestationGap(supplierId);
    const missing = IssueIds.attestationMissing(supplierId);
    const ein = IssueIds.einConflict(supplierId);
    const expiring = IssueIds.attestationExpiring(supplierId);
    const own = IssueIds.ownership(supplierId);
    let status: RequirementStatus = "supported";
    let detail = atts.length ? `Coverage ${atts.map((a) => `${fmtDate(a.attestation!.coverage.from)} – ${fmtDate(a.attestation!.coverage.to)}`).join("; ")}` : "No attestation received";
    const linked: ID[] = [];
    if (has(missing)) { status = "missing"; linked.push(missing); }
    else if (has(gap)) { status = "expired"; linked.push(gap); detail = issues.find((i) => i.id === gap)!.trigger; }
    else if (has(ein)) { status = "conflicting"; linked.push(ein); detail = "EIN on attestation conflicts with supplier master"; }
    else if (has(own) && atts.some((a) => a.status === "pending_review")) { status = "pending_review"; linked.push(own); detail = "Representation received; ultimate parent not identified"; }
    else if (has(expiring)) { status = "expiring"; linked.push(expiring); detail = issues.find((i) => i.id === expiring)!.title.split(" — ")[0]; }
    push({
      id: `REQ-ATT-${supplierId}`,
      label: `Supplier attestation — ${sup.name}`,
      category: "supplier_attestation",
      status,
      evidenceIds: atts.map((a) => a.id),
      componentIds,
      supplierId,
      period: String(ds.taxYear),
      issueIds: linked,
      detail,
    });
    if (sup.ultimateParentCountry !== "United States") {
      push({
        id: `REQ-OWN-${supplierId}`,
        label: `Ultimate parent disclosure — ${sup.name}`,
        category: "supplier_attestation",
        status: sup.ultimateParent.kind === "known" ? "supported" : "missing",
        evidenceIds: [
          ...new Set(
            sup.ownership
              .map((o) => ds.sources.find((src) => src.id === o.sourceId)?.evidenceId)
              .filter((x): x is ID => !!x),
          ),
        ],
        componentIds,
        supplierId,
        issueIds: has(own) ? [own] : [],
        detail: sup.ultimateParent.kind === "known" ? `Ultimate parent: ${sup.ultimateParent.value}` : "Beneficial ownership above immediate parent not disclosed",
      });
    }
  }

  /* Components: capacity, production, BOM ---------------------------------- */
  for (const c of ds.components) {
    if (c.category === "electrode_active_material") continue;
    const capMissing = IssueIds.capacityMissing(c.id);
    push({
      id: `REQ-CAP-${c.id}`,
      label: `Capacity test report — ${c.shortName}`,
      category: "capacity_test",
      status: c.capacity?.capacityTestEvidenceId ? "supported" : "missing",
      evidenceIds: c.capacity?.capacityTestEvidenceId ? [c.capacity.capacityTestEvidenceId] : [],
      componentIds: [c.id],
      issueIds: has(capMissing) ? [capMissing] : [],
      detail: c.capacity?.capacityTestEvidenceId ? c.capacity.testStandard : "Only a product datasheet is on file",
    });
    const conflict = IssueIds.capacityConflict(c.id);
    if (has(conflict)) {
      push({
        id: `REQ-CAPSPEC-${c.id}`,
        label: `Rated capacity specification — ${c.shortName}`,
        category: "other",
        status: "conflicting",
        evidenceIds: issues.find((i) => i.id === conflict)!.evidenceIds ?? [],
        componentIds: [c.id],
        issueIds: [conflict],
        detail: "Datasheet (26.0 Ah) and engineering spec (25.4 Ah) disagree",
      });
    }
    const compLots = lots.filter((b) => b.componentId === c.id);
    if (compLots.length) {
      push({
        id: `REQ-MES-${c.id}`,
        label: `MES production records — ${c.shortName}`,
        category: "mes_extract",
        status: "supported",
        evidenceIds: [...new Set(compLots.map((b) => (yearOf(b.productionDate) === ds.taxYear ? "EV-MES-2027" : "EV-MES-2026Q4")))],
        componentIds: [c.id],
        issueIds: [],
        detail: `${compLots.length} production lots`,
      });
    }
    for (const b of compLots.filter((x) => !x.workOrderEvidenceId)) {
      push({
        id: `REQ-WO-${b.id}`,
        label: `Work order ${b.workOrder} — ${b.id}`,
        category: "work_order",
        status: "missing",
        evidenceIds: [],
        componentIds: [c.id],
        issueIds: [IssueIds.workOrder(b.id)],
        detail: "Not present in work-order extract",
      });
    }
    push({
      id: `REQ-BOM-${c.id}`,
      label: `BOM version history — ${c.shortName}`,
      category: "bom",
      status: "supported",
      evidenceIds: [...new Set(ds.bomVersions.filter((v) => v.componentId === c.id).map((v) => v.sourceEvidenceId))],
      componentIds: [c.id],
      issueIds: [],
      detail: `${c.bomVersionIds.length} BOM version(s) with effective dates`,
    });
  }

  /* Sales: invoices and contracts per customer ------------------------------ */
  const groups = new Map<string, typeof yearSales>();
  for (const s of yearSales) groups.set(`${s.componentId}|${s.customerName}`, [...(groups.get(`${s.componentId}|${s.customerName}`) ?? []), s]);
  for (const [key, ss] of groups) {
    const [componentId, customer] = key.split("|");
    const comp = ds.components.find((c) => c.id === componentId)!;
    const missingInv = ss.filter((s) => !s.invoiceEvidenceId);
    push({
      id: `REQ-INV-${componentId}-${customer.replace(/\W+/g, "")}`,
      label: `Invoices — ${customer} (${comp.shortName})`,
      category: "invoice",
      status: missingInv.length ? "missing" : "supported",
      evidenceIds: ss.flatMap((s) => (s.invoiceEvidenceId ? [s.invoiceEvidenceId] : [])),
      componentIds: [componentId],
      saleId: missingInv[0]?.id,
      issueIds: missingInv.map((s) => IssueIds.unmatchedSale(s.id)).filter(has),
      detail: missingInv.length ? `No invoice for ${missingInv.map((s) => s.invoiceNumber).join(", ")}` : `${ss.length} invoice(s) matched`,
    });
  }
  const contracts = new Map<ID, ID[]>();
  for (const s of yearSales) if (s.contractEvidenceId) contracts.set(s.contractEvidenceId, [...new Set([...(contracts.get(s.contractEvidenceId) ?? []), s.componentId])]);
  for (const [evId, componentIds] of contracts) {
    const ev = ds.evidence.find((e) => e.id === evId)!;
    push({ id: `REQ-CTR-${evId}`, label: ev.title, category: "contract", status: "supported", evidenceIds: [evId], componentIds, issueIds: [], detail: ev.fileName });
  }

  /* Claimant & entity ------------------------------------------------------- */
  push({
    id: "REQ-ENTITY-MAP",
    label: "Legal entity & facility map",
    category: "entity_documentation",
    status: "supported",
    evidenceIds: ["EV-ENTITY-MAP"],
    componentIds: ds.components.map((c) => c.id),
    issueIds: [],
    detail: "Entity chart and intercompany relationships",
  });
  for (const c of ds.components) {
    const rp = IssueIds.relatedParty(c.id);
    if (has(rp)) {
      push({
        id: `REQ-RPE-${c.id}`,
        label: `Related person election certification (Appendix B) — ${c.shortName}`,
        category: "entity_documentation",
        status: "missing",
        evidenceIds: [],
        componentIds: [c.id],
        issueIds: [rp],
        detail: "Required if sales to Volterra Energy Storage LLC are treated as sales to an unrelated person",
      });
    }
    const cl = IssueIds.claimant(c.id);
    if (has(cl)) {
      push({
        id: `REQ-CMC-${c.id}`,
        label: `Contract manufacturing certification statement — ${c.shortName}`,
        category: "contract",
        status: "missing",
        evidenceIds: ["EV-CMA-DRAFT"],
        componentIds: [c.id],
        facilityId: c.facilityId,
        issueIds: [cl],
        detail: "Draft agreement received; certification statement not executed",
      });
    }
  }
  for (const f of ds.facilities) {
    const id48 = IssueIds.section48C(f.id);
    push({
      id: `REQ-48C-${f.id}`,
      label: `Section 48C documentation — ${f.shortName}`,
      category: "section_48c",
      status: has(id48) ? "missing" : "supported",
      evidenceIds: f.id === "FAC-ROC" ? ["EV-48C-ROC"] : [],
      componentIds: ds.components.filter((c) => c.facilityId === f.id).map((c) => c.id),
      facilityId: f.id,
      issueIds: has(id48) ? [id48] : [],
      detail: has(id48) ? "Facility owner has not confirmed §48C status" : "No post-2022 §48C allocation (memo)",
    });
  }

  const count = (s: RequirementStatus) => reqs.filter((r) => r.status === s).length;
  const supported = count("supported");
  return {
    total: reqs.length,
    supported,
    missing: count("missing"),
    expiring: count("expiring"),
    expired: count("expired"),
    conflicting: count("conflicting"),
    pendingReview: count("pending_review"),
    pctComplete: reqs.length ? (supported + count("expiring")) / reqs.length : 0,
    requirements: reqs,
  };
}
