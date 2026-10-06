"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PAGE_HREF, analysis, withBase } from "@/lib/analysis";
import { Card, PageTitle, SectionTitle } from "@/components/ui/primitives";

export function SourcingPage() {
  const files = analysis.source_files;
  const taxDocs = [...new Map(analysis.tax_rules.map((r) => [r.file, r])).values()];
  return (
    <div>
      <PageTitle
        title="Sourcing"
        subtitle={`The ${files.length} files Volterra provided, and the Section 45X documents Marigold applied. Click a file to open it.`}
      />

      <SectionTitle>Customer files</SectionTitle>
      <Card className="mb-10 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Source</th>
              <th>Used for</th>
              <th>Used in</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id} id={f.id}>
                <td className="min-w-[220px]">
                  <a href={withBase(f.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-info hover:underline">
                    {f.name} <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="min-w-[160px] text-ink-2">{f.source}</td>
                <td className="min-w-[200px] text-ink-2">{f.used_for}</td>
                <td className="min-w-[200px]">
                  {f.used_in.length === 0 ? (
                    <span className="text-ink-4">Reference only</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {f.used_in.slice(0, 4).map((u) => (
                        <li key={u.id}>
                          <Link href={`${PAGE_HREF[u.page] ?? "/"}#${u.id}`} className="text-[12.5px] text-info hover:underline">
                            {u.title}
                          </Link>
                        </li>
                      ))}
                      {f.used_in.length > 4 && <li className="text-[12px] text-ink-3">+ {f.used_in.length - 4} more</li>}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SectionTitle>Section 45X documents applied</SectionTitle>
      <Card className="divide-y divide-line">
        {taxDocs.map((d) => {
          const rules = analysis.tax_rules.filter((r) => r.file === d.file);
          return (
            <div key={d.file} className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <a href={withBase(d.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] font-medium text-info hover:underline">
                  {d.document} <ExternalLink className="h-3 w-3" />
                </a>
                <div className="mt-1 text-[13px] text-ink-3">Used for: {rules.map((r) => r.title.toLowerCase()).join("; ")}</div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
