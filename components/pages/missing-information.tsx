"use client";

import { SEVERITY_ORDER, analysis, money } from "@/lib/analysis";
import { Sources } from "@/components/sources/sources-drawer";
import { Card, PageTitle, SectionTitle, SeverityTag } from "@/components/ui/primitives";

const TYPE_ORDER = ["PRODUCT / TECHNICAL", "SUPPLY CHAIN / SUPPLIER", "PRODUCTION / RECONCILIATION", "SALES / TRANSACTIONS", "CORPORATE / CLAIMANT", "OTHER"];
const TYPE_TITLE: Record<string, string> = {
  "PRODUCT / TECHNICAL": "Product / technical",
  "SUPPLY CHAIN / SUPPLIER": "Supply chain / supplier",
  "PRODUCTION / RECONCILIATION": "Production / reconciliation",
  "SALES / TRANSACTIONS": "Sales / transactions",
  "CORPORATE / CLAIMANT": "Corporate / claimant",
  OTHER: "Other",
};

export function MissingInformationPage() {
  const { issues, issue_counts } = analysis;
  const types = TYPE_ORDER.filter((t) => issues.some((i) => i.type === t));
  return (
    <div>
      <PageTitle title="Missing information" subtitle="What is standing between Volterra and a fully supported claim, and what to do about each item." />

      <Card className="mb-10 flex flex-wrap items-center gap-x-10 gap-y-3 p-6">
        <div className="text-[22px] font-semibold">{issues.length} items need attention</div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {SEVERITY_ORDER.filter((s) => issue_counts[s]).map((s) => (
            <span key={s} className="inline-flex items-center gap-2 text-[14px]">
              <SeverityTag severity={s} /> <span className="font-semibold num">{issue_counts[s]}</span>
            </span>
          ))}
        </div>
      </Card>

      <div className="space-y-10">
        {types.map((t) => (
          <section key={t}>
            <SectionTitle>{TYPE_TITLE[t]}</SectionTitle>
            <div className="space-y-4">
              {issues
                .filter((i) => i.type === t)
                .map((i) => (
                  <Card key={i.id} id={i.id} className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <SeverityTag severity={i.severity} />
                        <h3 className="text-[16px] leading-snug font-semibold">{i.title}</h3>
                      </div>
                      {i.credit_affected > 0 && <div className="text-[13px] text-ink-3 num">Affects up to {money(i.credit_affected)} of credit</div>}
                    </div>
                    <p className="mt-2 text-[14px] text-ink-2">{i.description}</p>
                    <dl className="mt-4 grid grid-cols-1 gap-4 text-[13.5px] sm:grid-cols-2">
                      <div>
                        <dt className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Why it matters</dt>
                        <dd className="mt-1 text-ink-2">{i.why}</dd>
                      </div>
                      <div>
                        <dt className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Next step</dt>
                        <dd className="mt-1 text-ink">{i.next_action}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                      <div className="text-[12.5px] text-ink-3">
                        Affects: {i.affected.slice(0, 4).join(", ")}
                        {i.affected.length > 4 ? ` and ${i.affected.length - 4} more` : ""}
                      </div>
                      <Sources title={i.title} evidence={i.evidence_refs} rules={i.rule_refs} />
                    </div>
                  </Card>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
