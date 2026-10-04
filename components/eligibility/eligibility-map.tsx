"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, Building2, Factory } from "lucide-react";
import type { EligibilityStatus } from "@/lib/compliance/types";
import { ACTIVE_RULE_VERSION } from "@/lib/compliance/rule-versions";
import { useWorkspace } from "@/lib/state/workspace";
import { useScopedAnalysis } from "@/lib/state/scope";
import { useInspector, SourceLink } from "@/components/provenance/inspector";
import { fmtMoney } from "@/lib/format";
import { Card, CardHeader, FilterChip, PageHeader, Pill, Tip, cx } from "@/components/ui/primitives";
import { CHECK_LABEL, CheckIcon, ELIGIBILITY, EligibilityPill, StagePill } from "@/components/ui/status";

const CHECK_COLUMNS = [
  ["classification", "Classification"],
  ["us_production", "U.S. production"],
  ["production_period", "Produced in period"],
  ["sale", "Sale"],
  ["capacity", "Capacity"],
  ["claimant", "Claimant"],
  ["material_assistance", "PFE / MACR"],
  ["section_48c", "§48C"],
] as const;

export function EligibilityMap() {
  const { analysis, dataset, state } = useWorkspace();
  const { componentIds, credit } = useScopedAnalysis();
  const router = useRouter();
  const [filter, setFilter] = useState<EligibilityStatus | "all">("all");
  const dets = componentIds.map((id) => analysis.determinations[id]);
  const shown = dets.filter((d) => filter === "all" || d.status === filter);
  const statuses = [...new Set(dets.map((d) => d.status))];

  return (
    <div>
      <PageHeader
        eyebrow={`Tax year ${dataset.taxYear}`}
        title="Eligibility"
        subtitle="Automated assessment of each eligible component against the modeled 45X requirements. Each cell links to the facts behind it; nothing here is a legal conclusion until a professional reviews it."
        meta={
          <>
            <span className="text-[11.5px] text-ink-3">Rule version</span>
            <Pill tone="warn" dot={false}>
              <span className="font-mono">{ACTIVE_RULE_VERSION.id}</span> · placeholder
            </Pill>
          </>
        }
      />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={dets.length}>
          All
        </FilterChip>
        {statuses.map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} count={dets.filter((d) => d.status === s).length}>
            {ELIGIBILITY[s].label}
          </FilterChip>
        ))}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Eligible component</th>
                {CHECK_COLUMNS.map(([, label]) => (
                  <th key={label} className="text-center" style={{ whiteSpace: "normal", minWidth: 64 }}>
                    {label}
                  </th>
                ))}
                <th>Result</th>
                <th>Review</th>
                <th className="r">Estimated</th>
                <th className="r">Supported</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => {
                const comp = dataset.components.find((c) => c.id === d.componentId)!;
                const cc = credit.byComponent.find((c) => c.componentId === d.componentId);
                return (
                  <tr key={d.componentId} className="clickable" onClick={() => router.push(`/components/${d.componentId}`)}>
                    <td className="min-w-[180px]">
                      <div className="font-medium">{comp.name}</div>
                      <div className="text-[11px] text-ink-3">{dataset.facilities.find((f) => f.id === comp.facilityId)?.shortName}</div>
                    </td>
                    {CHECK_COLUMNS.map(([key, label]) => {
                      const c = d.checks.find((x) => x.key === key);
                      return (
                        <td key={key} className="text-center">
                          {c ? (
                            <Tip content={<><b>{label}: {CHECK_LABEL[c.status]}</b><br />{c.value}</>} width={220}>
                              <CheckIcon status={c.status} />
                            </Tip>
                          ) : (
                            <CheckIcon status="not_evaluated" />
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <EligibilityPill status={d.status} />
                    </td>
                    <td>
                      <StagePill compact stage={state.reviewStages[d.componentId] ?? "automated"} />
                    </td>
                    <td className="r num">{cc ? fmtMoney(cc.estimated) : "—"}</td>
                    <td className="r num text-ok">{cc ? fmtMoney(cc.supported) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-line px-4 py-2.5 text-[11.5px] text-ink-3">
          {(["supported", "pending", "issue", "not_evaluated"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <CheckIcon status={s} /> {CHECK_LABEL[s]}
            </span>
          ))}
        </div>
      </Card>

      <div className="mt-4 max-w-4xl">
        <ClaimantMap />
      </div>
    </div>
  );
}

function ClaimantMap() {
  const { dataset, analysis, state } = useWorkspace();
  const { open } = useInspector();
  return (
    <Card>
      <CardHeader title="Claimant determination" subtitle="Who produces, who sells, who claims — by facility." />
      <div className="space-y-3 px-4 py-3">
        {dataset.facilities.map((f) => {
          const operator = dataset.entities.find((e) => e.id === f.operatorEntityId)!;
          const comps = dataset.components.filter((c) => c.facilityId === f.id && c.category !== "electrode_active_material");
          return (
            <div key={f.id} className="rounded-md border border-line">
              <div className="flex items-center gap-2 border-b border-line bg-subtle px-3 py-2">
                <Factory className="h-4 w-4 text-ink-3" />
                <span className="text-[12.5px] font-medium">{f.name}</span>
                {f.sourceId && <SourceLink target={{ kind: "source", id: f.sourceId }} />}
              </div>
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 text-[12px]">
                  <Building2 className="h-3.5 w-3.5 text-ink-3" />
                  Operated by <span className="font-medium">{operator.name}</span>
                  {operator.role === "contract_manufacturer" && <Pill tone="warn">Contract manufacturer</Pill>}
                </div>
                {comps.map((c) => {
                  const claimant = dataset.entities.find((e) => e.id === c.claimant.claimingEntityId.value);
                  const issue = analysis.issues.find((i) => i.type === "claimant_undetermined" && i.componentIds.includes(c.id));
                  const resolved = issue && state.resolutions[issue.id]?.state === "resolved";
                  return (
                    <div key={c.id} className="mt-2 flex flex-wrap items-center gap-2 pl-5 text-[12px]">
                      <ArrowDown className="h-3 w-3 text-ink-4" />
                      <span className="font-medium">{c.shortName}</span>
                      <span className="text-ink-3">claimed by</span>
                      <span className={cx(c.claimant.claimingEntityId.kind !== "known" && !resolved && "text-warn")}>{claimant?.name}</span>
                      {c.claimant.claimingEntityId.kind !== "known" && !resolved ? (
                        <button onClick={() => issue && open({ kind: "issue", id: issue.id })}>
                          <Pill tone="warn">Assumption — not established</Pill>
                        </button>
                      ) : (
                        <Pill tone="ok">{resolved ? "Resolved by review" : "Known"}</Pill>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="rounded-md border border-line px-3 py-2 text-[12px]">
          <span className="font-medium">Related party:</span> Volterra Energy Storage LLC (common control) purchases VX-2170 cells.{" "}
          <SourceLink target={{ kind: "source", id: "SRC-ENTMAP-VES" }} />
        </div>
      </div>
    </Card>
  );
}
