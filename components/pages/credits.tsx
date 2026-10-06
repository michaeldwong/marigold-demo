"use client";

import { TriangleAlert } from "lucide-react";
import { analysis, dollars, money } from "@/lib/analysis";
import { Sources } from "@/components/sources/sources-drawer";
import { productLabel } from "@/components/pages/shared";
import { Card, PageTitle, SectionTitle } from "@/components/ui/primitives";

export function CreditsPage() {
  const { credit_summary: cs, credit_calculations: calcs } = analysis;
  return (
    <div>
      <PageTitle title="Credits" subtitle="How much credit Marigold estimates, and exactly how each number was calculated." />

      <Card className="mb-8 p-7">
        <div className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Estimated {analysis.tax_year} Section 45X credit</div>
        <div className="mt-3 text-[48px] leading-none font-semibold tracking-[-0.02em] num">{money(cs.estimate)}</div>
        <p className="mt-3 max-w-2xl text-[14px] text-ink-2">
          {dollars(cs.estimate)}, or up to {dollars(cs.upper)} if the higher capacity rating is confirmed. Calculated as cells sold to customers in{" "}
          {analysis.tax_year} × each cell&apos;s tested capacity in kilowatt-hours × $35 per kilowatt-hour.
        </p>
      </Card>

      <div className="space-y-6">
        {calcs.map((c) => {
          const p = analysis.products.find((x) => x.id === c.product)!;
          return (
            <Card key={c.product} id={`credit-${c.product}`} className="p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[18px] font-semibold">{c.product}</h2>
                  <div className="text-[13.5px] text-ink-3">{productLabel(p)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-ink-3">Estimated credit</div>
                  <div className="text-[28px] leading-tight font-semibold num">{money(c.amount)}</div>
                  {c.upper > c.amount && <div className="text-[12.5px] text-ink-3 num">up to {money(c.upper)}</div>}
                </div>
              </div>
              <p className="mt-3 max-w-2xl text-[14px] text-ink-2">{c.plain}</p>

              <ol className="mt-5 divide-y divide-line rounded-lg border border-line">
                {c.steps.map((s, i) => (
                  <li key={s.label} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                    <span className="w-5 text-[12px] text-ink-4 num">{i + 1}</span>
                    <span className="min-w-[220px] flex-1 text-[13.5px] text-ink-2">{s.label}</span>
                    <span className="text-[14px] font-medium num">{s.value}</span>
                    <Sources title={`${c.product}: ${s.label}`} evidence={s.evidence_refs} rules={s.tax_rule_refs} className="w-[72px] justify-end" />
                  </li>
                ))}
                <li className="flex flex-wrap items-center gap-x-4 px-4 py-3.5">
                  <span className="w-5" />
                  <span className="min-w-[220px] flex-1 text-[13.5px] font-semibold">Estimated credit</span>
                  <span className="text-[14px] font-semibold num">{c.formula}</span>
                  <span className="w-[72px]" />
                </li>
              </ol>

              {c.note && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-warn-bg px-4 py-3 text-[13.5px] text-ink-2">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                  <span>{c.note}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {cs.excluded_sales.length > 0 && (
        <div className="mt-10">
          <SectionTitle>Not counted</SectionTitle>
          <Card className="divide-y divide-line">
            {cs.excluded_sales.map((x) => (
              <div key={x.label} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                <span className="min-w-[200px] flex-1 text-[13.5px]">{x.label}</span>
                <span className="text-[13.5px] text-ink-3">{x.reason}</span>
                <span className="w-[90px] text-right text-[13.5px] num">{x.cells.toLocaleString("en-US")} cells</span>
                <Sources title={x.label} evidence={x.evidence_refs} />
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
