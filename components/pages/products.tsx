"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";
import { analysis, money } from "@/lib/analysis";
import type { Product } from "@/lib/analysis";
import { Sources } from "@/components/sources/sources-drawer";
import { IssueLinks, fmtDay, productLabel } from "@/components/pages/shared";
import { Card, PageTitle, StatusMark, cx } from "@/components/ui/primitives";

export function ProductsPage() {
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) setOpen(id);
  }, []);
  return (
    <div>
      <PageTitle title="Products" subtitle="The battery cells Volterra makes, what goes into them, and how much each contributes." />
      <div className="space-y-5">
        {analysis.products.map((p) => (
          <ProductCard key={p.id} p={p} expanded={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ p, expanded, onToggle }: { p: Product; expanded: boolean; onToggle: () => void }) {
  const facts: [string, string][] = [
    ["Chemistry", p.chemistry],
    ["Form factor", p.form_factor.charAt(0).toUpperCase() + p.form_factor.slice(1)],
    ["Revisions", p.revisions.map((r) => r.rev).join(", ")],
    ["Made at", p.facility],
    [`Produced in ${analysis.tax_year}`, `${p.production.cells.toLocaleString("en-US")} cells`],
    [`Sold in ${analysis.tax_year}`, `${p.sales.cells.toLocaleString("en-US")} cells`],
  ];
  return (
    <Card id={p.id} className="overflow-hidden">
      <div className="p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <StatusMark status={p.status === "supported" ? "satisfied" : "review"} size={26} />
            <div>
              <h2 className="text-[18px] font-semibold">{p.id}</h2>
              <div className="text-[13.5px] text-ink-3">{productLabel(p)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-ink-3">Estimated credit</div>
            <div className="text-[24px] leading-tight font-semibold num">{money(p.credit.amount)}</div>
            {p.credit.upper > p.credit.amount && <div className="text-[12.5px] text-ink-3 num">up to {money(p.credit.upper)}</div>}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[12px] text-ink-3">{k}</dt>
              <dd className="mt-0.5 text-[14px]">{v}</dd>
            </div>
          ))}
        </dl>

        {p.specs.length > 0 && (
          <div className="mt-6 rounded-lg border border-line">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Tested specifications</span>
              <Sources title={`${p.id} specifications`} evidence={p.specs.flatMap((s) => s.evidence_refs)} rules={["R-CELL-DEF", "R-CAPACITY-MEASURE"]} />
            </div>
            <dl className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
              {p.specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 px-4 py-2.5 sm:border-b sm:border-line">
                  <dt className="text-[13px] text-ink-3">{s.label}</dt>
                  <dd className="text-right text-[13.5px] num">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {p.issue_refs.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Open items</div>
            <IssueLinks ids={p.issue_refs} />
          </div>
        )}
      </div>

      <button onClick={onToggle} className="flex w-full items-center gap-2 border-t border-line bg-subtle px-7 py-3.5 text-left text-[13.5px] font-medium hover:bg-mute-bg">
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Materials and suppliers
      </button>
      {expanded && (
        <div className="space-y-6 border-t border-line px-7 py-6">
          {p.revision_changes.map((c) => (
            <div key={c} className="flex items-start gap-2 rounded-lg bg-info-bg px-4 py-3 text-[13.5px] text-ink-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              {c}
            </div>
          ))}
          {p.revisions.map((r) => (
            <div key={r.rev}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-[14px] font-semibold">
                  Revision {r.rev}{" "}
                  <span className="font-normal text-ink-3">
                    · {fmtDay(r.from)} {r.to ? `to ${fmtDay(r.to)}` : "onward"}
                  </span>
                </div>
                <Sources title={`${p.id} revision ${r.rev} bill of materials`} evidence={[...r.evidence_refs, ...r.materials.flatMap((m) => m.evidence_refs)]} />
              </div>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Supplier</th>
                      <th>Made in</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.materials.map((m) => (
                      <tr key={m.erp_material}>
                        <td>
                          <div>{m.material}</div>
                          <div className="text-[11.5px] text-ink-3">{m.quantity}</div>
                        </td>
                        <td>{m.supplier}</td>
                        <td>{m.made_in}</td>
                        <td>
                          <span className={cx("text-[12.5px] font-medium", m.evidence_status === "supported" ? "text-ok" : "text-warn")}>
                            {m.evidence_status === "supported" ? "Supplier documents on file" : "Needs attention"}
                          </span>
                          {m.issue_refs.length > 0 && (
                            <div className="mt-1">
                              <IssueLinks ids={m.issue_refs} />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
