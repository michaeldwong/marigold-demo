"use client";

import { Check, CircleDashed, Clock, Minus, TriangleAlert, X } from "lucide-react";
import type { PfeStatus } from "@/lib/domain/types";
import type {
  CheckStatus,
  EligibilityStatus,
  RequirementStatus,
  ReviewStage,
  Severity,
  TaskStatus,
} from "@/lib/compliance/types";
import { Pill, cx, type Tone } from "./primitives";

export const ELIGIBILITY: Record<EligibilityStatus, { label: string; tone: Tone }> = {
  eligible: { label: "Eligible", tone: "ok" },
  likely_eligible: { label: "Likely eligible", tone: "warn" },
  pending_information: { label: "Pending information", tone: "warn" },
  requires_review: { label: "Requires professional review", tone: "bad" },
  ineligible: { label: "Ineligible", tone: "bad" },
  not_evaluated: { label: "Not evaluated", tone: "mute" },
};
export function EligibilityPill({ status }: { status: EligibilityStatus }) {
  return <Pill tone={ELIGIBILITY[status].tone}>{ELIGIBILITY[status].label}</Pill>;
}

export const REQUIREMENT: Record<RequirementStatus, { label: string; tone: Tone }> = {
  supported: { label: "Supported", tone: "ok" },
  missing: { label: "Missing", tone: "bad" },
  expired: { label: "Expired", tone: "bad" },
  expiring: { label: "Expiring", tone: "warn" },
  conflicting: { label: "Conflicting", tone: "warn" },
  pending_review: { label: "Pending review", tone: "info" },
};
export function RequirementPill({ status }: { status: RequirementStatus }) {
  return <Pill tone={REQUIREMENT[status].tone}>{REQUIREMENT[status].label}</Pill>;
}

export const TASK_STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  awaiting_upload: { label: "Awaiting upload", tone: "mute" },
  in_progress: { label: "In progress", tone: "info" },
  needs_review: { label: "Needs review", tone: "warn" },
  blocked: { label: "Blocked", tone: "bad" },
  complete: { label: "Complete", tone: "ok" },
};
export function TaskStatusPill({ status }: { status: TaskStatus }) {
  return <Pill tone={TASK_STATUS[status].tone}>{TASK_STATUS[status].label}</Pill>;
}

export const PFE: Record<PfeStatus, { label: string; tone: Tone }> = {
  clear: { label: "Clear", tone: "ok" },
  pfe_risk: { label: "PFE risk", tone: "bad" },
  review_required: { label: "Review required", tone: "warn" },
  unknown: { label: "Unknown", tone: "mute" },
  not_evaluated: { label: "Not evaluated", tone: "mute" },
};
export function PfePill({ status }: { status: PfeStatus }) {
  return <Pill tone={PFE[status].tone}>{PFE[status].label}</Pill>;
}

export const STAGE: Record<ReviewStage, { label: string; tone: Tone }> = {
  automated: { label: "Automated assessment", tone: "mute" },
  needs_review: { label: "Needs professional review", tone: "warn" },
  reviewed: { label: "Reviewed", tone: "ok" },
  locked: { label: "Locked", tone: "info" },
};
const STAGE_SHORT: Record<ReviewStage, string> = { automated: "Automated", needs_review: "Needs review", reviewed: "Reviewed", locked: "Locked" };
export function StagePill({ stage, compact }: { stage: ReviewStage; compact?: boolean }) {
  return <Pill tone={STAGE[stage].tone}>{compact ? STAGE_SHORT[stage] : STAGE[stage].label}</Pill>;
}

export const SEVERITY: Record<Severity, { label: string; tone: Tone }> = {
  high: { label: "High priority", tone: "bad" },
  medium: { label: "Medium", tone: "warn" },
  low: { label: "Low", tone: "mute" },
};
export function SeverityPill({ severity }: { severity: Severity }) {
  return <Pill tone={SEVERITY[severity].tone}>{SEVERITY[severity].label}</Pill>;
}

export function CheckIcon({ status }: { status: CheckStatus }) {
  const cls = "h-4 w-4 rounded-full p-[2px]";
  switch (status) {
    case "supported":
      return <Check className={cx(cls, "bg-ok-bg text-ok")} strokeWidth={3} aria-label="Supported" />;
    case "pending":
      return <Clock className={cx(cls, "bg-warn-bg text-warn")} strokeWidth={2.5} aria-label="Pending" />;
    case "issue":
      return <X className={cx(cls, "bg-bad-bg text-bad")} strokeWidth={3} aria-label="Issue" />;
    case "not_evaluated":
      return <CircleDashed className="h-4 w-4 text-ink-4" aria-label="Not evaluated" />;
    default:
      return <Minus className="h-4 w-4 text-ink-4" aria-label="Not applicable" />;
  }
}

export const CHECK_LABEL: Record<CheckStatus, string> = {
  supported: "Supported",
  pending: "Pending",
  issue: "Issue",
  not_applicable: "N/A",
  not_evaluated: "Not evaluated",
};

/** Supply-chain row status chips (derived from MACR line treatment + issues). */
export type BomRowStatus =
  | "clear"
  | "pfe_risk"
  | "ownership_unknown"
  | "attestation_expired"
  | "attestation_expiring"
  | "missing_certification"
  | "review_required"
  | "conflicting";

export const BOM_ROW: Record<BomRowStatus, { label: string; tone: Tone }> = {
  clear: { label: "Clear", tone: "ok" },
  pfe_risk: { label: "PFE risk", tone: "bad" },
  ownership_unknown: { label: "Ownership unknown", tone: "warn" },
  attestation_expired: { label: "Attestation expired", tone: "bad" },
  attestation_expiring: { label: "Attestation expiring", tone: "warn" },
  missing_certification: { label: "Missing certification", tone: "bad" },
  review_required: { label: "Review required", tone: "warn" },
  conflicting: { label: "Conflicting evidence", tone: "warn" },
};
export function BomRowPill({ status }: { status: BomRowStatus }) {
  const s = BOM_ROW[status];
  return (
    <Pill tone={s.tone}>
      {status === "pfe_risk" && <TriangleAlert className="-ml-0.5 h-3 w-3" aria-hidden />}
      {s.label}
    </Pill>
  );
}
