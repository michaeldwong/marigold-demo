import type {
  ComponentCategory,
  ID,
  ISODate,
  ISODateTime,
  ManufacturerDataset,
} from "@/lib/domain/types";

/* -------------------------------------------------------------------------- */
/* Rule versions & citations                                                  */
/* -------------------------------------------------------------------------- */

export interface RuleVersion {
  id: string;
  label: string;
  status: "placeholder" | "advisor_reviewed";
  effective: { from: ISODate; to: ISODate | null };
  description: string;
}

/** A pointer into regulatory source material under docs/compliance/. */
export interface RegulatoryCitation {
  id: ID;
  /** Human-readable document title. */
  document: string;
  /** Repository-relative path under docs/compliance/. */
  file: string;
  page?: number;
  section: string;
  /** Short human label for inline references, e.g. "Battery cell definition". */
  short: string;
  excerpt: string;
}

/* -------------------------------------------------------------------------- */
/* Findings                                                                   */
/* -------------------------------------------------------------------------- */

export type EligibilityStatus =
  | "eligible"
  | "likely_eligible"
  | "pending_information"
  | "requires_review"
  | "ineligible"
  | "not_evaluated";

export type CheckStatus = "supported" | "pending" | "issue" | "not_applicable" | "not_evaluated";

/** One element of a component's structured 45X determination. */
export interface DeterminationCheck {
  key:
    | "classification"
    | "us_production"
    | "production_period"
    | "sale"
    | "capacity"
    | "claimant"
    | "material_assistance"
    | "section_48c";
  label: string;
  status: CheckStatus;
  /** Display value, e.g. "Supported" or "5.2 Ah". */
  value: string;
  detail: string;
  sourceIds: ID[];
  issueIds: ID[];
  citationIds: ID[];
}

/**
 * The shape every compliance result must take — mock today, grounded later.
 * TODO: Every future compliance finding must carry source citations.
 */
export interface ComplianceFinding {
  id: ID;
  subjectId: ID;
  status: EligibilityStatus;
  finding: string;
  reasoning: string;
  ruleVersion: string;
  /** Regulatory citations (docs/compliance) supporting the reasoning. */
  sources: RegulatoryCitation[];
  generatedAt: ISODateTime;
  generatedBy: "mock_rules_engine";
}

export interface ComponentDetermination {
  componentId: ID;
  status: EligibilityStatus;
  headline: string;
  checks: DeterminationCheck[];
  finding: ComplianceFinding;
  ruleVersionId: string;
}

/* -------------------------------------------------------------------------- */
/* Issues (the exception queue)                                               */
/* -------------------------------------------------------------------------- */

export type IssueType =
  | "attestation_expired"
  | "attestation_missing"
  | "attestation_expiring"
  | "ownership_unknown"
  | "pfe_risk"
  | "pfe_review"
  | "capacity_test_missing"
  | "capacity_conflict"
  | "related_party_sale"
  | "unmatched_sale"
  | "claimant_undetermined"
  | "section_48c_unknown"
  | "ein_conflict"
  | "work_order_missing";

export type Severity = "high" | "medium" | "low";

export interface Issue {
  id: ID;
  type: IssueType;
  severity: Severity;
  title: string;
  /** Short label used in credit-at-risk breakdowns. */
  riskLabel: string;
  description: string;
  componentIds: ID[];
  supplierId?: ID;
  facilityId?: ID;
  saleIds?: ID[];
  batchIds?: ID[];
  evidenceIds?: ID[];
  bomVersionIds?: ID[];
  /** What missing fact or evidence caused this issue. */
  trigger: string;
  /** Whether this issue can gate credit (vs. hygiene/continuity only). */
  gatesCredit: boolean;
}

export type IssueResolutionState = "open" | "answered" | "resolved" | "rejected";

export type ResolutionOutcome = "substantiated" | "not_substantiated" | "pending";

export interface IssueResolution {
  issueId: ID;
  state: IssueResolutionState;
  /**
   * What the (human) answer means for the credit:
   * substantiated → stops blocking; not_substantiated → credit excluded / line non-qualifying.
   */
  outcome?: ResolutionOutcome;
  answer?: string;
  /** A resolved issue no longer blocks credit — always attributable to a human. */
  by?: string;
  at?: ISODateTime;
  note?: string;
}

/* -------------------------------------------------------------------------- */
/* Credit                                                                     */
/* -------------------------------------------------------------------------- */

export type CreditLineStatus = "supported" | "at_risk" | "excluded";

/** Credit attributable to one sale allocated to one production lot. */
export interface CreditLine {
  id: ID;
  componentId: ID;
  saleId: ID;
  batchId?: ID;
  bomVersionId?: ID;
  units: number;
  kwhPerUnit: number;
  kwh: number;
  ratePerKwh: number;
  phaseOutPct: number;
  credit: number;
  status: CreditLineStatus;
  /** Issues blocking substantiation, with the share of this line's credit attributed to each. */
  blockers: { issueId: ID; share: number }[];
  /** Other open issues touching this line (not used for attribution). */
  otherIssueIds: ID[];
  macr?: { supportedRatio: number; potentialRatio: number; threshold: number };
  excludedReason?: string;
}

export interface ComponentCredit {
  componentId: ID;
  estimated: number;
  supported: number;
  atRisk: number;
  excluded: number;
  unitsSold: number;
  kwh: number;
  ratePerKwh: number;
  lines: CreditLine[];
}

export interface CreditAtRiskItem {
  issueId: ID;
  amount: number;
}

export interface CreditSummary {
  estimated: number;
  supported: number;
  atRisk: number;
  excluded: number;
  byComponent: ComponentCredit[];
  atRiskByIssue: CreditAtRiskItem[];
}

/* -------------------------------------------------------------------------- */
/* Material assistance (MACR)                                                 */
/* -------------------------------------------------------------------------- */

export type MacrLineTreatment =
  | "qualifying"
  | "pending"
  | "non_qualifying";

export interface MacrLineResult {
  bomLineId: ID;
  materialId: ID;
  supplierId: ID;
  unitCost: number;
  treatment: MacrLineTreatment;
  reason: string;
  issueIds: ID[];
}

export interface MacrWindow {
  /** Unique key: BOM version + attestation coverage window. */
  key: string;
  bomVersionId: ID;
  from: ISODate;
  to: ISODate;
  threshold: number;
  denominatorPerUnit: number;
  supportedNumeratorPerUnit: number;
  potentialNumeratorPerUnit: number;
  supportedRatio: number;
  potentialRatio: number;
  result: "pass" | "pass_pending_evidence" | "fail";
  /** Minimal set of pending lines that must resolve for the window to pass. */
  blockingIssueIds: ID[];
  /** Attribution of the window's at-risk credit to blocking issues (pro rata by line cost). */
  blockingShares: { issueId: ID; share: number }[];
  batchIds: ID[];
  lines: MacrLineResult[];
  unitsProduced: number;
}

export interface MacrSummary {
  componentId: ID;
  threshold: number;
  windows: MacrWindow[];
  /** Annualised, production-weighted totals (USD). */
  denominator: number;
  supportedNumerator: number;
  potentialNumerator: number;
  supportedRatio: number;
  potentialRatio: number;
  result: "pass" | "pass_pending_evidence" | "fail" | "not_applicable";
}

/* -------------------------------------------------------------------------- */
/* Evidence coverage & data quality                                           */
/* -------------------------------------------------------------------------- */

export type RequirementStatus =
  | "supported"
  | "missing"
  | "expiring"
  | "expired"
  | "conflicting"
  | "pending_review";

export interface EvidenceRequirement {
  id: ID;
  label: string;
  category: import("@/lib/domain/types").DocumentCategory;
  status: RequirementStatus;
  evidenceIds: ID[];
  componentIds: ID[];
  supplierId?: ID;
  facilityId?: ID;
  saleId?: ID;
  period?: string;
  issueIds: ID[];
  detail: string;
}

export interface EvidenceCoverage {
  total: number;
  supported: number;
  missing: number;
  expiring: number;
  expired: number;
  conflicting: number;
  pendingReview: number;
  /** supported / total — evidence sufficiency, not compliance. */
  pctComplete: number;
  requirements: EvidenceRequirement[];
}

export interface DataQualityRecord {
  id: ID;
  label: string;
  kind: "extraction" | "entity_match" | "record_match";
  confidence: number;
  state: "high_confidence" | "needs_review" | "unmatched";
  sourceId?: ID;
  detail: string;
}

export interface DataQuality {
  totalRecords: number;
  highConfidencePct: number;
  needsReview: number;
  unmatched: number;
  records: DataQualityRecord[];
}

/* -------------------------------------------------------------------------- */
/* Questions, tasks, review, audit                                            */
/* -------------------------------------------------------------------------- */

export type Team = import("@/lib/domain/types").Person["team"];

export interface QuestionOption {
  id: string;
  label: string;
  /** What this answer would mean once a professional reviewer accepts it. */
  outcome: ResolutionOutcome;
  requiresText?: boolean;
  textPlaceholder?: string;
}

export interface Question {
  id: ID;
  issueId: ID;
  priority: Severity;
  question: string;
  whyItMatters: string;
  trigger: string;
  componentIds: ID[];
  affectedLabel: string;
  creditAffected: number;
  assignedTeam: Team;
  options: QuestionOption[];
}

export type QuestionStatus = "open" | "information_requested" | "answered" | "resolved";

export interface QuestionState {
  status: QuestionStatus;
  answer?: string;
  answeredBy?: string;
  answeredAt?: ISODateTime;
}

export type TaskStatus = "awaiting_upload" | "in_progress" | "needs_review" | "blocked" | "complete";

export interface Task {
  id: ID;
  title: string;
  issueId?: ID;
  affectedLabel: string;
  ownerId?: ID;
  due: ISODate;
  evidenceReceived: number;
  evidenceRequired: number;
  status: TaskStatus;
  createdFrom: "seed" | "question" | "reviewer";
}

export type ReviewStage = "automated" | "needs_review" | "reviewed" | "locked";

export type ReviewAction = "approve" | "reject" | "request_info" | "note" | "lock" | "escalate";

export interface ReviewEntry {
  id: ID;
  componentId: ID;
  at: ISODateTime;
  actor: string;
  actorRole: string;
  action: ReviewAction;
  note: string;
  /** Snapshot of the automated result at the time of the human decision. */
  automatedStatus: EligibilityStatus;
  automatedHeadline: string;
}

export type AuditEventType =
  | "document_uploaded"
  | "data_extracted"
  | "record_matched"
  | "value_changed"
  | "evidence_superseded"
  | "question_answered"
  | "bom_changed"
  | "supplier_changed"
  | "determination_changed"
  | "reviewer_decision"
  | "calculation_refreshed"
  | "task_updated";

export interface AuditEvent {
  id: ID;
  at: ISODateTime;
  type: AuditEventType;
  title: string;
  actor: string;
  change?: { field: string; from: string; to: string };
  triggeredBy?: string;
  affected: string[];
  recalculation?: { label: string; from: string; to: string };
  note?: string;
}

/* -------------------------------------------------------------------------- */
/* Service boundaries                                                         */
/* -------------------------------------------------------------------------- */

/** Normalized facts handed to the compliance layer. Today: the whole dataset. */
export type ManufacturingFacts = ManufacturerDataset;

export interface ComplianceContext {
  taxYear: number;
  asOf: ISODate;
  ruleVersion: RuleVersion;
  resolutions: Record<ID, IssueResolution>;
  /** Evidence IDs received in-app that are awaiting review. */
  pendingEvidence: Record<ID, ID[]>;
}

export interface CategoryRate {
  category: ComponentCategory;
  label: string;
  basis: string;
  ratePerKwh?: number;
  citationId: ID;
}
