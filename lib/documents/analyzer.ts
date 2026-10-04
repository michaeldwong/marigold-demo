/**
 * Document-analysis boundary.
 *
 * The UI only depends on `ComplianceDocumentAnalyzer`. Today it is backed by
 * `MockDocumentAnalyzer` (filename heuristics, simulated latency). The future
 * pipeline will classify documents, extract fields with page/row-level
 * provenance, resolve entities against the supplier/customer masters, and hand
 * structured facts to the rules engine — never conclusions.
 */

import type { DocumentCategory, ID } from "@/lib/domain/types";

export interface ExtractedField {
  field: string;
  value: string;
  confidence: number;
  /** Where in the document the value was found. */
  locator: { page?: number; sheet?: string; row?: number; column?: string; excerpt?: string };
}

export interface DocumentAnalysisResult {
  suggestedCategory: DocumentCategory;
  categoryConfidence: number;
  /** Open issues this document may satisfy (suggested evidence links). */
  suggestedIssueIds: ID[];
  extractedFields: ExtractedField[];
  status: "pending_compliance_analysis";
  analyzerVersion: string;
}

export interface ComplianceDocumentAnalyzer {
  analyzeDocument(file: Pick<File, "name" | "size" | "type">, context: { openIssueIds: ID[] }): Promise<DocumentAnalysisResult>;
}

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "bom", label: "BOM" },
  { value: "supplier_attestation", label: "Supplier attestation" },
  { value: "supplier_master", label: "Supplier master" },
  { value: "mes_extract", label: "MES extract" },
  { value: "production_record", label: "Production record" },
  { value: "work_order", label: "Work order" },
  { value: "invoice", label: "Invoice" },
  { value: "sales_report", label: "Sales report" },
  { value: "capacity_test", label: "Capacity test" },
  { value: "contract", label: "Contract" },
  { value: "entity_documentation", label: "Entity documentation" },
  { value: "section_48c", label: "Section 48C documentation" },
  { value: "other", label: "Other" },
];

export const categoryLabel = (c: DocumentCategory) => DOCUMENT_CATEGORIES.find((x) => x.value === c)?.label ?? c;
