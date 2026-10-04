"use client";

import { useState } from "react";
import { Bot, Check, Lock, MessageSquare, RotateCcw, Send, UserCheck } from "lucide-react";
import type { ID } from "@/lib/domain/types";
import type { ReviewAction, ReviewStage } from "@/lib/compliance/types";
import { useWorkspace, STAGE_LABEL } from "@/lib/state/workspace";
import { fmtDateTime } from "@/lib/format";
import { Avatar, Button, Card, CardHeader, Pill, cx } from "@/components/ui/primitives";
import { ELIGIBILITY } from "@/components/ui/status";

const STAGES: ReviewStage[] = ["automated", "needs_review", "reviewed", "locked"];

export function ReviewStepper({ stage }: { stage: ReviewStage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
      {STAGES.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span
            className={cx(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
              i < idx && "border-ok-line bg-ok-bg text-ok",
              i === idx && "border-ink bg-ink text-white",
              i > idx && "border-line text-ink-4",
            )}
          >
            {i < idx && <Check className="h-3 w-3" strokeWidth={3} />}
            {STAGE_LABEL[s]}
          </span>
          {i < STAGES.length - 1 && <span className="text-ink-4">→</span>}
        </li>
      ))}
    </ol>
  );
}

const ACTION_META: Record<ReviewAction, { label: string; icon: typeof Check; tone: "ok" | "bad" | "warn" | "info" | "mute" }> = {
  approve: { label: "Approved", icon: Check, tone: "ok" },
  reject: { label: "Rejected", icon: RotateCcw, tone: "bad" },
  request_info: { label: "Requested information", icon: Send, tone: "warn" },
  note: { label: "Note", icon: MessageSquare, tone: "mute" },
  lock: { label: "Locked", icon: Lock, tone: "info" },
  escalate: { label: "Escalated", icon: UserCheck, tone: "warn" },
};

export function ReviewPanel({ componentId }: { componentId: ID }) {
  const { state, analysis, dispatch, persona } = useWorkspace();
  const [note, setNote] = useState("");
  const stage = state.reviewStages[componentId] ?? "automated";
  const det = analysis.determinations[componentId];
  const history = state.reviews.filter((r) => r.componentId === componentId).sort((a, b) => a.at.localeCompare(b.at));
  const locked = stage === "locked";

  const act = (action: ReviewAction) => {
    dispatch({ type: "review_component", componentId, action, note: note.trim() });
    setNote("");
  };

  return (
    <Card>
      <CardHeader title="Professional review" subtitle="Human decisions are recorded alongside — never over — the automated result." />
      <div className="space-y-4 px-4 py-3">
        <ReviewStepper stage={stage} />

        <div className="relative space-y-3 border-l border-line pl-4">
          <div className="relative">
            <span className="absolute top-0.5 -left-[25px] flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line bg-surface">
              <Bot className="h-3 w-3 text-ink-3" />
            </span>
            <div className="text-[12px] font-medium">Automated assessment (current)</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <Pill tone={ELIGIBILITY[det.status].tone}>{det.headline}</Pill>
              <span className="font-mono text-[11px] text-ink-3">{det.ruleVersionId}</span>
            </div>
            <div className="mt-1 text-[11.5px] text-ink-3">Mock rules engine · recalculated on every data change</div>
          </div>
          {history.map((r) => {
            const m = ACTION_META[r.action];
            const Icon = m.icon;
            return (
              <div key={r.id} className="relative">
                <span className="absolute top-0.5 -left-[25px] flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line bg-surface">
                  <Icon className="h-3 w-3 text-ink-3" />
                </span>
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="font-medium">{r.actor}</span>
                  <Pill tone={m.tone}>{m.label}</Pill>
                  <span className="text-[11px] text-ink-3">{fmtDateTime(r.at)}</span>
                </div>
                <div className="text-[11px] text-ink-3">{r.actorRole}</div>
                {r.note && <div className="mt-1 rounded-md bg-subtle px-2.5 py-1.5 text-[12px] text-ink-2">{r.note}</div>}
                <div className="mt-1 text-[11px] text-ink-4">Automated result at time of decision: {r.automatedHeadline}</div>
              </div>
            );
          })}
        </div>

        <div className="rounded-md border border-line p-3">
          <div className="mb-2 flex items-center gap-2 text-[12px]">
            <Avatar initials={persona.initials} name={persona.name} size={20} />
            <span className="font-medium">{persona.name}</span>
            <span className="text-ink-3">· {persona.role}</span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={locked}
            placeholder={locked ? "Determination is locked." : "Reviewer note (recorded in the audit trail)…"}
            rows={3}
            className="w-full resize-none rounded-md border border-line-strong bg-surface px-2.5 py-2 text-[12.5px] outline-none focus:border-info disabled:bg-subtle"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="ok" disabled={locked || stage === "reviewed"} onClick={() => act("approve")}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="danger" disabled={locked} onClick={() => act("reject")}>
              <RotateCcw className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button size="sm" disabled={locked} onClick={() => act("request_info")}>
              <Send className="h-3.5 w-3.5" /> Request information
            </Button>
            <Button size="sm" variant="ghost" disabled={locked || !note.trim()} onClick={() => act("note")}>
              <MessageSquare className="h-3.5 w-3.5" /> Add note
            </Button>
            <Button size="sm" variant="primary" disabled={stage !== "reviewed"} onClick={() => act("lock")} title={stage !== "reviewed" ? "Only reviewed determinations can be locked" : undefined}>
              <Lock className="h-3.5 w-3.5" /> Lock
            </Button>
          </div>
          {analysis.issues.some((i) => i.componentIds.includes(componentId) && i.gatesCredit && state.resolutions[i.id]?.state !== "resolved") && !locked && (
            <div className="mt-2 text-[11.5px] text-warn">
              Open evidence issues remain. Approval records professional judgment on the automated result; it does not resolve evidence gaps or change the supported credit.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
