"use client";

/**
 * Client-side workspace store (prototype).
 *
 * State is a seeded dataset plus user actions (answers, reviews, uploads, task
 * changes). All figures are re-derived by the rules engine on every change, and
 * every mutation appends an audit event — including before/after credit
 * figures when a recalculation changes them. State resets on refresh.
 *
 * TODO: Replace with a persistence API (append-only event log + versioned
 * calculation snapshots) once a backend exists.
 */

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { DocumentCategory, EvidenceDocument, Fact, ID, ManufacturerDataset, Person } from "@/lib/domain/types";
import type {
  AuditEvent,
  ComplianceContext,
  IssueResolution,
  QuestionState,
  ReviewAction,
  ReviewEntry,
  ReviewStage,
  Task,
} from "@/lib/compliance/types";
import { seedDataset } from "@/lib/data/mock-manufacturer";
import { seedAudit, seedReviewStages, seedReviews, seedTasks } from "@/lib/data/mock-workflow";
import { rulesEngine } from "@/lib/compliance/mock-rules-engine";
import type { WorkspaceAnalysis } from "@/lib/compliance/rules-engine";
import { ACTIVE_RULE_VERSION } from "@/lib/compliance/rule-versions";
import { fmtMoney } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

export interface UploadedDocument {
  id: ID;
  fileName: string;
  sizeKb: number;
  category: DocumentCategory;
  suggestedCategory?: DocumentCategory;
  categoryConfidence?: number;
  suggestedIssueIds: ID[];
  linkedIssueId?: ID;
  progress: number;
  status: "uploading" | "received" | "analyzing" | "pending_compliance_analysis";
  uploadedAt: string;
  uploadedBy: string;
}

export interface WorkspaceState {
  facilityId: "all" | ID;
  taxYear: number;
  personaId: ID;
  resolutions: Record<ID, IssueResolution>;
  pendingEvidence: Record<ID, ID[]>;
  supplierOverrides: Record<ID, { ultimateParent?: Fact<string> }>;
  questionStates: Record<ID, QuestionState>;
  tasks: Task[];
  reviews: ReviewEntry[];
  reviewStages: Record<ID, ReviewStage>;
  audit: AuditEvent[];
  uploads: UploadedDocument[];
  /** Simulated clock (minutes after the dataset's as-of morning) for deterministic timestamps. */
  clock: number;
  seq: number;
}

const initialState: WorkspaceState = {
  facilityId: "all",
  taxYear: seedDataset.taxYear,
  personaId: "P-AP",
  resolutions: {},
  pendingEvidence: {},
  supplierOverrides: {},
  questionStates: {},
  tasks: seedTasks,
  reviews: seedReviews,
  reviewStages: seedReviewStages,
  audit: seedAudit,
  uploads: [],
  clock: 0,
  seq: 1,
};

/* -------------------------------------------------------------------------- */
/* Derivation                                                                 */
/* -------------------------------------------------------------------------- */

export function deriveDataset(state: WorkspaceState): ManufacturerDataset {
  const suppliers = seedDataset.suppliers.map((s) => {
    const o = state.supplierOverrides[s.id];
    return o?.ultimateParent ? { ...s, ultimateParent: o.ultimateParent } : s;
  });
  const uploaded: EvidenceDocument[] = state.uploads
    .filter((u) => u.status !== "uploading")
    .map((u) => ({
      id: u.id,
      fileName: u.fileName,
      title: u.fileName,
      category: u.category,
      status: "pending_review",
      sizeKb: u.sizeKb,
      receivedAt: u.uploadedAt,
      source: "file_upload",
      links: {},
      note: "Uploaded in this session — pending compliance analysis (mock).",
    }));
  return { ...seedDataset, suppliers, evidence: [...seedDataset.evidence, ...uploaded] };
}

export function contextFor(state: WorkspaceState): ComplianceContext {
  return {
    taxYear: state.taxYear,
    asOf: seedDataset.asOf,
    ruleVersion: ACTIVE_RULE_VERSION,
    resolutions: state.resolutions,
    pendingEvidence: state.pendingEvidence,
  };
}

/** Wall-clock time of day on the dataset's as-of date (keeps session timestamps consistent with the demo timeline). */
export function sessionNow(): string {
  const now = new Date();
  return `${seedDataset.asOf}T${now.toISOString().slice(11, 19)}Z`;
}

function analyze(state: WorkspaceState): WorkspaceAnalysis {
  return rulesEngine.analyze(deriveDataset(state), contextFor(state));
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

type Action =
  | { type: "set_facility"; facilityId: "all" | ID }
  | { type: "answer_question"; questionId: ID; optionId: string; text?: string }
  | { type: "review_answer"; questionId: ID; accept: boolean; note?: string }
  | { type: "request_information"; questionId: ID }
  | { type: "update_task"; taskId: ID; patch: Partial<Pick<Task, "status" | "ownerId" | "due">> }
  | { type: "review_component"; componentId: ID; action: ReviewAction; note: string }
  | { type: "add_upload"; upload: UploadedDocument }
  | { type: "update_upload"; id: ID; patch: Partial<UploadedDocument> }
  | { type: "link_upload"; id: ID; issueId: ID | undefined };

function timestamp(state: WorkspaceState): string {
  const base = Date.parse(`${seedDataset.asOf}T14:00:00Z`);
  return new Date(base + state.clock * 60_000).toISOString().slice(0, 19) + "Z";
}

function personaName(id: ID): string {
  return seedDataset.people.find((p) => p.id === id)?.name ?? "User";
}

function creditDiff(before: WorkspaceAnalysis, after: WorkspaceAnalysis): AuditEvent["recalculation"] | undefined {
  if (Math.round(before.credit.supported) === Math.round(after.credit.supported) && Math.round(before.credit.estimated) === Math.round(after.credit.estimated)) return undefined;
  return {
    label: "Supported credit (estimated)",
    from: `${fmtMoney(before.credit.supported)} (${fmtMoney(before.credit.estimated)})`,
    to: `${fmtMoney(after.credit.supported)} (${fmtMoney(after.credit.estimated)})`,
  };
}

function withAudit(state: WorkspaceState, events: Omit<AuditEvent, "id" | "at">[]): WorkspaceState {
  const at = timestamp(state);
  const audit = [...state.audit, ...events.map((e, i) => ({ ...e, id: `AE-S${state.seq + i}`, at }))];
  return { ...state, audit, seq: state.seq + events.length, clock: state.clock + 3 };
}

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  const actor = personaName(state.personaId);
  switch (action.type) {
    case "set_facility":
      return { ...state, facilityId: action.facilityId };

    case "answer_question": {
      const before = analyze(state);
      const q = before.questions.find((x) => x.id === action.questionId);
      const opt = q?.options.find((o) => o.id === action.optionId);
      if (!q || !opt) return state;
      const answer = action.text ? `${opt.label}: ${action.text}` : opt.label;
      const issue = before.issues.find((i) => i.id === q.issueId)!;
      if (opt.outcome === "pending") {
        const next = {
          ...state,
          questionStates: { ...state.questionStates, [q.id]: { status: "information_requested" as const, answer, answeredBy: actor, answeredAt: timestamp(state) } },
        };
        return withAudit(ensureTask(next, q.issueId, `Obtain information: ${issue.riskLabel.toLowerCase()}`, q.affectedLabel, q.assignedTeam), [
          { type: "question_answered", title: `Question answered — information requested`, actor, affected: [q.affectedLabel], note: `${q.question} → ${answer}` },
        ]);
      }
      let next: WorkspaceState = {
        ...state,
        questionStates: { ...state.questionStates, [q.id]: { status: "answered", answer, answeredBy: actor, answeredAt: timestamp(state) } },
        resolutions: { ...state.resolutions, [q.issueId]: { issueId: q.issueId, state: "answered", outcome: opt.outcome, answer, by: actor, at: timestamp(state) } },
      };
      const events: Omit<AuditEvent, "id" | "at">[] = [
        { type: "question_answered", title: `Question answered — ${issue.riskLabel}`, actor, affected: [q.affectedLabel], note: `${q.question} → ${answer}. Awaiting professional review; automated result unchanged.` },
      ];
      if (issue.type === "ownership_unknown" && issue.supplierId && action.text) {
        next = {
          ...next,
          supplierOverrides: {
            ...next.supplierOverrides,
            [issue.supplierId]: { ultimateParent: { value: action.text, kind: "assumption", note: `Reported by ${actor} via questionnaire — unverified until professional review.` } },
          },
        };
        events.push({
          type: "supplier_changed",
          title: `Supplier ${issue.supplierId} ownership status changed`,
          actor,
          change: { field: "Ultimate parent", from: "Unknown", to: `Pending review (reported: ${action.text})` },
          triggeredBy: "Questionnaire answer",
          affected: [...issue.componentIds.map((id) => seedDataset.components.find((c) => c.id === id)!.shortName), "2027 Material Assistance Calculation"],
        });
      }
      const after = analyze(next);
      const rc = creditDiff(before, after);
      events.push({ type: "calculation_refreshed", title: "Calculation refreshed", actor: "System", affected: [q.affectedLabel], recalculation: rc ?? { label: "Supported credit", from: fmtMoney(before.credit.supported), to: `${fmtMoney(after.credit.supported)} — unchanged pending review` } });
      return withAudit(next, events);
    }

    case "review_answer": {
      const before = analyze(state);
      const q = before.questions.find((x) => x.id === action.questionId);
      if (!q) return state;
      const res = state.resolutions[q.issueId];
      const issue = before.issues.find((i) => i.id === q.issueId)!;
      if (!action.accept) {
        const next = {
          ...state,
          questionStates: { ...state.questionStates, [q.id]: { status: "open" as const } },
          resolutions: { ...state.resolutions, [q.issueId]: { ...res, issueId: q.issueId, state: "rejected" as const, by: actor, at: timestamp(state), note: action.note } },
        };
        return withAudit(next, [
          { type: "reviewer_decision", title: `Answer rejected — ${issue.riskLabel}`, actor, affected: [q.affectedLabel], change: { field: "Answer", from: res?.answer ?? "—", to: "Rejected; question reopened" }, note: action.note },
        ]);
      }
      let next: WorkspaceState = {
        ...state,
        questionStates: { ...state.questionStates, [q.id]: { ...state.questionStates[q.id], status: "resolved" } },
        resolutions: { ...state.resolutions, [q.issueId]: { ...res, issueId: q.issueId, state: "resolved", by: actor, at: timestamp(state), note: action.note } },
        tasks: state.tasks.map((t) => (t.issueId === q.issueId ? { ...t, status: "complete", evidenceReceived: t.evidenceRequired } : t)),
      };
      if (issue.type === "ownership_unknown" && issue.supplierId && state.supplierOverrides[issue.supplierId]?.ultimateParent) {
        const up = state.supplierOverrides[issue.supplierId].ultimateParent!;
        next = { ...next, supplierOverrides: { ...next.supplierOverrides, [issue.supplierId]: { ultimateParent: { ...up, kind: "known", note: `Verified by ${actor}` } } } };
      }
      const after = analyze(next);
      return withAudit(next, [
        {
          type: "reviewer_decision",
          title: `Answer accepted — ${issue.riskLabel}`,
          actor,
          affected: [q.affectedLabel],
          change: { field: "Issue status", from: "Answered — pending review", to: res?.outcome === "not_substantiated" ? "Resolved — not substantiated" : "Resolved — substantiated" },
          note: action.note,
        },
        {
          type: "calculation_refreshed",
          title: "Calculation refreshed",
          actor: "System",
          affected: issue.componentIds.map((id) => seedDataset.components.find((c) => c.id === id)!.shortName),
          recalculation: creditDiff(before, after) ?? { label: "Supported credit", from: fmtMoney(before.credit.supported), to: `${fmtMoney(after.credit.supported)} (no change)` },
        },
      ]);
    }

    case "request_information": {
      const a = analyze(state);
      const q = a.questions.find((x) => x.id === action.questionId);
      if (!q) return state;
      const issue = a.issues.find((i) => i.id === q.issueId)!;
      const next = {
        ...state,
        questionStates: { ...state.questionStates, [q.id]: { ...state.questionStates[q.id], status: "information_requested" as const } },
      };
      return withAudit(ensureTask(next, q.issueId, `Provide information: ${issue.riskLabel.toLowerCase()}`, q.affectedLabel, q.assignedTeam), [
        { type: "task_updated", title: "Evidence request sent", actor, affected: [q.affectedLabel], note: q.question },
      ]);
    }

    case "update_task": {
      const t = state.tasks.find((x) => x.id === action.taskId);
      if (!t) return state;
      const next = { ...state, tasks: state.tasks.map((x) => (x.id === t.id ? { ...x, ...action.patch } : x)) };
      const changes: string[] = [];
      if (action.patch.status) changes.push(`status → ${action.patch.status.replace(/_/g, " ")}`);
      if (action.patch.ownerId) changes.push(`owner → ${personaName(action.patch.ownerId)}`);
      if (action.patch.due) changes.push(`due → ${action.patch.due}`);
      return withAudit(next, [{ type: "task_updated", title: `Task updated — ${t.title}`, actor, affected: [t.affectedLabel], note: changes.join("; ") }]);
    }

    case "review_component": {
      const a = analyze(state);
      const det = a.determinations[action.componentId];
      const comp = seedDataset.components.find((c) => c.id === action.componentId)!;
      const stage = state.reviewStages[action.componentId] ?? "automated";
      const nextStage: ReviewStage =
        action.action === "approve" ? "reviewed" : action.action === "lock" ? "locked" : action.action === "note" ? stage : "needs_review";
      const persona = seedDataset.people.find((p) => p.id === state.personaId)!;
      const entry: ReviewEntry = {
        id: `RV-S${state.seq}`,
        componentId: action.componentId,
        at: timestamp(state),
        actor,
        actorRole: persona.role,
        action: action.action,
        note: action.note,
        automatedStatus: det.status,
        automatedHeadline: det.headline,
      };
      let next: WorkspaceState = {
        ...state,
        reviews: [...state.reviews, entry],
        reviewStages: { ...state.reviewStages, [action.componentId]: nextStage },
      };
      if (action.action === "request_info") {
        next = ensureTask(next, `REVIEW-${comp.id}`, `Respond to reviewer request — ${comp.shortName}`, `${comp.shortName} determination`, "Tax");
      }
      const label: Record<ReviewAction, string> = {
        approve: "Determination approved",
        reject: "Determination rejected",
        request_info: "Additional information requested",
        note: "Reviewer note added",
        lock: "Determination locked",
        escalate: "Escalated for professional review",
      };
      return withAudit(next, [
        {
          type: "reviewer_decision",
          title: `${label[action.action]} — ${comp.shortName}`,
          actor,
          affected: [comp.shortName, `TY${state.taxYear} determination`],
          change: stage !== nextStage ? { field: "Review stage", from: STAGE_LABEL[stage], to: STAGE_LABEL[nextStage] } : undefined,
          note: `${action.note ? `${action.note} ` : ""}Automated result retained: ${det.headline}.`,
        },
      ]);
    }

    case "add_upload":
      return { ...state, uploads: [...state.uploads, action.upload] };

    case "update_upload": {
      const prev = state.uploads.find((u) => u.id === action.id);
      if (!prev) return state;
      const next = { ...state, uploads: state.uploads.map((u) => (u.id === action.id ? { ...u, ...action.patch } : u)) };
      if (prev.status === "uploading" && action.patch.status && action.patch.status !== "uploading") {
        return withAudit(next, [
          { type: "document_uploaded", title: "Document uploaded", actor: prev.uploadedBy, triggeredBy: prev.fileName, affected: ["Document repository"], note: `${prev.sizeKb.toLocaleString("en-US")} KB · pending compliance analysis (mock)` },
        ]);
      }
      if (action.patch.category && action.patch.category !== prev.category) {
        return withAudit(next, [
          { type: "value_changed", title: "Document category corrected", actor, triggeredBy: prev.fileName, affected: ["Document repository"], change: { field: "Category", from: prev.category, to: action.patch.category } },
        ]);
      }
      return next;
    }

    case "link_upload": {
      const up = state.uploads.find((u) => u.id === action.id);
      if (!up) return state;
      const pendingEvidence = { ...state.pendingEvidence };
      if (up.linkedIssueId) pendingEvidence[up.linkedIssueId] = (pendingEvidence[up.linkedIssueId] ?? []).filter((x) => x !== up.id);
      if (action.issueId) pendingEvidence[action.issueId] = [...(pendingEvidence[action.issueId] ?? []), up.id];
      const tasks = state.tasks.map((t) =>
        action.issueId && t.issueId === action.issueId && t.status !== "complete"
          ? { ...t, evidenceReceived: Math.min(t.evidenceRequired, t.evidenceReceived + 1), status: "needs_review" as const }
          : t,
      );
      const next = { ...state, pendingEvidence, tasks, uploads: state.uploads.map((u) => (u.id === up.id ? { ...u, linkedIssueId: action.issueId } : u)) };
      if (!action.issueId) return next;
      return withAudit(next, [
        {
          type: "record_matched",
          title: "Document linked to evidence request",
          actor,
          triggeredBy: up.fileName,
          affected: [action.issueId],
          note: "Evidence requirement moved to Pending review. Credit is not substantiated until a reviewer accepts the evidence.",
        },
      ]);
    }
  }
}

export const STAGE_LABEL: Record<ReviewStage, string> = {
  automated: "Automated assessment",
  needs_review: "Needs professional review",
  reviewed: "Reviewed",
  locked: "Locked",
};

const TEAM_DEFAULT_OWNER: Record<Person["team"], ID> = {
  Procurement: "P-SC",
  Tax: "P-AP",
  Finance: "P-DK",
  Operations: "P-LO",
  Engineering: "P-JW",
  Legal: "P-EM",
  "External advisor": "P-RH",
};

function ensureTask(state: WorkspaceState, issueId: ID, title: string, affectedLabel: string, team: Person["team"]): WorkspaceState {
  if (state.tasks.some((t) => t.issueId === issueId && t.status !== "complete")) return state;
  const due = new Date(Date.parse(`${seedDataset.asOf}T00:00:00Z`) + 10 * 86_400_000).toISOString().slice(0, 10);
  const task: Task = {
    id: `T-S${state.seq}`,
    title,
    issueId,
    affectedLabel,
    ownerId: TEAM_DEFAULT_OWNER[team],
    due,
    evidenceReceived: 0,
    evidenceRequired: 1,
    status: "awaiting_upload",
    createdFrom: issueId.startsWith("REVIEW-") ? "reviewer" : "question",
  };
  return { ...state, tasks: [...state.tasks, task] };
}

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

interface WorkspaceValue {
  state: WorkspaceState;
  dataset: ManufacturerDataset;
  analysis: WorkspaceAnalysis;
  persona: Person;
  dispatch: (a: Action) => void;
  person: (id?: ID) => Person | undefined;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dataset = useMemo(() => deriveDataset(state), [state]);
  const analysis = useMemo(() => rulesEngine.analyze(dataset, contextFor(state)), [dataset, state]);
  const person = useCallback((id?: ID) => seedDataset.people.find((p) => p.id === id), []);
  const value = useMemo(
    () => ({ state, dataset, analysis, dispatch, person, persona: person(state.personaId)! }),
    [state, dataset, analysis, person],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const v = useContext(WorkspaceContext);
  if (!v) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return v;
}
