"use client";

import { ArrowDown, Lock } from "lucide-react";
import { RULE_VERSIONS } from "@/lib/compliance/rule-versions";
import { useWorkspace } from "@/lib/state/workspace";
import { SourceLink } from "@/components/provenance/inspector";
import { Integrations } from "@/components/documents/documents-page";
import { fmtDate } from "@/lib/format";
import { Card, CardHeader, KV, PageHeader, Pill, PrototypeNote } from "@/components/ui/primitives";

const SECURITY_ITEMS = [
  ["Tenant isolation", "Per-customer data isolation"],
  ["Granular permissions", "Role- and field-level access (e.g. supplier pricing, formulations)"],
  ["Encryption", "Encryption in transit and at rest"],
  ["Access logs", "Immutable access logging for sensitive records"],
  ["Controlled external sharing", "Scoped advisor / auditor workspaces"],
  ["Retention controls", "Evidence retention aligned to filing and audit periods"],
  ["Model-training policy", "Customer data never used to train shared models (explicit policy)"],
];

export function SettingsPage() {
  const { dataset } = useWorkspace();
  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Settings" subtitle="Workspace configuration, rule versions, integrations, and the product boundary for automation." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Workspace" />
          <div className="px-4 py-2">
            <KV label="Company">{dataset.company.name}</KV>
            <KV label="Fiscal year end">{dataset.company.fiscalYearEnd}</KV>
            <KV label="Active tax year">{dataset.taxYear}</KV>
            <KV label="Data as of">{fmtDate(dataset.asOf)}</KV>
            <KV label="Facilities">{dataset.facilities.map((f) => f.name).join(" · ")}</KV>
          </div>
          <div className="border-t border-line px-4 py-2">
            <div className="eyebrow mb-1 pt-1">Legal entities</div>
            {dataset.entities.map((e) => (
              <KV key={e.id} label={e.name}>
                <span className="font-mono text-[12px]">{e.ein.value}</span> · {e.role.replace(/_/g, " ")}
                {e.relatedToGroup ? "" : " · unrelated"}
                {e.sourceId && <SourceLink className="ml-2" target={{ kind: "source", id: e.sourceId }} />}
              </KV>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Rule versions" subtitle="Every determination records the rule version that produced it." />
          <div className="divide-y divide-line">
            {RULE_VERSIONS.map((r, i) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12.5px] font-medium">{r.id}</span>
                  {i === 0 && <Pill tone="info">Active</Pill>}
                  <Pill tone="warn">{r.status === "placeholder" ? "Placeholder — not advisor-reviewed" : "Advisor-reviewed"}</Pill>
                </div>
                <div className="mt-0.5 text-[12px] text-ink-3">
                  {r.label} · effective {fmtDate(r.effective.from)} – {fmtDate(r.effective.to)}
                </div>
                <div className="mt-1 text-[12px] text-ink-2">{r.description}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Automation boundary" subtitle="Where AI is (eventually) used, and where it is not the authority." />
          <div className="px-4 py-3">
            <ol className="space-y-1 text-[12.5px]">
              {[
                ["Raw evidence", "Documents, exports, spreadsheets"],
                ["Extraction / mapping", "AI-assisted (future): field extraction, entity matching — always with confidence and provenance"],
                ["Structured manufacturing facts", "Canonical, versioned records"],
                ["Versioned deterministic calculations", "No AI — reproducible by rule version"],
                ["Compliance finding", "Rules engine output with citations"],
                ["Professional review", "Human decision recorded alongside the automated result"],
                ["Locked determination", "Frozen for filing and audit"],
              ].map(([t, d], i, arr) => (
                <li key={t}>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line-strong text-[10px] num">{i + 1}</span>
                    <div>
                      <div className="font-medium">{t}</div>
                      <div className="text-[11.5px] text-ink-3">{d}</div>
                    </div>
                  </div>
                  {i < arr.length - 1 && <ArrowDown className="my-0.5 ml-1 h-3 w-3 text-ink-4" />}
                </li>
              ))}
            </ol>
            <div className="mt-3">
              <PrototypeNote>No LLM is connected in this prototype. AI is never presented as the final authority for claimant identity, legal interpretation or filing positions.</PrototypeNote>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Security & data handling" subtitle="BOMs, supplier pricing, formulations, ownership and tax data are highly sensitive." />
          <div className="px-4 py-3">
            <div className="mb-3 rounded-md border border-warn-line bg-warn-bg px-3 py-2 text-[12px] text-warn">
              <b>This prototype provides no production security guarantees.</b> It runs locally with mock data, has no authentication, and stores nothing server-side. The controls below are planned, not implemented.
            </div>
            <div className="divide-y divide-line rounded-md border border-line">
              {SECURITY_ITEMS.map(([t, d]) => (
                <div key={t} className="flex items-center gap-3 px-3 py-2">
                  <Lock className="h-3.5 w-3.5 text-ink-4" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px]">{t}</div>
                    <div className="text-[11.5px] text-ink-3">{d}</div>
                  </div>
                  <Pill tone="mute">Planned</Pill>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div className="xl:col-span-2">
          <Integrations />
        </div>
      </div>
    </div>
  );
}
