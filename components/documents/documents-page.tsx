"use client";

import { useRef, useState, type DragEvent } from "react";
import { CheckCircle2, CloudUpload, FileText, Loader2, Plug, Search } from "lucide-react";
import type { DocumentCategory, EvidenceDocument } from "@/lib/domain/types";
import { DOCUMENT_CATEGORIES, categoryLabel } from "@/lib/documents/analyzer";
import { documentAnalyzer } from "@/lib/documents/mock-analyzer";
import { integrations } from "@/lib/data/mock-workflow";
import { sessionNow, useWorkspace, type UploadedDocument } from "@/lib/state/workspace";
import { useInspector } from "@/components/provenance/inspector";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { Card, CardHeader, FilterChip, PageHeader, Pill, PrototypeNote, Select, cx } from "@/components/ui/primitives";

export function DocumentsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Ingestion"
        title="Documents & data"
        subtitle="Upload BOMs, supplier attestations, MES and ERP extracts, capacity tests, contracts and entity documents. Each file is categorized, linked to the evidence request it may satisfy, and queued for analysis."
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Uploader />
        </div>
        <div className="xl:col-span-4">
          <Integrations />
        </div>
        <div className="xl:col-span-12">
          <Repository />
        </div>
      </div>
    </div>
  );
}

let uploadSeq = 1;

function Uploader() {
  const { state, dispatch, analysis, persona } = useWorkspace();
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const openIssues = analysis.issues.filter((i) => state.resolutions[i.id]?.state !== "resolved");

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const id = `UP-${Date.now().toString(36)}-${uploadSeq++}`;
      const upload: UploadedDocument = {
        id,
        fileName: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        category: "other",
        suggestedIssueIds: [],
        progress: 0,
        status: "uploading",
        uploadedAt: sessionNow(),
        uploadedBy: persona.name,
      };
      dispatch({ type: "add_upload", upload });
      // Mock upload progress — nothing leaves the browser.
      let p = 0;
      const timer = setInterval(() => {
        p = Math.min(100, p + 12 + Math.random() * 18);
        if (p >= 100) {
          clearInterval(timer);
          dispatch({ type: "update_upload", id, patch: { progress: 100, status: "analyzing" } });
          documentAnalyzer.analyzeDocument(file, { openIssueIds: openIssues.map((i) => i.id) }).then((r) => {
            dispatch({
              type: "update_upload",
              id,
              patch: { status: "pending_compliance_analysis", suggestedCategory: r.suggestedCategory, category: r.suggestedCategory, categoryConfidence: r.categoryConfidence, suggestedIssueIds: r.suggestedIssueIds },
            });
          });
        } else {
          dispatch({ type: "update_upload", id, patch: { progress: Math.round(p) } });
        }
      }, 180);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <Card>
      <CardHeader title="Upload documents" subtitle="Drag and drop or choose files. Multiple files supported." />
      <div className="p-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => input.current?.click()}
          className={cx(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition",
            drag ? "border-info bg-info-bg" : "border-line-strong bg-subtle hover:border-ink-4",
          )}
        >
          <CloudUpload className={cx("h-8 w-8", drag ? "text-info" : "text-ink-4")} strokeWidth={1.5} />
          <div className="mt-2 text-[13.5px] font-medium">Drop files here or click to browse</div>
          <div className="mt-1 text-[12px] text-ink-3">PDF, XLSX, CSV, DOCX — BOMs, attestations, MES/ERP extracts, invoices, capacity tests, contracts, entity documents</div>
          <input ref={input} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
        <div className="mt-3">
          <PrototypeNote>
            Files are not uploaded to a server and their contents are not read. A mock analyzer suggests a category and a matching evidence request from the file name only. TODO: Replace with LLM-backed document extraction pipeline (classification, field extraction with page/row provenance, entity matching).
          </PrototypeNote>
        </div>
        {state.uploads.length > 0 && (
          <div className="mt-4 divide-y divide-line rounded-md border border-line">
            {[...state.uploads].reverse().map((u) => (
              <UploadRow key={u.id} u={u} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function UploadRow({ u }: { u: UploadedDocument }) {
  const { analysis, state, dispatch } = useWorkspace();
  const openIssues = analysis.issues.filter((i) => state.resolutions[i.id]?.state !== "resolved");
  const suggested = u.suggestedIssueIds.filter((id) => openIssues.some((i) => i.id === id));
  return (
    <div className="px-3 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="h-5 w-5 shrink-0 text-ink-3" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{u.fileName}</div>
          <div className="text-[11.5px] text-ink-3 num">{fmtNum(u.sizeKb)} KB · {u.uploadedBy}</div>
        </div>
        {u.status === "uploading" ? (
          <div className="flex w-40 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mute-bg">
              <div className="h-full bg-info transition-all" style={{ width: `${u.progress}%` }} />
            </div>
            <span className="w-9 text-right text-[11.5px] text-ink-3 num">{u.progress}%</span>
          </div>
        ) : (
          <div className="text-right text-[12px]">
            <div className="flex items-center justify-end gap-1 font-medium text-ok">
              <CheckCircle2 className="h-3.5 w-3.5" /> Received
            </div>
            <div className="flex items-center justify-end gap-1 text-ink-3">
              {u.status === "analyzing" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Classifying…
                </>
              ) : (
                "Pending compliance analysis"
              )}
            </div>
          </div>
        )}
      </div>
      {u.status === "pending_compliance_analysis" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-8 text-[12px]">
          <span className="text-ink-3">Category</span>
          <Select<DocumentCategory> label="Category" value={u.category} onChange={(category) => dispatch({ type: "update_upload", id: u.id, patch: { category } })} options={DOCUMENT_CATEGORIES} className="h-7 text-[12px]" />
          {u.suggestedCategory && (
            <span className="text-[11px] text-ink-3">
              suggested: {categoryLabel(u.suggestedCategory)} ({Math.round((u.categoryConfidence ?? 0) * 100)}%)
            </span>
          )}
          <span className="ml-2 text-ink-3">Satisfies</span>
          <Select
            label="Evidence request"
            value={u.linkedIssueId ?? ""}
            onChange={(v) => dispatch({ type: "link_upload", id: u.id, issueId: v || undefined })}
            options={[
              { value: "", label: suggested.length ? "Choose (suggestions first)…" : "Not linked" },
              ...[...suggested.map((id) => openIssues.find((i) => i.id === id)!), ...openIssues.filter((i) => !suggested.includes(i.id))].map((i) => ({
                value: i.id,
                label: `${suggested.includes(i.id) ? "★ " : ""}${i.title}`,
              })),
            ]}
            className="h-7 max-w-[360px] text-[12px]"
          />
          {u.linkedIssueId && <Pill tone="info">Evidence pending review</Pill>}
        </div>
      )}
    </div>
  );
}

const STATUS_PILL: Record<EvidenceDocument["status"], { label: string; tone: "ok" | "info" | "warn" | "bad" | "mute" }> = {
  verified: { label: "Verified", tone: "ok" },
  received: { label: "Received", tone: "info" },
  pending_review: { label: "Pending review", tone: "info" },
  expired: { label: "Expired", tone: "bad" },
  conflicting: { label: "Conflicting", tone: "warn" },
  superseded: { label: "Superseded", tone: "mute" },
};

function Repository() {
  const { dataset } = useWorkspace();
  const { open } = useInspector();
  const [cat, setCat] = useState<DocumentCategory | "all">("all");
  const [q, setQ] = useState("");
  const [hideInvoices, setHideInvoices] = useState(true);
  const docs = [...dataset.evidence]
    .filter((d) => cat === "all" || d.category === cat)
    .filter((d) => !(hideInvoices && cat === "all" && d.category === "invoice"))
    .filter((d) => !q || `${d.fileName} ${d.title}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const cats = [...new Set(dataset.evidence.map((d) => d.category))];
  return (
    <Card>
      <CardHeader
        title={`Document repository (${dataset.evidence.length})`}
        subtitle="Everything on file, with intake channel and review status. Superseded documents are retained, not deleted."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" className="h-7 w-48 rounded-md border border-line-strong pr-2 pl-7 text-[12px] outline-none focus:border-info" />
          </div>
        }
      />
      <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
        <FilterChip active={cat === "all"} onClick={() => setCat("all")} count={dataset.evidence.length}>
          All
        </FilterChip>
        {cats.map((c) => (
          <FilterChip key={c} active={cat === c} onClick={() => setCat(c)} count={dataset.evidence.filter((d) => d.category === c).length}>
            {categoryLabel(c)}
          </FilterChip>
        ))}
        {cat === "all" && (
          <label className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-3">
            <input type="checkbox" checked={hideInvoices} onChange={(e) => setHideInvoices(e.target.checked)} /> Hide individual invoices
          </label>
        )}
      </div>
      <div className="max-h-[560px] overflow-auto thin-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Category</th>
              <th>Intake</th>
              <th>Received</th>
              <th className="r">Size</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="clickable" onClick={() => open({ kind: "evidence", id: d.id })}>
                <td>
                  <div className="font-medium">{d.fileName}</div>
                  <div className="max-w-[380px] truncate text-[11px] text-ink-3">{d.title}</div>
                </td>
                <td className="whitespace-nowrap text-ink-2">{categoryLabel(d.category)}</td>
                <td className="whitespace-nowrap text-ink-3">{d.source.replace(/_/g, " ")}</td>
                <td className="whitespace-nowrap num text-ink-2">
                  {fmtDateTime(d.receivedAt)}, {d.receivedAt.slice(0, 4)}
                </td>
                <td className="r num text-ink-3">{fmtNum(d.sizeKb)} KB</td>
                <td>
                  <Pill tone={STATUS_PILL[d.status].tone}>{STATUS_PILL[d.status].label}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const INTEGRATION_STATUS = {
  not_connected: { label: "Not connected", tone: "mute" as const },
  file_import: { label: "File import active", tone: "ok" as const },
  csv_imported: { label: "CSV imported", tone: "info" as const },
  planned: { label: "Planned", tone: "mute" as const },
};

export function Integrations() {
  return (
    <Card>
      <CardHeader title="Integrations" subtitle="Manufacturing, supply-chain, accounting and document systems. File-first today; connectors only where they remove recurring work." />
      <div className="divide-y divide-line">
        {integrations.map((i) => (
          <div key={i.name} className="flex items-start gap-3 px-4 py-2.5">
            <Plug className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium">{i.name}</span>
                <Pill tone={INTEGRATION_STATUS[i.status].tone}>{INTEGRATION_STATUS[i.status].label}</Pill>
              </div>
              <div className="text-[11.5px] text-ink-3">{i.system}</div>
              <div className="text-[11.5px] text-ink-3">
                {i.note}
                {i.lastSync && <> · last {fmtDateTime(i.lastSync)}</>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-line px-4 py-2.5">
        <PrototypeNote>Connector statuses are illustrative. No live connections exist in this prototype.</PrototypeNote>
      </div>
    </Card>
  );
}
