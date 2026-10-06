"use client";

import { analysis } from "@/lib/analysis";
import { Sources } from "@/components/sources/sources-drawer";
import { IssueLinks } from "@/components/pages/shared";
import { Card, PageTitle, StatusMark, cx } from "@/components/ui/primitives";

const STATUS_TEXT = { satisfied: "Satisfied", review: "Needs information or review", not_satisfied: "Not satisfied" } as const;

export function EligibilityPage() {
  const { eligibility } = analysis;
  const mark = eligibility.status === "eligible" ? "satisfied" : eligibility.status === "review" ? "review" : "not_satisfied";

  return (
    <div>
      <PageTitle title="Eligibility" subtitle="Why Marigold thinks Volterra does or does not qualify, requirement by requirement." />

      <Card className={cx("mb-8 p-7", mark === "review" && "border-warn-line bg-warn-bg/40", mark === "satisfied" && "border-ok-line bg-ok-bg/40")}>
        <div className="flex items-start gap-4">
          <StatusMark status={mark} size={44} />
          <div>
            <div className="text-[20px] leading-snug font-semibold">{eligibility.headline}</div>
            <p className="mt-1.5 text-[14px] text-ink-2">{eligibility.summary}</p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {eligibility.requirements.map((r) => (
          <Card key={r.id} id={r.id} className="p-6">
            <div className="flex items-start gap-4">
              <StatusMark status={r.status} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-[16px] font-semibold">{r.title}</h3>
                  <span className={cx("text-[12.5px] font-medium", { satisfied: "text-ok", review: "text-warn", not_satisfied: "text-bad" }[r.status])}>
                    {STATUS_TEXT[r.status]}
                  </span>
                </div>
                <p className="mt-1 text-[13.5px] text-ink-3">{r.explanation}</p>
                <div className="mt-3 rounded-lg bg-subtle px-4 py-3">
                  <div className="text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">Volterra</div>
                  <p className="mt-0.5 text-[14px] text-ink">{r.fact}</p>
                </div>
                {r.next_action && (
                  <div className="mt-3 text-[13.5px]">
                    <span className="font-semibold">Next step: </span>
                    {r.next_action}
                  </div>
                )}
                {r.issue_refs.length > 0 && (
                  <div className="mt-3">
                    <IssueLinks ids={r.issue_refs} />
                  </div>
                )}
                <div className="mt-3">
                  <Sources title={r.title} evidence={r.evidence_refs} rules={r.tax_rule_refs} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
