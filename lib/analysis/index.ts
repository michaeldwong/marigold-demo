/**
 * Typed access to the pre-computed Section 45X analysis.
 *
 * dashboard_analysis.json is produced by pipeline/analyze_customer_files.py from the customer's
 * files only. It stands in for the output of the future Marigold ingestion pipeline; the UI never
 * computes tax conclusions itself.
 */
import raw from "./dashboard_analysis.json";

export type Status = "satisfied" | "review" | "not_satisfied";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Evidence {
  id: string;
  file_id: string;
  location: string;
  fact: string;
  excerpt: string | null;
}

export interface SourceFile {
  id: string;
  path: string;
  name: string;
  source: string;
  used_for: string;
  url: string;
  used_in: { page: string; id: string; title: string }[];
}

export interface TaxRule {
  id: string;
  document: string;
  file: string;
  section: string;
  page: number;
  title: string;
  plain: string;
  quote: string;
  limitation?: string;
  url: string;
}

export interface Requirement {
  id: string;
  title: string;
  status: Status;
  explanation: string;
  fact: string;
  affected_products: string[];
  evidence_refs: string[];
  tax_rule_refs: string[];
  issue_refs: string[];
  next_action: string | null;
}

export interface Issue {
  id: string;
  severity: Severity;
  type: string;
  title: string;
  description: string;
  why: string;
  affected: string[];
  credit_affected: number;
  next_action: string;
  evidence_refs: string[];
  rule_refs: string[];
}

export interface CalcStep {
  label: string;
  value: string;
  evidence_refs: string[];
  tax_rule_refs: string[];
}

export interface CreditCalculation {
  product: string;
  steps: CalcStep[];
  formula: string;
  amount: number;
  upper: number;
  note: string | null;
  plain: string;
}

export interface Material {
  material: string;
  erp_material: string;
  quantity: string;
  supplier: string;
  made_in: string;
  evidence_status: "supported" | "issue" | "missing";
  issue_refs: string[];
  evidence_refs: string[];
}

export interface Product {
  id: string;
  name: string;
  chemistry: string;
  form_factor: string;
  identifiers: { plm: string; erp: string; mes: string; evidence_refs: string[] };
  revisions: { rev: string; from: string; to: string | null; change: string; evidence_refs: string[]; materials: Material[] }[];
  revision_changes: string[];
  specs: { label: string; value: string; evidence_refs: string[] }[];
  facility: string;
  production: { cells: number; orders: number; first: string; last: string; evidence_refs: string[] };
  sales: { cells: number; invoices: number; customers: string[]; evidence_refs: string[] };
  credit: { amount: number; upper: number };
  status: "supported" | "review";
  issue_refs: string[];
}

export interface Analysis {
  meta: { title: string; generated_from: string; pipeline: string; data_as_of: string; disclaimer: string };
  company: { name: string; entity_type: string; state: string; ein: string; tax_year: number; parent: string; affiliates: string; evidence_refs: string[] };
  facility: { name: string; address: string; country: string; owner: string; operator: string; erp_plant: string; mes_site: string; evidence_refs: string[] };
  tax_year: number;
  eligibility: { status: "eligible" | "review" | "not_eligible"; headline: string; summary: string; requirements: Requirement[] };
  credit_summary: {
    estimate: number;
    upper: number;
    by_product: { product: string; amount: number; upper: number }[];
    basis: string;
    excluded_sales: { label: string; reason: string; cells: number; evidence_refs: string[] }[];
  };
  credit_calculations: CreditCalculation[];
  products: Product[];
  issues: Issue[];
  issue_counts: Record<Severity, number>;
  source_files: SourceFile[];
  evidence: Evidence[];
  tax_rules: TaxRule[];
}

export const analysis = raw as unknown as Analysis;

const evidenceById = new Map(analysis.evidence.map((e) => [e.id, e]));
const fileById = new Map(analysis.source_files.map((f) => [f.id, f]));
const ruleById = new Map(analysis.tax_rules.map((r) => [r.id, r]));
const issueById = new Map(analysis.issues.map((i) => [i.id, i]));

export const getEvidence = (id: string) => evidenceById.get(id);
export const getFile = (id: string) => fileById.get(id);
export const getRule = (id: string) => ruleById.get(id);
export const getIssue = (id: string) => issueById.get(id);
export const getProduct = (id: string) => analysis.products.find((p) => p.id === id);

/** Prefix a public file path with the deployment base path (e.g. GitHub Pages project sites). */
export function withBase(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/${path}`.replace(/\/{2,}/g, "/");
}

/** $83.7K / $1.2M with no false precision. */
export function money(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

/** $83,727 - exact, for calculations. */
export function dollars(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const PAGE_HREF: Record<string, string> = {
  eligibility: "/eligibility",
  credits: "/credits",
  products: "/products",
  "missing-information": "/missing-information",
};
