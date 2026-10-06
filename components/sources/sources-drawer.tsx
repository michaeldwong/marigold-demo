"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, ExternalLink, FileText, X } from "lucide-react";
import { getEvidence, getFile, getRule, withBase } from "@/lib/analysis";
import { cx } from "@/components/ui/primitives";

interface Target {
  title: string;
  evidence: string[];
  rules: string[];
}

const Ctx = createContext<((t: Target) => void) | null>(null);

export function SourcesProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  const open = useCallback((t: Target) => setTarget(t), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTarget(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {target && <Drawer target={target} onClose={() => setTarget(null)} />}
    </Ctx.Provider>
  );
}

/** "Sources" link that opens the customer evidence and 45X rules behind a conclusion. */
export function Sources({ title, evidence = [], rules = [], className }: { title: string; evidence?: string[]; rules?: string[]; className?: string }) {
  const open = useContext(Ctx);
  const n = new Set(evidence.map((e) => getEvidence(e)?.file_id)).size + rules.length;
  if (!open || n === 0) return null;
  return (
    <button
      onClick={() => open({ title, evidence, rules })}
      className={cx("inline-flex items-center gap-1 text-[12px] font-medium text-info hover:underline", className)}
    >
      <FileText className="h-3.5 w-3.5" /> Sources
    </button>
  );
}

function Drawer({ target, onClose }: { target: Target; onClose: () => void }) {
  // Group evidence by file so each customer file appears once.
  const byFile = useMemo(() => {
    const m = new Map<string, NonNullable<ReturnType<typeof getEvidence>>[]>();
    for (const id of target.evidence) {
      const e = getEvidence(id);
      if (!e) continue;
      m.set(e.file_id, [...(m.get(e.file_id) ?? []), e]);
    }
    return [...m.entries()];
  }, [target.evidence]);
  const rules = target.rules.map(getRule).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <aside className="drawer-in relative flex h-full w-full max-w-[540px] flex-col bg-surface shadow-2xl">
        <div className="flex items-start gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Why Marigold believes this</div>
            <div className="mt-0.5 text-[15px] font-semibold">{target.title}</div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-ink-3 hover:bg-mute-bg" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="thin-scroll flex-1 space-y-7 overflow-y-auto px-6 py-5">
          {byFile.length > 0 && (
            <section>
              <h3 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Customer evidence</h3>
              <div className="space-y-3">
                {byFile.map(([fid, items]) => {
                  const f = getFile(fid)!;
                  return (
                    <div key={fid} className="rounded-lg border border-line">
                      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-ink-3" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium">{f.name}</div>
                          <div className="text-[11.5px] text-ink-3">{f.source}</div>
                        </div>
                        <a href={withBase(f.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-medium text-info hover:underline">
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <ul className="divide-y divide-line">
                        {items.slice(0, 8).map((e) => (
                          <li key={e.id} className="px-3.5 py-2.5">
                            <div className="text-[13px]">{e.fact}</div>
                            <div className="mt-0.5 text-[11.5px] text-ink-3">{e.location}</div>
                            {e.excerpt && <div className="mt-1.5 rounded bg-[#fff6d6] px-2 py-1 font-mono text-[11.5px] text-ink-2">{e.excerpt}</div>}
                          </li>
                        ))}
                        {items.length > 8 && <li className="px-3.5 py-2 text-[12px] text-ink-3">+ {items.length - 8} more records in this file</li>}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {rules.length > 0 && (
            <section>
              <h3 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Section 45X rule</h3>
              <div className="space-y-3">
                {rules.map((r) => (
                  <div key={r!.id} className="rounded-lg border border-line px-3.5 py-3">
                    <div className="flex items-start gap-2">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{r!.title}</div>
                        <div className="mt-0.5 text-[13px] text-ink-2">{r!.plain}</div>
                      </div>
                    </div>
                    <blockquote className="mt-2.5 border-l-2 border-info-line pl-3 text-[12.5px] leading-relaxed text-ink-2 italic">“{r!.quote}”</blockquote>
                    {r!.limitation && <div className="mt-2 rounded bg-warn-bg px-2.5 py-1.5 text-[12px] text-warn">{r!.limitation}</div>}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-ink-3">
                      <span>
                        {r!.document} · {r!.section} · page {r!.page}
                      </span>
                      <a href={`${withBase(r!.url)}#page=${r!.page}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-info hover:underline">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
