"use client";

import Link from "next/link";
import type { Product } from "@/lib/analysis";
import { getIssue } from "@/lib/analysis";
import { SeverityTag } from "@/components/ui/primitives";

/** "Cylindrical NMC battery cell" from the product's form factor and chemistry. */
export function productLabel(p: Product): string {
  const shape = /cylindrical/i.test(p.form_factor) ? "Cylindrical" : /prismatic/i.test(p.form_factor) ? "Prismatic" : p.form_factor;
  const chem = p.chemistry.split(" ")[0].replace(/\d+$/, "");
  return `${shape} ${chem} battery cell`;
}

export function fmtDay(iso: string | null): string {
  if (!iso) return "onward";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Compact links to related missing-information items. */
export function IssueLinks({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  return (
    <ul className="space-y-1.5">
      {ids.map((id) => {
        const i = getIssue(id);
        return i ? (
          <li key={id}>
            <Link href={`/missing-information#${id}`} className="group inline-flex items-start gap-2">
              <SeverityTag severity={i.severity} />
              <span className="text-[13px] leading-snug group-hover:underline">{i.title}</span>
            </Link>
          </li>
        ) : null;
      })}
    </ul>
  );
}
