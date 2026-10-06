"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SEVERITY_ORDER, analysis, money } from "@/lib/analysis";
import { productLabel } from "@/components/pages/shared";
import { Card, PageTitle, SeverityTag, StatusMark, TextLink } from "@/components/ui/primitives";

export function OverviewPage() {
  const { eligibility, credit_summary: cs, issues, issue_counts } = analysis;
  const markStatus = eligibility.status === "eligible" ? "satisfied" : eligibility.status === "review" ? "review" : "not_satisfied";
  const lfp = cs.by_product.find((b) => b.upper > b.amount);

  return (
    <div>
      <PageTitle
        title="Overview"
        subtitle="Section 45X is a federal tax credit for clean-energy components made in the U.S. For battery cells it pays $35 for every kilowatt-hour of capacity sold."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="p-6">
          <div className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Does Volterra qualify?</div>
          <div className="mt-4 flex items-start gap-3">
            <StatusMark status={markStatus} size={34} />
            <div>
              <div className="text-[17px] leading-snug font-semibold">{eligibility.headline}</div>
              <p className="mt-1.5 text-[13.5px] text-ink-3">{eligibility.summary}</p>
            </div>
          </div>
          <div className="mt-5">
            <TextLink href="/eligibility">See the requirements</TextLink>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Estimated {analysis.tax_year} 45X credit</div>
          <div className="mt-3 text-[44px] leading-none font-semibold tracking-[-0.02em] num">{money(cs.estimate)}</div>
          {lfp && (
            <p className="mt-3 text-[13.5px] text-ink-3">
              Up to {money(cs.upper)} if {lfp.product}&apos;s higher capacity rating is confirmed.
            </p>
          )}
          <div className="mt-5">
            <TextLink href="/credits">See how it was calculated</TextLink>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Where the credit comes from</div>
          <div className="mt-4 divide-y divide-line">
            {cs.by_product.map((b) => {
              const p = analysis.products.find((x) => x.id === b.product)!;
              return (
                <Link key={b.product} href={`/products#${b.product}`} className="group flex items-center justify-between gap-4 py-3.5">
                  <div>
                    <div className="text-[15px] font-semibold group-hover:underline">{b.product}</div>
                    <div className="text-[13px] text-ink-3">{productLabel(p)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] font-semibold num">{money(b.amount)}</div>
                    <div className="text-[12px] text-ink-3 num">{Math.round((b.amount / cs.estimate) * 100)}% of total</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">What is missing?</div>
          <div className="mt-3 text-[22px] font-semibold">{issues.length} items need attention</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-3">
            {SEVERITY_ORDER.filter((s) => issue_counts[s]).map((s) => (
              <span key={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}: <span className="font-semibold text-ink num">{issue_counts[s]}</span>
              </span>
            ))}
          </div>
          <ul className="mt-4 space-y-2.5">
            {issues.slice(0, 3).map((i) => (
              <li key={i.id}>
                <Link href={`/missing-information#${i.id}`} className="group flex items-start gap-2.5">
                  <SeverityTag severity={i.severity} />
                  <span className="text-[13.5px] leading-snug group-hover:underline">{i.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/missing-information" className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-info hover:underline">
            View missing information <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
