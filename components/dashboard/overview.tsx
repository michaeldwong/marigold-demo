"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { ID } from "@/lib/domain/types";
import { CATEGORY_RATES } from "@/lib/calculations/credit";
import { issueAction } from "@/lib/compliance/actions";
import { useWorkspace } from "@/lib/state/workspace";
import { useScopedAnalysis } from "@/lib/state/scope";
import { useInspector } from "@/components/provenance/inspector";
import { fmtDate, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { Avatar, Bar, Card, CardHeader, PageHeader, Pill, Tip, cx } from "@/components/ui/primitives";
import { EligibilityPill, STAGE } from "@/components/ui/status";

export function Overview() {
  const { dataset, state } = useWorkspace();
  const facility = dataset.facilities.find((f) => f.id === state.facilityId);
  return (
    <div>
      <PageHeader
        eyebrow={`${dataset.company.name} · ${facility ? facility.name : "All facilities"}`}
        title="Overview"
        subtitle="How much Section 45X credit the 2027 production appears to earn, how much of it the evidence supports today, and what to do about the rest."
      />
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="flex flex-col gap-4 xl:col-span-7">
          <CreditCard />
          <ClaimReadiness />
        </div>
        <div className="xl:col-span-5">
          <ActionQueue />
        </div>
      </div>
      <div className="mt-4">
        <ComponentBreakdown />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CreditCard() {
  const { dataset } = useWorkspace();
  const { credit } = useScopedAnalysis();
  const pct = credit.estimated ? credit.supported / credit.estimated : 0;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-6 px-5 pt-5 pb-5">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            Estimated {dataset.taxYear} 45X credit
            <Tip content="Units sold × kWh per unit × $/kWh rate, computed per sale and production lot. Includes credit that still needs evidence." />
          </div>
          <div className="mt-1.5 text-[44px] leading-none font-semibold tracking-[-0.02em] num">{fmtMoney(credit.estimated)}</div>
          <div className="mt-3 text-[12.5px] text-ink-3">
            {fmtNum(credit.byComponent.reduce((s, c) => s + c.unitsSold, 0))} units sold · {fmtNum(credit.byComponent.reduce((s, c) => s + c.kwh, 0) / 1000, 1)} MWh of eligible capacity
          </div>
        </div>
        <div className="grid min-w-[260px] flex-1 grid-cols-1 gap-2.5 sm:max-w-[360px]">
          <div className="flex items-baseline justify-between gap-6">
            <span className="flex items-center gap-2 text-[12.5px] text-ink-2">
              <span className="h-2 w-2 rounded-full bg-ok" /> Supported by evidence
            </span>
            <span className="text-[18px] font-semibold text-ok num">{fmtMoney(credit.supported)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-6">
            <span className="flex items-center gap-2 text-[12.5px] text-ink-2">
              <span className="h-2 w-2 rounded-full bg-warn" /> Needs substantiation
            </span>
            <span className="text-[18px] font-semibold text-warn num">{fmtMoney(credit.atRisk)}</span>
          </div>
          {credit.excluded > 0 && (
            <div className="flex items-baseline justify-between gap-6">
              <span className="flex items-center gap-2 text-[12.5px] text-ink-2">
                <span className="h-2 w-2 rounded-full bg-ink-4" /> Excluded after review
              </span>
              <span className="text-[14px] font-medium text-ink-3 num">{fmtMoney(credit.excluded)}</span>
            </div>
          )}
          <Bar
            height={10}
            segments={[
              { value: credit.supported, tone: "ok", label: "Supported" },
              { value: credit.atRisk, tone: "warn", label: "Needs substantiation" },
            ]}
          />
          <div className="text-[12px] text-ink-3 num">{fmtPct(pct, 0)} of estimated credit currently supported by evidence</div>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

/** Evidence sufficiency, eligibility status and review progress — kept as three separate measures. */
function ClaimReadiness() {
  const { analysis, state } = useWorkspace();
  const { evidence, componentIds } = useScopedAnalysis();
  const gaps = evidence.missing + evidence.expired + evidence.conflicting;
  const dets = componentIds.map((id) => analysis.determinations[id]).filter((d) => d.status !== "not_evaluated");
  const eligible = dets.filter((d) => d.status === "eligible").length;
  const stages = dets.map((d) => state.reviewStages[d.componentId] ?? "automated");
  const reviewed = stages.filter((s) => s === "reviewed" || s === "locked").length;
  const locked = stages.filter((s) => s === "locked").length;

  const rows: { href: string; label: string; value: string; detail: ReactNode; segments: { value: number; tone: "ok" | "warn" | "bad" | "info" }[] }[] = [
    {
      href: "/evidence?status=gaps",
      label: "Evidence coverage",
      value: fmtPct(evidence.pctComplete, 0),
      detail: <span className={gaps ? "text-bad" : "text-ok"}>{gaps} documents missing or invalid</span>,
      segments: [
        { value: evidence.supported + evidence.expiring, tone: "ok" },
        { value: evidence.pendingReview, tone: "info" },
        { value: gaps, tone: "bad" },
      ],
    },
    {
      href: "/eligibility",
      label: "Eligibility",
      value: `${eligible} of ${dets.length}`,
      detail: <span className={dets.length - eligible ? "text-warn" : "text-ok"}>{dets.length - eligible} components need attention</span>,
      segments: [
        { value: eligible, tone: "ok" },
        { value: dets.length - eligible, tone: "warn" },
      ],
    },
    {
      href: "/eligibility",
      label: "Professional review",
      value: `${reviewed} of ${dets.length}`,
      detail: <span className="text-ink-3">{locked} locked · {dets.length - reviewed} awaiting reviewer</span>,
      segments: [
        { value: reviewed, tone: "ok" },
        { value: dets.length - reviewed, tone: "info" },
      ],
    },
  ];

  return (
    <Card>
      <CardHeader title="Claim readiness" subtitle="Three separate measures: whether documents cover the claim, whether components qualify, and whether a professional has signed off." />
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <Link key={r.label} href={r.href} className="group grid grid-cols-[150px_70px_1fr_16px] items-center gap-4 px-5 py-3 hover:bg-subtle">
            <span className="text-[12.5px] font-medium">{r.label}</span>
            <span className="text-right text-[15px] font-semibold num">{r.value}</span>
            <span className="min-w-0">
              <Bar segments={r.segments} height={6} />
              <span className="mt-1 block truncate text-[11.5px]">{r.detail}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-ink-4 group-hover:text-ink-2" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function ActionQueue() {
  const { analysis, dataset, state, person } = useWorkspace();
  const { credit, questions } = useScopedAnalysis();
  const { open } = useInspector();
  const items = credit.atRiskByIssue.filter((x) => x.amount > 0.5);
  const otherOpen = questions.filter((q) => state.resolutions[q.issueId]?.state !== "resolved" && !items.some((x) => x.issueId === q.issueId)).length;

  return (
    <Card className="flex flex-col">
      <div className="border-b border-line px-5 pt-4 pb-3">
        <div className="eyebrow">Resolve these to unlock credit</div>
        <div className="mt-1 text-[17px] leading-snug font-semibold">
          <span className="text-warn num">{fmtMoney(credit.atRisk)}</span> needs substantiation
        </div>
        <div className="mt-0.5 text-[11.5px] text-ink-3">Ranked by credit each item would unlock.</div>
      </div>
      <div className="flex-1 divide-y divide-line">
        {items.length === 0 && <div className="px-5 py-8 text-center text-[12.5px] text-ink-3">All estimated credit is supported for this scope.</div>}
        {items.map((it, i) => {
          const issue = analysis.issues.find((x) => x.id === it.issueId)!;
          const task = state.tasks.find((t) => t.issueId === issue.id && t.status !== "complete");
          const owner = person(task?.ownerId);
          const answered = state.resolutions[issue.id]?.state === "answered";
          const overdue = task && task.due < dataset.asOf;
          return (
            <button key={it.issueId} onClick={() => open({ kind: "issue", id: it.issueId })} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-subtle">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mute-bg text-[10.5px] font-semibold text-ink-2 num">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium">{issueAction(issue, dataset)}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-ink-3" title={issue.riskLabel}>
                  {owner && (
                    <>
                      <Avatar initials={owner.initials} name={owner.name} size={14} />
                      <span>{owner.name}</span>
                    </>
                  )}
                  {task && (
                    <>
                      <span>·</span>
                      <span className={cx(overdue && "text-bad")}>due {fmtDate(task.due, { year: false })}</span>
                    </>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[14px] font-semibold text-warn num">{fmtMoney(it.amount)}</span>
                {answered && <Pill tone="info">Awaiting review</Pill>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-2.5">
        <span className="text-[11.5px] text-ink-3">{otherOpen ? `+${otherOpen} other open items with no ${dataset.taxYear} credit impact` : ""}</span>
        <Link href="/questions" className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-info hover:underline">
          All missing information <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function ComponentBreakdown() {
  const { analysis, dataset, state } = useWorkspace();
  const { componentIds, credit } = useScopedAnalysis();
  const { open } = useInspector();
  const router = useRouter();
  const rows = componentIds
    .map((id) => ({ id, cc: credit.byComponent.find((c) => c.componentId === id) }))
    .sort((a, b) => (b.cc?.estimated ?? -1) - (a.cc?.estimated ?? -1));

  const mainBlocker = (id: ID) => {
    const m = new Map<ID, number>();
    for (const l of credit.byComponent.find((c) => c.componentId === id)?.lines ?? []) for (const b of l.blockers) m.set(b.issueId, (m.get(b.issueId) ?? 0) + l.credit * b.share);
    const sorted = [...m].sort((a, b) => b[1] - a[1]);
    return sorted.length ? { issue: analysis.issues.find((i) => i.id === sorted[0][0])!, more: sorted.length - 1 } : null;
  };

  return (
    <Card>
      <CardHeader title="Where the credit comes from" subtitle="Each eligible component, what it earns, how much is supported, and what is holding back the rest. Click a row to trace it to source records." />
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Type</th>
              <th className="r">Units sold</th>
              <th className="r">Estimated</th>
              <th className="r">Supported</th>
              <th style={{ width: 120 }} />
              <th>Status</th>
              <th>Main blocker</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, cc }) => {
              const comp = dataset.components.find((c) => c.id === id)!;
              const det = analysis.determinations[id];
              const stage = state.reviewStages[id] ?? "automated";
              const blocker = mainBlocker(id);
              return (
                <tr key={id} className="clickable" onClick={() => router.push(`/components/${id}`)}>
                  <td className="min-w-[170px]">
                    <div className="font-medium">{comp.name}</div>
                    <div className="text-[11px] text-ink-3">{dataset.facilities.find((f) => f.id === comp.facilityId)?.shortName}</div>
                  </td>
                  <td className="whitespace-nowrap text-ink-2">{CATEGORY_RATES[comp.category].label}</td>
                  <td className="r num">{cc ? fmtNum(cc.unitsSold) : "—"}</td>
                  <td className="r num font-medium">{cc ? fmtMoney(cc.estimated) : "—"}</td>
                  <td className="r num text-ok">{cc ? fmtMoney(cc.supported) : "—"}</td>
                  <td>{cc && cc.estimated > 0 ? <Bar segments={[{ value: cc.supported, tone: "ok" }, { value: cc.atRisk, tone: "warn" }]} height={6} /> : null}</td>
                  <td className="whitespace-nowrap">
                    <EligibilityPill status={det.status} />
                    {det.status !== "not_evaluated" && <div className="mt-1 text-[11px] text-ink-3">{STAGE[stage].label}</div>}
                  </td>
                  <td>
                    {blocker ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          open({ kind: "issue", id: blocker.issue.id });
                        }}
                        className="text-left text-[12px] font-medium text-warn hover:underline"
                      >
                        {blocker.issue.riskLabel}
                        {blocker.more > 0 && <span className="font-normal text-ink-3"> +{blocker.more} more</span>}
                      </button>
                    ) : (
                      <span className="text-[12px] text-ink-3">{det.status === "not_evaluated" ? "Cost data not ingested" : "None"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
