import type { DocumentCategory, ID } from "@/lib/domain/types";
import type { ComplianceDocumentAnalyzer, DocumentAnalysisResult } from "./analyzer";

/**
 * Mock analyzer: guesses a category and candidate evidence links from the file
 * name only. No file contents are read and nothing leaves the browser.
 *
 * TODO: Replace with LLM-backed document extraction pipeline.
 * TODO: Every extracted field must carry page/sheet/row provenance and a
 * confidence score; low-confidence fields route to human review.
 */
const CATEGORY_RULES: [RegExp, DocumentCategory][] = [
  [/attest|certif|non.?pfe|representation/i, "supplier_attestation"],
  [/bom|bill.?of.?material/i, "bom"],
  [/supplier.?master|vendor.?master/i, "supplier_master"],
  [/mes|production.?export/i, "mes_extract"],
  [/work.?order|\bwo[-_]/i, "work_order"],
  [/invoice|\binv[-_]/i, "invoice"],
  [/sales.?(report|register)/i, "sales_report"],
  [/capacity|rated|test.?report|usabc|iec/i, "capacity_test"],
  [/48c/i, "section_48c"],
  [/agreement|contract|msa|cma/i, "contract"],
  [/entity|org.?chart|ownership|cap.?table/i, "entity_documentation"],
  [/production|batch|lot/i, "production_record"],
];

const ISSUE_RULES: [RegExp, ID][] = [
  [/northstar/i, "ISS-ATT-GAP-SUP-1203"],
  [/qingdao|qsm|harborline/i, "ISS-OWN-SUP-1842"],
  [/lumen/i, "ISS-ATT-MISSING-SUP-1791"],
  [/huaxin/i, "ISS-PFE-SUP-1519"],
  [/pacific.?rim/i, "ISS-PFE-SUP-1902"],
  [/great.?lakes/i, "ISS-EIN-SUP-1610"],
  [/4680/i, "ISS-CAP-MISSING-CMP-4680"],
  [/lakeshore|contract.?manuf/i, "ISS-CLAIMANT-CMP-VM16"],
  [/batavia|48c/i, "ISS-48C-FAC-BTV"],
  [/related|appendix.?b|election|ves\b/i, "ISS-RP-CMP-2170"],
  [/evolv|ev0lv/i, "ISS-UNMATCHED-SAL-0025"],
  [/00421|wo-l1-202710/i, "ISS-WO-BATCH-2027-00421"],
];

export class MockDocumentAnalyzer implements ComplianceDocumentAnalyzer {
  async analyzeDocument(file: Pick<File, "name" | "size" | "type">, context: { openIssueIds: ID[] }): Promise<DocumentAnalysisResult> {
    await new Promise((r) => setTimeout(r, 600));
    const hit = CATEGORY_RULES.find(([re]) => re.test(file.name));
    const issues = ISSUE_RULES.filter(([re, id]) => re.test(file.name) && context.openIssueIds.includes(id)).map(([, id]) => id);
    return {
      suggestedCategory: hit?.[1] ?? "other",
      categoryConfidence: hit ? 0.72 : 0.3,
      suggestedIssueIds: issues,
      extractedFields: [],
      status: "pending_compliance_analysis",
      analyzerVersion: "mock-filename-heuristics-0.1",
    };
  }
}

export const documentAnalyzer: ComplianceDocumentAnalyzer = new MockDocumentAnalyzer();
