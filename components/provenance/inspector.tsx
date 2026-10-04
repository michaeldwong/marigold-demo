"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, BookOpen, Building2, FileSpreadsheet, FileText, Database, ShieldAlert, X, ListChecks, ChevronRight } from "lucide-react";
import type { ID, SourceRef } from "@/lib/domain/types";
import { CITATIONS } from "@/lib/compliance/citations";
import { categoryLabel } from "@/lib/documents/analyzer";
import { useWorkspace } from "@/lib/state/workspace";
import { fmtDate, fmtDateTime, fmtMoney, fmtNum, fmtUsd } from "@/lib/format";
import { Button, KV, Pill, cx } from "@/components/ui/primitives";
import { PfePill, REQUIREMENT, RequirementPill, SeverityPill } from "@/components/ui/status";

export type InspectorTarget =
  | { kind: "source"; id: ID }
  | { kind: "evidence"; id: ID }
  | { kind: "supplier"; id: ID }
  | { kind: "issue"; id: ID }
  | { kind: "citation"; id: ID }
  | { kind: "requirement"; id: ID };

interface InspectorValue {
  open: (t: InspectorTarget) => void;
  close: () => void;
}

const InspectorContext = createContext<InspectorValue | null>(null);

export function useInspector() {
  const v = useContext(InspectorContext);
  if (!v) throw new Error("useInspector must be used inside InspectorProvider");
  return v;
}

export function InspectorProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<InspectorTarget[]>([]);
  const open = useCallback((t: InspectorTarget) => setStack((s) => [...s, t]), []);
  const close = useCallback(() => setStack([]), []);
  const back = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const value = useMemo(() => ({ open, close }), [open, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const current = stack.at(-1);
  return (
    <InspectorContext.Provider value={value}>
      {children}
      {current && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/20" onClick={close} />
          <aside key={stack.length} className="drawer-in relative flex h-full w-full max-w-[520px] flex-col border-l border-line bg-surface shadow-2xl">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              {stack.length > 1 && (
                <button onClick={back} className="rounded p-1 text-ink-3 hover:bg-mute-bg" aria-label="Back">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="flex-1 text-[13px] font-semibold">{TITLES[current.kind]}</div>
              <button onClick={close} className="rounded p-1 text-ink-3 hover:bg-mute-bg" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="thin-scroll flex-1 overflow-y-auto px-5 py-4">
              <InspectorBody target={current} />
            </div>
          </aside>
        </div>
      )}
    </InspectorContext.Provider>
  );
}

const TITLES: Record<InspectorTarget["kind"], string> = {
  source: "Source & Evidence",
  evidence: "Source & Evidence",
  supplier: "Supplier",
  issue: "Issue",
  citation: "Rule reference",
  requirement: "Evidence requirement",
};

/* -------------------------------------------------------------------------- */
/* Public trigger                                                             */
/* -------------------------------------------------------------------------- */

export function SourceLink({ target, label = "View source", className }: { target: InspectorTarget; label?: string; className?: string }) {
  const { open } = useInspector();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        open(target);
      }}
      className={cx("inline-flex items-center gap-1 text-[11.5px] font-medium text-info hover:underline", className)}
    >
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Bodies                                                                     */
/* -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="eyebrow mb-2">{title}</div>
      {children}
    </section>
  );
}

function InspectorBody({ target }: { target: InspectorTarget }) {
  switch (target.kind) {
    case "source":
      return <SourceBody id={target.id} />;
    case "evidence":
      return <EvidenceBody id={target.id} />;
    case "supplier":
      return <SupplierBody id={target.id} />;
    case "issue":
      return <IssueBody id={target.id} />;
    case "citation":
      return <CitationBody id={target.id} />;
    case "requirement":
      return <RequirementBody id={target.id} />;
  }
}

function Highlighted({ text, highlight }: { text: string; highlight?: string }) {
  const i = highlight ? text.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  if (!highlight || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="evidence-highlight">{text.slice(i, i + highlight.length)}</mark>
      {text.slice(i + highlight.length)}
    </>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const tone = value >= 0.85 ? "bg-ok" : value >= 0.7 ? "bg-warn" : "bg-bad";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-mute-bg">
        <div className={cx("h-full", tone)} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="num text-[12.5px] font-medium">{Math.round(value * 100)}%</span>
      <span className="text-[11.5px] text-ink-3">{value >= 0.85 ? "High confidence" : "Needs review"}</span>
    </div>
  );
}

const EVIDENCE_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "mute" | "info" }> = {
  verified: { label: "Verified", tone: "ok" },
  received: { label: "Received — not reviewed", tone: "info" },
  pending_review: { label: "Pending review", tone: "info" },
  expired: { label: "Expired", tone: "bad" },
  conflicting: { label: "Conflicting", tone: "warn" },
  superseded: { label: "Superseded (retained)", tone: "mute" },
};

function LocatorIcon({ s }: { s: SourceRef }) {
  const cls = "h-4 w-4 text-ink-3";
  if (s.locator.type === "spreadsheet") return <FileSpreadsheet className={cls} />;
  if (s.locator.type === "system_record") return <Database className={cls} />;
  return <FileText className={cls} />;
}

function SourceBody({ id }: { id: ID }) {
  const { dataset } = useWorkspace();
  const { open } = useInspector();
  const s = dataset.sources.find((x) => x.id === id);
  if (!s) return <div className="text-ink-3">Source not found.</div>;
  const ev = dataset.evidence.find((e) => e.id === s.evidenceId);
  const st = EVIDENCE_STATUS[ev?.status ?? "received"];
  return (
    <div>
      <Section title="Finding">
        <div className="text-[15px] font-semibold text-ink">{s.finding}</div>
        <div className="mt-1 text-[12px] text-ink-3">Why the system believes this — traced to the record below.</div>
      </Section>

      <Section title="Source">
        <button onClick={() => ev && open({ kind: "evidence", id: ev.id })} className="flex w-full items-center gap-2 rounded-md border border-line bg-subtle px-3 py-2 text-left hover:border-line-strong">
          <LocatorIcon s={s} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{ev?.fileName ?? s.evidenceId}</div>
            <div className="text-[11.5px] text-ink-3">
              {s.locator.type === "document" && (
                <>
                  {s.locator.page !== undefined && <>Page {s.locator.page}</>}
                  {s.locator.section && <> · Section: {s.locator.section}</>}
                </>
              )}
              {s.locator.type === "spreadsheet" && (
                <>
                  Sheet: {s.locator.sheet} · Row: {s.locator.row || "—"} · Column: {s.locator.column}
                </>
              )}
              {s.locator.type === "system_record" && (
                <>
                  {s.locator.system} · Record ID: <span className="font-mono">{s.locator.recordId}</span>
                </>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-ink-4" />
        </button>
      </Section>

      {s.locator.type === "document" && (
        <Section title="Extracted text">
          <blockquote className="rounded-md border-l-2 border-warn bg-subtle px-3 py-2.5 font-serif text-[13px] leading-relaxed text-ink-2">
            “…<Highlighted text={s.locator.excerpt} highlight={s.locator.highlight} />…”
          </blockquote>
        </Section>
      )}
      {s.locator.type === "spreadsheet" && (
        <Section title="Cell value">
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sheet</th>
                  <th className="r">Row</th>
                  <th>Column</th>
                  <th className="r">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{s.locator.sheet}</td>
                  <td className="r num">{s.locator.row || "—"}</td>
                  <td>{s.locator.column}</td>
                  <td className="r num">
                    <mark className="evidence-highlight">{s.locator.cellValue}</mark>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}
      {s.locator.type === "system_record" && (
        <Section title="Record fields">
          <div className="rounded-md border border-line px-3 py-1">
            {Object.entries(s.locator.fields).map(([k, v]) => (
              <KV key={k} label={<span className="font-mono text-[11.5px]">{k}</span>}>
                <span className="font-mono text-[12px]">{v}</span>
              </KV>
            ))}
          </div>
        </Section>
      )}

      <Section title="Extraction confidence">
        <ConfidenceBar value={s.extractionConfidence} />
        <div className="mt-1 text-[11.5px] text-ink-3">
          {s.extractionMethod === "structured_import" ? "Structured import" : s.extractionMethod === "mock_extraction" ? "Mock extraction (placeholder for document AI)" : "Manual entry"} · Data confidence only — not a compliance judgment.
        </div>
      </Section>

      <Section title="Evidence status">
        <Pill tone={st.tone}>{st.label}</Pill>
      </Section>

      <Section title="Used in">
        <ul className="space-y-1">
          {s.usedIn.map((u) => (
            <li key={u} className="flex items-center gap-2 text-[12.5px]">
              <span className="h-1 w-1 rounded-full bg-ink-4" />
              {u}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function EvidenceBody({ id }: { id: ID }) {
  const { dataset } = useWorkspace();
  const { open } = useInspector();
  const ev = dataset.evidence.find((e) => e.id === id);
  if (!ev) return <div className="text-ink-3">Document not found.</div>;
  const st = EVIDENCE_STATUS[ev.status];
  const refs = dataset.sources.filter((s) => s.evidenceId === id);
  const att = ev.attestation;
  const sup = att && dataset.suppliers.find((s) => s.id === att.supplierId);
  return (
    <div>
      <div className="mb-4 flex items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 text-ink-3" />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold break-words">{ev.fileName}</div>
          <div className="text-[12px] text-ink-3">{ev.title}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone={st.tone}>{st.label}</Pill>
            <Pill tone="mute" dot={false}>
              {categoryLabel(ev.category)}
            </Pill>
          </div>
        </div>
      </div>
      <Section title="Document">
        <KV label="Received">{fmtDateTime(ev.receivedAt)}, {ev.receivedAt.slice(0, 4)}</KV>
        <KV label="Intake">{ev.source.replace(/_/g, " ")}</KV>
        <KV label="Size">{fmtNum(ev.sizeKb)} KB{ev.pages ? ` · ${ev.pages} pages` : ""}</KV>
        {ev.supersededBy && <KV label="Superseded by">{dataset.evidence.find((e) => e.id === ev.supersededBy)?.fileName}</KV>}
        {ev.note && <KV label="Note">{ev.note}</KV>}
      </Section>
      {att && (
        <Section title="Supplier certification / attestation">
          <KV label="Supplier">
            <button className="text-info hover:underline" onClick={() => open({ kind: "supplier", id: att.supplierId })}>
              {sup?.name}
            </button>
          </KV>
          <KV label="EIN">
            <span className={cx("font-mono", ev.status === "conflicting" && "text-warn")}>{att.ein}</span>
            {ev.status === "conflicting" && <span className="ml-2 text-[11.5px] text-warn">≠ supplier master {sup?.ein.value}</span>}
          </KV>
          <KV label="Effective period">
            {fmtDate(att.coverage.from)} – {fmtDate(att.coverage.to)}
          </KV>
          <KV label="Penalty of perjury">{att.penaltyOfPerjury ? "Yes — signed under penalty of perjury" : "No"}</KV>
          <KV label="Signatory">{att.signatory}</KV>
          <KV label="Representation">
            <span className="text-ink-2">{att.representation}</span>
          </KV>
        </Section>
      )}
      <Section title={`Facts extracted from this document (${refs.length})`}>
        {refs.length === 0 ? (
          <div className="text-[12px] text-ink-3">No facts extracted yet. Document analysis is a placeholder in this prototype.</div>
        ) : (
          <div className="divide-y divide-line rounded-md border border-line">
            {refs.slice(0, 40).map((r) => (
              <button key={r.id} onClick={() => open({ kind: "source", id: r.id })} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-subtle">
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{r.finding}</span>
                <span className="num text-[11px] text-ink-3">{Math.round(r.extractionConfidence * 100)}%</span>
                <ChevronRight className="h-3.5 w-3.5 text-ink-4" />
              </button>
            ))}
            {refs.length > 40 && <div className="px-3 py-2 text-[11.5px] text-ink-3">+{refs.length - 40} more records</div>}
          </div>
        )}
      </Section>
    </div>
  );
}

function SupplierBody({ id }: { id: ID }) {
  const { dataset, analysis } = useWorkspace();
  const { open } = useInspector();
  const s = dataset.suppliers.find((x) => x.id === id);
  if (!s) return <div className="text-ink-3">Supplier not found.</div>;
  const atts = dataset.evidence.filter((e) => e.attestation?.supplierId === id);
  const uses = dataset.bomVersions.flatMap((b) => b.lines.filter((l) => l.supplierId === id).map((l) => ({ b, l })));
  const issues = analysis.issues.filter((i) => i.supplierId === id);
  return (
    <div>
      <div className="mb-4 flex items-start gap-3">
        <Building2 className="mt-0.5 h-5 w-5 text-ink-3" />
        <div>
          <div className="text-[14px] font-semibold">{s.name}</div>
          <div className="text-[12px] text-ink-3">
            <span className="font-mono">{s.id}</span> · {s.country}
            {s.aliases.length > 0 && <> · aka {s.aliases.join(", ")}</>}
          </div>
        </div>
      </div>
      <Section title="Identity">
        <KV label="EIN">
          {s.ein.value ? <span className="font-mono">{s.ein.value}</span> : <span className="text-ink-3">{s.ein.note}</span>}
          {s.ein.sourceId && <SourceLink className="ml-2" target={{ kind: "source", id: s.ein.sourceId }} />}
        </KV>
        <KV label="Supplier facility">
          {s.facilities[0].name} — {s.facilities[0].city}, {s.facilities[0].country}
        </KV>
        <KV label="Supplier master">{s.masterMatch === "matched" ? "Matched" : s.masterMatch === "alias_match" ? <span className="text-warn">Alias match — needs review</span> : <span className="text-bad">Unmatched</span>}</KV>
        <KV label="Qualification">
          {s.qualification.status.replace(/_/g, " ")} since {fmtDate(s.qualification.since)}
        </KV>
      </Section>
      <Section title="Ownership chain">
        <div className="rounded-md border border-line">
          <div className="px-3 py-2 text-[12.5px] font-medium">{s.name}</div>
          {s.ownership.map((o, i) => (
            <div key={i} className="flex items-center gap-2 border-t border-line px-3 py-2 text-[12.5px]">
              <span className="text-ink-4">↑</span>
              <div className="min-w-0 flex-1">
                <div className={cx(o.status === "unknown" && "text-bad font-medium")}>{o.entityName}</div>
                <div className="text-[11px] text-ink-3">
                  {o.relationship.replace(/_/g, " ")} · {o.country}
                  {o.ownershipPct ? ` · ${o.ownershipPct}%` : ""}
                  {o.note ? ` · ${o.note}` : ""}
                </div>
              </div>
              <Pill tone={o.status === "verified" ? "ok" : o.status === "reported" ? "info" : "bad"}>{o.status}</Pill>
              {o.sourceId && <SourceLink target={{ kind: "source", id: o.sourceId }} label="Source" />}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[12.5px]">
          <span className="text-ink-3">Ultimate parent (resolved):</span>
          <span className="font-medium">{s.ultimateParent.value ?? "Unknown"}</span>
          {s.ultimateParent.kind !== "known" && <Pill tone={s.ultimateParent.kind === "assumption" ? "warn" : "bad"}>{s.ultimateParent.kind === "assumption" ? "Unverified" : "Missing"}</Pill>}
        </div>
        {s.ultimateParent.note && <div className="mt-1 text-[11.5px] text-ink-3">{s.ultimateParent.note}</div>}
      </Section>
      <Section title="PFE status by year">
        <div className="flex flex-wrap gap-2">
          {Object.entries(s.pfeStatusByYear).map(([y, st]) => (
            <div key={y} className="rounded-md border border-line px-2.5 py-1.5">
              <div className="text-[11px] text-ink-3">{y}</div>
              <PfePill status={st} />
            </div>
          ))}
        </div>
        <div className="mt-2 text-[12px] text-ink-2">{s.pfeRationale}</div>
      </Section>
      <Section title={`Attestations (${atts.length})`}>
        {atts.length === 0 ? (
          <div className="rounded-md border border-dashed border-bad-line bg-bad-bg px-3 py-2 text-[12px] text-bad">No supplier attestation on file.</div>
        ) : (
          <div className="divide-y divide-line rounded-md border border-line">
            {atts.map((a) => (
              <button key={a.id} onClick={() => open({ kind: "evidence", id: a.id })} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-subtle">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px]">{a.fileName}</div>
                  <div className="text-[11px] text-ink-3">
                    Covers {fmtDate(a.attestation!.coverage.from)} – {fmtDate(a.attestation!.coverage.to)}
                  </div>
                </div>
                <Pill tone={EVIDENCE_STATUS[a.status].tone}>{EVIDENCE_STATUS[a.status].label}</Pill>
              </button>
            ))}
          </div>
        )}
      </Section>
      <Section title="Used in BOM versions">
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>BOM</th>
                <th>Material</th>
                <th className="r">Cost / unit</th>
              </tr>
            </thead>
            <tbody>
              {uses.map(({ b, l }) => (
                <tr key={l.id}>
                  <td>{dataset.components.find((c) => c.id === b.componentId)?.shortName}</td>
                  <td>{b.version}</td>
                  <td className="max-w-[160px] truncate">{dataset.materials.find((m) => m.id === l.materialId)?.name}</td>
                  <td className="r num">
                    {fmtUsd(l.unitCost.value ?? 0)} {l.unitCost.sourceId && <SourceLink target={{ kind: "source", id: l.unitCost.sourceId }} label="↗" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {issues.length > 0 && (
        <Section title="Open issues">
          <IssueList ids={issues.map((i) => i.id)} />
        </Section>
      )}
    </div>
  );
}

export function IssueList({ ids }: { ids: ID[] }) {
  const { analysis, state } = useWorkspace();
  const { open } = useInspector();
  return (
    <div className="divide-y divide-line rounded-md border border-line">
      {ids.map((id) => {
        const i = analysis.issues.find((x) => x.id === id);
        if (!i) return null;
        const amt = analysis.credit.atRiskByIssue.find((x) => x.issueId === id)?.amount ?? 0;
        const res = state.resolutions[id];
        return (
          <button key={id} onClick={() => open({ kind: "issue", id })} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-subtle">
            <ShieldAlert className={cx("h-4 w-4 shrink-0", i.severity === "high" ? "text-bad" : i.severity === "medium" ? "text-warn" : "text-ink-4")} />
            <span className="min-w-0 flex-1 text-[12.5px]">{i.title}</span>
            {res?.state === "resolved" ? <Pill tone="ok">Resolved</Pill> : res?.state === "answered" ? <Pill tone="info">Answered</Pill> : null}
            {amt > 0 && <span className="num text-[12px] font-medium text-bad">{fmtMoney(amt)}</span>}
          </button>
        );
      })}
    </div>
  );
}

function IssueBody({ id }: { id: ID }) {
  const { analysis, dataset, state, person } = useWorkspace();
  const { open, close } = useInspector();
  const i = analysis.issues.find((x) => x.id === id);
  if (!i) return <div className="text-ink-3">Issue not found.</div>;
  const amt = analysis.credit.atRiskByIssue.find((x) => x.issueId === id)?.amount ?? 0;
  const tasks = state.tasks.filter((t) => t.issueId === id);
  const res = state.resolutions[id];
  const q = analysis.questions.find((x) => x.issueId === id);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <SeverityPill severity={i.severity} />
        {i.gatesCredit ? <Pill tone="info" dot={false}>Gates credit</Pill> : <Pill tone="mute" dot={false}>No credit gating</Pill>}
        {res && <Pill tone={res.state === "resolved" ? "ok" : res.state === "rejected" ? "bad" : "info"}>{res.state}</Pill>}
      </div>
      <div className="text-[15px] font-semibold">{i.title}</div>
      <p className="mt-2 text-[12.5px] text-ink-2">{i.description}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-line px-3 py-2">
          <div className="eyebrow">Credit requiring substantiation</div>
          <div className={cx("mt-1 text-[18px] font-semibold num", amt > 0 ? "text-bad" : "text-ink-3")}>{amt > 0 ? fmtMoney(amt) : "$0"}</div>
          <div className="text-[11px] text-ink-3">{amt > 0 ? "Attributed as primary blocker" : i.gatesCredit ? "Not the primary blocker for any credit" : "Continuity / hygiene item"}</div>
        </div>
        <div className="rounded-md border border-line px-3 py-2">
          <div className="eyebrow">Triggered by</div>
          <div className="mt-1 text-[12.5px]">{i.trigger}</div>
        </div>
      </div>
      <Section title="Affected">
        <div className="mt-1 flex flex-wrap gap-1.5">
          {i.componentIds.map((cid) => (
            <Link key={cid} onClick={close} href={`/components/${cid}`} className="rounded border border-line px-2 py-0.5 text-[12px] hover:border-line-strong">
              {dataset.components.find((c) => c.id === cid)?.shortName}
            </Link>
          ))}
          {i.supplierId && (
            <button onClick={() => open({ kind: "supplier", id: i.supplierId! })} className="rounded border border-line px-2 py-0.5 text-[12px] hover:border-line-strong">
              {dataset.suppliers.find((s) => s.id === i.supplierId)?.name}
            </button>
          )}
          {i.bomVersionIds?.map((b) => (
            <Link key={b} onClick={close} href={`/supply-chain?component=${dataset.bomVersions.find((x) => x.id === b)?.componentId}&bom=${b}`} className="rounded border border-line px-2 py-0.5 text-[12px] hover:border-line-strong">
              BOM {dataset.bomVersions.find((x) => x.id === b)?.version}
            </Link>
          ))}
          {i.saleIds?.map((sid) => (
            <span key={sid} className="rounded border border-line px-2 py-0.5 font-mono text-[11.5px]">
              {dataset.sales.find((s) => s.id === sid)?.invoiceNumber}
            </span>
          ))}
          {i.batchIds?.slice(0, 4).map((b) => (
            <span key={b} className="rounded border border-line px-2 py-0.5 font-mono text-[11.5px]">
              {b}
            </span>
          ))}
        </div>
      </Section>
      {i.evidenceIds && i.evidenceIds.length > 0 && (
        <Section title="Related evidence">
          <div className="divide-y divide-line rounded-md border border-line">
            {i.evidenceIds.map((eid) => {
              const ev = dataset.evidence.find((e) => e.id === eid);
              return ev ? (
                <button key={eid} onClick={() => open({ kind: "evidence", id: eid })} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-subtle">
                  <FileText className="h-3.5 w-3.5 text-ink-3" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">{ev.fileName}</span>
                  <Pill tone={EVIDENCE_STATUS[ev.status].tone}>{EVIDENCE_STATUS[ev.status].label}</Pill>
                </button>
              ) : null;
            })}
          </div>
        </Section>
      )}
      {res?.answer && (
        <Section title="Answer on record">
          <div className="rounded-md border border-line bg-subtle px-3 py-2 text-[12.5px]">
            {res.answer}
            <div className="mt-1 text-[11px] text-ink-3">
              {res.by} · {res.at ? fmtDateTime(res.at) : ""} · {res.state === "resolved" ? "accepted by reviewer" : "awaiting professional review"}
            </div>
          </div>
        </Section>
      )}
      <Section title="Workflow">
        <div className="space-y-1.5">
          {q && (
            <Link onClick={close} href={`/questions#${q.id}`} className="flex items-center gap-2 text-[12.5px] text-info hover:underline">
              <ListChecks className="h-3.5 w-3.5" /> Question: {q.question}
            </Link>
          )}
          {tasks.map((t) => (
            <Link key={t.id} onClick={close} href={`/questions#Q-${id}`} className="flex items-center gap-2 text-[12.5px] text-info hover:underline">
              <ListChecks className="h-3.5 w-3.5" /> Task: {t.title} — {person(t.ownerId)?.name}
            </Link>
          ))}
          {!q && tasks.length === 0 && <div className="text-[12px] text-ink-3">No question or task linked.</div>}
        </div>
      </Section>
    </div>
  );
}

function CitationBody({ id }: { id: ID }) {
  const c = CITATIONS[id];
  if (!c) return <div className="text-ink-3">Citation not found.</div>;
  return (
    <div>
      <div className="mb-3 flex items-start gap-3">
        <BookOpen className="mt-0.5 h-5 w-5 text-ink-3" />
        <div>
          <div className="text-[14px] font-semibold">{c.document}</div>
          <div className="mt-0.5 font-mono text-[11.5px] text-ink-3">{c.file}</div>
        </div>
      </div>
      <Section title="Location">
        <KV label="Section">{c.section}</KV>
        {c.page !== undefined && <KV label="Page">{c.page}</KV>}
      </Section>
      <Section title="Excerpt">
        <blockquote className="rounded-md border-l-2 border-info bg-subtle px-3 py-2.5 font-serif text-[13px] leading-relaxed text-ink-2">“{c.excerpt}”</blockquote>
      </Section>
      <div className="rounded-md border border-dashed border-line-strong bg-subtle px-3 py-2 text-[11.5px] text-ink-3">
        Static citation catalog attached to placeholder logic. It is a pointer for reviewers — not an interpretation. Future findings will carry retrieval-backed citations from <span className="font-mono">docs/compliance/</span>.
      </div>
    </div>
  );
}

function RequirementBody({ id }: { id: ID }) {
  const { analysis, dataset } = useWorkspace();
  const { open } = useInspector();
  const r = analysis.evidence.requirements.find((x) => x.id === id);
  if (!r) return <div className="text-ink-3">Requirement not found.</div>;
  return (
    <div>
      <div className="mb-2">
        <RequirementPill status={r.status} />
      </div>
      <div className="text-[15px] font-semibold">{r.label}</div>
      <div className="mt-1 text-[12.5px] text-ink-2">{r.detail}</div>
      <div className="mt-1 text-[11.5px] text-ink-3">{REQUIREMENT[r.status].label} · {categoryLabel(r.category)}{r.period ? ` · ${r.period}` : ""}</div>
      <Section title="Evidence on file">
        {r.evidenceIds.length === 0 ? (
          <div className="rounded-md border border-dashed border-bad-line bg-bad-bg px-3 py-2 text-[12px] text-bad">Nothing on file.</div>
        ) : (
          <div className="mt-1 divide-y divide-line rounded-md border border-line">
            {r.evidenceIds.slice(0, 20).map((eid) => {
              const ev = dataset.evidence.find((e) => e.id === eid);
              return ev ? (
                <button key={eid} onClick={() => open({ kind: "evidence", id: eid })} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-subtle">
                  <FileText className="h-3.5 w-3.5 text-ink-3" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">{ev.fileName}</span>
                  <Pill tone={EVIDENCE_STATUS[ev.status].tone}>{EVIDENCE_STATUS[ev.status].label}</Pill>
                </button>
              ) : null;
            })}
            {r.evidenceIds.length > 20 && <div className="px-3 py-2 text-[11.5px] text-ink-3">+{r.evidenceIds.length - 20} more</div>}
          </div>
        )}
      </Section>
      {r.issueIds.length > 0 && (
        <Section title="Linked issues">
          <IssueList ids={r.issueIds} />
        </Section>
      )}
      {r.supplierId && (
        <Button size="sm" onClick={() => open({ kind: "supplier", id: r.supplierId! })}>
          Open supplier
        </Button>
      )}
    </div>
  );
}

