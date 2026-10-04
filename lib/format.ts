/** Display formatting helpers (locale fixed to en-US for deterministic SSR/CSR output). */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(d: string | null | undefined, opts: { year?: boolean } = {}): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return `${MONTHS[m - 1]} ${day}${opts.year === false ? "" : `, ${y}`}`;
}

export function fmtRange(from: string, to: string | null): string {
  if (!to) return `${fmtDate(from)} – present`;
  if (from.slice(0, 4) === to.slice(0, 4)) return `${fmtDate(from, { year: false })} – ${fmtDate(to)}`;
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

export function fmtDateTime(ts: string): string {
  const [date, time = "00:00"] = ts.split("T");
  const [hh, mm] = time.split(":").map(Number);
  const h12 = ((hh + 11) % 12) + 1;
  return `${fmtDate(date, { year: false })} · ${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
}

/** $18.4M / $740K / $1,240 */
export function fmtMoney(n: number, opts: { precise?: boolean } = {}): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (opts.precise) return `${sign}$${a.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${a.toFixed(0)}`;
}

export function fmtUsd(n: number, digits = 2): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtKwh(kwh: number): string {
  if (kwh >= 1000) return `${fmtNum(kwh / 1000, 1)} MWh`;
  return `${fmtNum(kwh, 1)} kWh`;
}
