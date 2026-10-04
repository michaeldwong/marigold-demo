/**
 * Data confidence — confidence that data was extracted, mapped or matched
 * correctly. It says nothing about legal compliance.
 */

import type { ManufacturerDataset } from "@/lib/domain/types";
import type { DataQuality, DataQualityRecord } from "@/lib/compliance/types";

export const REVIEW_THRESHOLD = 0.85;

export function evaluateDataQuality(ds: ManufacturerDataset): DataQuality {
  const records: DataQualityRecord[] = [];

  for (const s of ds.sources) {
    if (s.id.startsWith("SRC-SALE-")) continue; // represented by sale match records below
    const state = s.extractionConfidence >= REVIEW_THRESHOLD ? "high_confidence" : "needs_review";
    records.push({
      id: `DQ-${s.id}`,
      label: s.finding,
      kind: "extraction",
      confidence: s.extractionConfidence,
      state,
      sourceId: s.id,
      detail: s.extractionMethod === "structured_import" ? "Structured import" : "Mock extraction from document",
    });
  }
  for (const sup of ds.suppliers) {
    if (sup.masterMatch === "matched") continue;
    records.push({
      id: `DQ-SUP-${sup.id}`,
      label: `${sup.name} ↔ supplier master`,
      kind: "entity_match",
      confidence: sup.masterMatch === "alias_match" ? 0.82 : 0.4,
      state: sup.masterMatch === "alias_match" ? "needs_review" : "unmatched",
      detail:
        sup.masterMatch === "alias_match"
          ? `Matched by alias (“${sup.aliases[0]}”) — confirm entity`
          : "No supplier-master record; no EIN on file",
    });
  }
  for (const sale of ds.sales) {
    records.push({
      id: `DQ-SALE-${sale.id}`,
      label: `${sale.invoiceNumber} · ${sale.customerName}`,
      kind: "record_match",
      confidence: sale.matchStatus === "matched" ? 0.99 : 0.62,
      state: sale.matchStatus === "matched" ? "high_confidence" : "unmatched",
      sourceId: sale.sourceId,
      detail: sale.matchStatus === "matched" ? "Matched to customer master and production lots" : sale.matchNote ?? "Unmatched",
    });
  }
  for (const b of ds.batches.filter((x) => !x.workOrderEvidenceId)) {
    records.push({
      id: `DQ-WO-${b.id}`,
      label: `${b.id} ↔ work order ${b.workOrder}`,
      kind: "record_match",
      confidence: 0.5,
      state: "unmatched",
      sourceId: b.mesSourceId,
      detail: "MES lot has no matching work-order record",
    });
  }

  const high = records.filter((r) => r.state === "high_confidence").length;
  return {
    totalRecords: records.length,
    highConfidencePct: records.length ? high / records.length : 0,
    needsReview: records.filter((r) => r.state === "needs_review").length,
    unmatched: records.filter((r) => r.state === "unmatched").length,
    records,
  };
}
