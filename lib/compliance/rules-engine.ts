/**
 * Compliance rules-engine boundary.
 *
 * The UI depends only on this interface. Today it is implemented by
 * `MockRulesEngine` (deterministic placeholder logic). The future engine will:
 *   - evaluate versioned, advisor-reviewed rules (RuleVersion)
 *   - ground every finding in citations from docs/compliance/ (RegulatoryKnowledgeService)
 *   - keep calculations deterministic and reproducible per rule version
 *
 * Product boundary: Raw evidence → extraction/mapping → structured facts →
 * versioned deterministic calculations → compliance finding → professional
 * review → locked determination. AI may assist extraction and explanation; it
 * is never the final authority for a determination.
 */

import type { ID } from "@/lib/domain/types";
import type {
  ComplianceContext,
  ComponentDetermination,
  CreditSummary,
  DataQuality,
  EvidenceCoverage,
  Issue,
  MacrSummary,
  ManufacturingFacts,
  Question,
} from "./types";
import type { MaterialAssistanceResult } from "@/lib/calculations/material-assistance";

export interface WorkspaceAnalysis {
  ruleVersionId: string;
  issues: Issue[];
  macr: Record<ID, MaterialAssistanceResult>;
  credit: CreditSummary;
  determinations: Record<ID, ComponentDetermination>;
  evidence: EvidenceCoverage;
  dataQuality: DataQuality;
  questions: Question[];
}

export interface ComplianceRulesEngine {
  analyze(facts: ManufacturingFacts, context: ComplianceContext): WorkspaceAnalysis;
}

export type { MacrSummary };
