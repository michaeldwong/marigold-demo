"use client";

import { useMemo } from "react";
import type { ID } from "@/lib/domain/types";
import type { CreditSummary, EvidenceCoverage, Issue, Question, RequirementStatus } from "@/lib/compliance/types";
import { useWorkspace } from "./workspace";

export interface ScopedAnalysis {
  componentIds: ID[];
  credit: CreditSummary;
  issues: Issue[];
  questions: Question[];
  evidence: EvidenceCoverage;
}

/** Restricts the workspace analysis to the selected facility. Totals are re-summed from credit lines. */
export function useScopedAnalysis(): ScopedAnalysis {
  const { analysis, dataset, state } = useWorkspace();
  return useMemo(() => {
    const componentIds = dataset.components
      .filter((c) => state.facilityId === "all" || c.facilityId === state.facilityId)
      .map((c) => c.id);
    const inScope = (ids: ID[]) => ids.some((id) => componentIds.includes(id));
    const byComponent = analysis.credit.byComponent.filter((c) => componentIds.includes(c.componentId));
    const atRisk = new Map<ID, number>();
    for (const l of byComponent.flatMap((c) => c.lines)) for (const b of l.blockers) atRisk.set(b.issueId, (atRisk.get(b.issueId) ?? 0) + l.credit * b.share);
    const sum = (k: "estimated" | "supported" | "atRisk" | "excluded") => byComponent.reduce((s, c) => s + c[k], 0);
    const credit: CreditSummary = {
      estimated: sum("estimated"),
      supported: sum("supported"),
      atRisk: sum("atRisk"),
      excluded: sum("excluded"),
      byComponent,
      atRiskByIssue: [...atRisk].map(([issueId, amount]) => ({ issueId, amount })).sort((a, b) => b.amount - a.amount),
    };
    const reqs = analysis.evidence.requirements.filter((r) => inScope(r.componentIds) || (r.facilityId && (state.facilityId === "all" || r.facilityId === state.facilityId)));
    const count = (s: RequirementStatus) => reqs.filter((r) => r.status === s).length;
    const evidence: EvidenceCoverage = {
      total: reqs.length,
      supported: count("supported"),
      missing: count("missing"),
      expiring: count("expiring"),
      expired: count("expired"),
      conflicting: count("conflicting"),
      pendingReview: count("pending_review"),
      pctComplete: reqs.length ? (count("supported") + count("expiring")) / reqs.length : 0,
      requirements: reqs,
    };
    return {
      componentIds,
      credit,
      issues: analysis.issues.filter((i) => inScope(i.componentIds)),
      questions: analysis.questions.filter((q) => inScope(q.componentIds)),
      evidence,
    };
  }, [analysis, dataset, state.facilityId]);
}
