import type { ISODate } from "@/lib/domain/types";

export const yearOf = (d: ISODate) => Number(d.slice(0, 4));

export function addDays(d: ISODate, days: number): ISODate {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Inclusive containment: [from, to] ⊆ [coverFrom, coverTo]. */
export function covers(coverFrom: ISODate, coverTo: ISODate | null, from: ISODate, to: ISODate): boolean {
  return coverFrom <= from && (coverTo ?? "9999-12-31") >= to;
}

export function inEffect(from: ISODate, to: ISODate | null, d: ISODate): boolean {
  return from <= d && (to ?? "9999-12-31") >= d;
}
