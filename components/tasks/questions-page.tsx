"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, MessageSquareReply, RotateCcw, Send } from "lucide-react";
import type { ID } from "@/lib/domain/types";
import type { Question, QuestionStatus, Task, TaskStatus, Team } from "@/lib/compliance/types";
import { issueAction } from "@/lib/compliance/actions";
import { useWorkspace } from "@/lib/state/workspace";
import { useScopedAnalysis } from "@/lib/state/scope";
import { useInspector } from "@/components/provenance/inspector";
import { fmtDate, fmtMoney } from "@/lib/format";
import { Avatar, Button, Card, CardHeader, Empty, FilterChip, PageHeader, Pill, PrototypeNote, Select, cx } from "@/components/ui/primitives";
import { TASK_STATUS } from "@/components/ui/status";

type View = "open" | "review" | "resolved" | "all";

const Q_STATUS: Record<QuestionStatus, { label: string; tone: "mute" | "info" | "warn" | "ok" }> = {
  open: { label: "Open", tone: "mute" },
  information_requested: { label: "Requested", tone: "info" },
  answered: { label: "Awaiting review", tone: "warn" },
  resolved: { label: "Resolved", tone: "ok" },
};

type WS = ReturnType<typeof useWorkspace>;

function statusOf(q: Question, state: WS["state"]): QuestionStatus {
  if (state.resolutions[q.issueId]?.state === "resolved") return "resolved";
  return state.questionStates[q.id]?.status ?? "open";
}

function inView(s: QuestionStatus, v: View) {
  if (v === "all") return true;
  if (v === "open") return s === "open" || s === "information_requested";
  if (v === "review") return s === "answered";
  return s === "resolved";
}

export function QuestionsPage() {
  const { questions } = useScopedAnalysis();
  const { state } = useWorkspace();
  const [view, setView] = useState<View>("open");
  const [team, setTeam] = useState<Team | "all">("all");
  const [expanded, setExpanded] = useState<ID | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    setView("all");
    setExpanded(hash);
    setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }, []);

  const statuses = questions.map((q) => statusOf(q, state));
  const count = (v: View) => statuses.filter((s) => inView(s, v)).length;
  const openCredit = questions.filter((_, i) => inView(statuses[i], "open") || statuses[i] === "answered").reduce((s, q) => s + q.creditAffected, 0);
  const teams = [...new Set(questions.map((q) => q.assignedTeam))];
  // The expanded item stays visible after its status changes (e.g. answered → awaiting review).
  const shown = questions.filter((q, i) => (inView(statuses[i], view) || q.id === expanded) && (team === "all" || q.assignedTeam === team));

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Missing information"
        subtitle="Every fact or document the claim still needs, generated from what the system has and what it is missing. Answers are recorded as reported facts and change the supported credit only after professional review."
      />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="px-4 py-3">
          <div className="eyebrow">Open items</div>
          <div className="mt-1 text-[22px] font-semibold num">{count("open")}</div>
          <div className="text-[11.5px] text-ink-3">assigned across {teams.length} teams</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="eyebrow">Credit affected</div>
          <div className="mt-1 text-[22px] font-semibold text-warn num">{fmtMoney(openCredit)}</div>
          <div className="text-[11.5px] text-ink-3">unlocked when these items are resolved</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="eyebrow">Awaiting professional review</div>
          <div className="mt-1 text-[22px] font-semibold num">{count("review")}</div>
          <div className="text-[11.5px] text-ink-3">answered, not yet accepted</div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2.5">
          <FilterChip active={view === "open"} onClick={() => setView("open")} count={count("open")}>
            Open
          </FilterChip>
          <FilterChip active={view === "review"} onClick={() => setView("review")} count={count("review")}>
            Awaiting review
          </FilterChip>
          <FilterChip active={view === "resolved"} onClick={() => setView("resolved")} count={count("resolved")}>
            Resolved
          </FilterChip>
          <FilterChip active={view === "all"} onClick={() => setView("all")} count={questions.length}>
            All
          </FilterChip>
          <div className="ml-auto">
            <Select<Team | "all"> label="Team" value={team} onChange={setTeam} options={[{ value: "all", label: "All teams" }, ...teams.map((t) => ({ value: t, label: t }))]} />
          </div>
        </div>
        {shown.length === 0 ? (
          <Empty title="Nothing here">No items match these filters.</Empty>
        ) : (
          <div className="divide-y divide-line">
            {shown.map((q) => (
              <ItemRow key={q.id} q={q} expanded={expanded === q.id} onToggle={() => setExpanded(expanded === q.id ? null : q.id)} />
            ))}
          </div>
        )}
      </Card>

      <OtherTasks />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ItemRow({ q, expanded, onToggle }: { q: Question; expanded: boolean; onToggle: () => void }) {
  const { state, dataset, analysis, person } = useWorkspace();
  const status = statusOf(q, state);
  const issue = analysis.issues.find((i) => i.id === q.issueId)!;
  const task = state.tasks.find((t) => t.issueId === q.issueId && t.status !== "complete") ?? state.tasks.find((t) => t.issueId === q.issueId);
  const owner = person(task?.ownerId);
  const overdue = task && task.status !== "complete" && task.due < dataset.asOf;

  return (
    <div id={q.id} className={cx("scroll-mt-24", status === "resolved" && "opacity-70")}>
      <button onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-subtle">
        {expanded ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />}
        <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", q.priority === "high" ? "bg-bad" : q.priority === "medium" ? "bg-warn" : "bg-ink-4")} title={`${q.priority} priority`} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium">{issueAction(issue, dataset)}</span>
          <span className="block truncate text-[12px] text-ink-3">{q.question}</span>
        </span>
        <span className="hidden w-[150px] shrink-0 items-center gap-1.5 text-[12px] text-ink-2 md:flex">
          {owner ? (
            <>
              <Avatar initials={owner.initials} name={owner.name} size={18} />
              <span className="truncate">{owner.name}</span>
            </>
          ) : (
            <span className="text-ink-4">{q.assignedTeam}</span>
          )}
        </span>
        <span className={cx("hidden w-[64px] shrink-0 text-[12px] num sm:block", overdue ? "text-bad" : "text-ink-3")}>{task ? fmtDate(task.due, { year: false }) : "—"}</span>
        <span className="w-[72px] shrink-0 text-right text-[13px] font-semibold num">
          {q.creditAffected > 0 ? <span className="text-warn">{fmtMoney(q.creditAffected)}</span> : <span className="font-normal text-ink-4">—</span>}
        </span>
        <span className="w-[112px] shrink-0 text-right">
          <Pill tone={Q_STATUS[status].tone}>{Q_STATUS[status].label}</Pill>
        </span>
      </button>
      {expanded && <ItemDetail q={q} task={task} status={status} />}
    </div>
  );
}

function ItemDetail({ q, task, status }: { q: Question; task?: Task; status: QuestionStatus }) {
  const { state, dataset, dispatch, persona } = useWorkspace();
  const { open } = useInspector();
  const [answering, setAnswering] = useState(false);
  const [option, setOption] = useState("");
  const [text, setText] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const qs = state.questionStates[q.id];
  const res = state.resolutions[q.issueId];
  const opt = q.options.find((o) => o.id === option);

  return (
    <div className="border-t border-dashed border-line bg-subtle/60 px-4 pt-3 pb-4 pl-[52px]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="eyebrow mb-1">Why this matters</div>
          <p className="text-[12.5px] text-ink-2">{q.whyItMatters}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <div className="text-ink-3">Affects</div>
            <div className="flex flex-wrap gap-x-1.5">
              {q.componentIds.map((c) => (
                <Link key={c} href={`/components/${c}`} className="text-info hover:underline">
                  {dataset.components.find((x) => x.id === c)?.shortName}
                </Link>
              ))}
            </div>
            <div className="text-ink-2">{q.affectedLabel.split(" · ")[0]}</div>
          </div>
          <div>
            <div className="text-ink-3">Triggered by</div>
            <button onClick={() => open({ kind: "issue", id: q.issueId })} className="text-left text-info hover:underline">
              {q.trigger}
            </button>
          </div>
        </div>
      </div>

      {task && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-surface px-3 py-2 text-[12px]">
          <span className="font-medium">{task.title}</span>
          <TaskControls task={task} />
        </div>
      )}

      {qs?.answer && (
        <div className="mt-3 rounded-md border border-line bg-surface px-3 py-2 text-[12.5px]">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <MessageSquareReply className="h-3.5 w-3.5" /> Answer recorded by {qs.answeredBy}
            {res?.state === "resolved" && <> · accepted by {res.by}</>}
            {res?.state === "rejected" && <> · rejected by {res.by}</>}
          </div>
          <div className="mt-0.5">{qs.answer}</div>
          {res?.note && <div className="mt-1 text-[11.5px] text-ink-3">Reviewer note: {res.note}</div>}
        </div>
      )}

      {status !== "resolved" && (
        <div className="mt-3">
          {status === "answered" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-ink-3">Professional review as {persona.name}:</span>
              <input
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Review note (optional)"
                className="h-7 min-w-[200px] flex-1 rounded-md border border-line-strong bg-surface px-2 text-[12px] outline-none focus:border-info"
              />
              <Button size="sm" variant="ok" onClick={() => dispatch({ type: "review_answer", questionId: q.id, accept: true, note: reviewNote || undefined })}>
                <Check className="h-3.5 w-3.5" /> Accept & recalculate
              </Button>
              <Button size="sm" variant="danger" onClick={() => dispatch({ type: "review_answer", questionId: q.id, accept: false, note: reviewNote || undefined })}>
                <RotateCcw className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          ) : answering ? (
            <div className="space-y-2 rounded-md border border-line bg-surface p-3">
              <div className="text-[12.5px] font-medium">{q.question}</div>
              {q.options.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-start gap-2 text-[12.5px]">
                  <input type="radio" name={q.id} checked={option === o.id} onChange={() => setOption(o.id)} className="mt-0.5" />
                  <span>
                    {o.label}
                    <span className="ml-1.5 text-[11px] text-ink-3">
                      {o.outcome === "substantiated" ? "→ substantiates after review" : o.outcome === "not_substantiated" ? "→ credit excluded after review" : "→ sends an information request"}
                    </span>
                  </span>
                </label>
              ))}
              {opt?.requiresText && (
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={opt.textPlaceholder} className="h-8 w-full max-w-[460px] rounded-md border border-line-strong px-2.5 text-[12.5px] outline-none focus:border-info" />
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!opt || (opt.requiresText && !text.trim())}
                  onClick={() => {
                    dispatch({ type: "answer_question", questionId: q.id, optionId: option, text: opt?.requiresText ? text.trim() : undefined });
                    setAnswering(false);
                  }}
                >
                  Submit answer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAnswering(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => setAnswering(true)}>
                Answer
              </Button>
              <Button size="sm" disabled={status === "information_requested"} onClick={() => dispatch({ type: "request_information", questionId: q.id })}>
                <Send className="h-3.5 w-3.5" /> {status === "information_requested" ? "Information requested" : "Request information"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TaskControls({ task }: { task: Task }) {
  const { dataset, dispatch } = useWorkspace();
  const statuses = Object.keys(TASK_STATUS) as TaskStatus[];
  const overdue = task.status !== "complete" && task.due < dataset.asOf;
  return (
    <>
      <OwnerSelect value={task.ownerId} onChange={(ownerId) => dispatch({ type: "update_task", taskId: task.id, patch: { ownerId } })} />
      <input
        type="date"
        aria-label="Due date"
        value={task.due}
        onChange={(e) => e.target.value && dispatch({ type: "update_task", taskId: task.id, patch: { due: e.target.value } })}
        className={cx("h-7 rounded border border-transparent bg-transparent px-1 text-[12px] hover:border-line-strong num", overdue && "text-bad")}
      />
      <EvidenceProgress received={task.evidenceReceived} required={task.evidenceRequired} />
      <select
        aria-label="Task status"
        value={task.status}
        onChange={(e) => dispatch({ type: "update_task", taskId: task.id, patch: { status: e.target.value as TaskStatus } })}
        className={cx(
          "h-7 rounded-full border px-2 text-[11.5px] font-medium outline-none",
          { ok: "border-ok-line bg-ok-bg text-ok", warn: "border-warn-line bg-warn-bg text-warn", bad: "border-bad-line bg-bad-bg text-bad", mute: "border-mute-line bg-mute-bg text-mute", info: "border-info-line bg-info-bg text-info" }[TASK_STATUS[task.status].tone],
        )}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {TASK_STATUS[s].label}
          </option>
        ))}
      </select>
    </>
  );
}

/** Tasks that are not tied to a generated question (continuity items, reviewer requests, completed reviews). */
function OtherTasks() {
  const { state, analysis } = useWorkspace();
  const questionIssues = new Set(analysis.questions.map((q) => q.issueId));
  const tasks = state.tasks.filter((t) => !t.issueId || !questionIssues.has(t.issueId));
  if (!tasks.length) return null;
  return (
    <Card className="mt-4">
      <CardHeader title="Other tasks" subtitle="Housekeeping and continuity items with no current credit impact, plus requests raised by reviewers." />
      <div className="divide-y divide-line">
        {tasks.map((t) => (
          <div key={t.id} className={cx("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-[12px]", t.status === "complete" && "opacity-70")}>
            <div className="min-w-[220px] flex-1">
              <div className="text-[12.5px] font-medium">{t.title}</div>
              <div className="text-[11.5px] text-ink-3">{t.affectedLabel}</div>
            </div>
            <TaskControls task={t} />
          </div>
        ))}
      </div>
      <div className="border-t border-line px-4 py-2.5">
        <PrototypeNote>Evidence requests are not sent anywhere in this prototype. Completing a task does not substantiate credit by itself; the linked evidence must be reviewed and the item resolved.</PrototypeNote>
      </div>
    </Card>
  );
}

function OwnerSelect({ value, onChange }: { value?: ID; onChange: (id: ID) => void }) {
  const { dataset, person } = useWorkspace();
  const p = person(value);
  return (
    <span className="flex items-center gap-1.5">
      {p ? <Avatar initials={p.initials} name={p.name} size={20} /> : <span className="h-5 w-5 rounded-full border border-dashed border-line-strong" />}
      <select aria-label="Owner" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-7 max-w-[150px] rounded border border-transparent bg-transparent text-[12.5px] outline-none hover:border-line-strong">
        {!value && <option value="">Assign</option>}
        {dataset.people.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
    </span>
  );
}

function EvidenceProgress({ received, required }: { received: number; required: number }) {
  const pct = required ? received / required : 0;
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] num" title="Evidence received / required">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="9" r={r} fill="none" stroke="var(--color-line-strong)" strokeWidth="2" strokeDasharray={pct ? undefined : "2 2"} />
        {pct > 0 && <circle cx="9" cy="9" r={r} fill="none" stroke={pct >= 1 ? "var(--color-ok)" : "var(--color-info)"} strokeWidth="2" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 9 9)" />}
      </svg>
      {received} / {required} docs
    </span>
  );
}
