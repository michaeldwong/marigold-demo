#!/usr/bin/env python3
"""Compare the customer-data analysis with the dataset's internal test oracle (validation only).

Run AFTER pipeline/analyze_customer_files.py. Reads lib/analysis/dashboard_analysis.json and the
INTERNAL_TEST_ONLY files, and writes pipeline/VALIDATION_REPORT.md. Nothing here feeds back into
the customer-facing analysis.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ANALYSIS = json.loads((REPO / "lib" / "analysis" / "dashboard_analysis.json").read_text())
GT = json.loads((REPO / "data/volterra_synthetic/volterra_synthetic_data/INTERNAL_TEST_ONLY/ground_truth.json").read_text())
EXP = GT["expected"]
rows: list[tuple[str, str, str]] = []  # (area, result, detail)


def rec(area: str, ok: bool, detail: str) -> None:
    rows.append((area, "MATCH" if ok else "DIFFERENCE", detail))


issues = ANALYSIS["issues"]
by_title = lambda s: [i for i in issues if s in i["title"]]  # noqa: E731
prod = {p["id"]: p for p in ANALYSIS["products"]}
cs = ANALYSIS["credit_summary"]

# ---- calculations
rec("Total credit (low)", math.isclose(cs["estimate"], EXP["credit_total"]["low"], abs_tol=0.01), f"analysis ${cs['estimate']:,.2f} vs oracle ${EXP['credit_total']['low']:,.2f}")
rec("Total credit (high)", math.isclose(cs["upper"], EXP["credit_total"]["high"], abs_tol=0.01), f"analysis ${cs['upper']:,.2f} vs oracle ${EXP['credit_total']['high']:,.2f}")
for b in cs["by_product"]:
    o = EXP["credit"][b["product"]]
    rec(f"{b['product']} credit range", math.isclose(b["amount"], o["low"], abs_tol=0.01) and math.isclose(b["upper"], o["high"], abs_tol=0.01),
        f"analysis ${b['amount']:,.2f}-${b['upper']:,.2f} vs oracle ${o['low']:,.2f}-${o['high']:,.2f}")
    rec(f"{b['product']} cells sold 2026", prod[b["product"]]["sales"]["cells"] == EXP["sales"][b["product"]]["qty_2026"],
        f"{prod[b['product']]['sales']['cells']:,} vs {EXP['sales'][b['product']]['qty_2026']:,}")
    rec(f"{b['product']} production (finished-lot qty)", prod[b["product"]]["production"]["cells"] == EXP["production"][b["product"]]["finished_lot_good"],
        f"{prod[b['product']]['production']['cells']:,} vs {EXP['production'][b['product']]['finished_lot_good']:,}")

# ---- expected findings
lots = EXP["lots_by_issue"]
def affected_lots(i): return sorted(a for a in i["affected"] if a[:3] in ("V21", "LP5"))

checks = {
    "ISS-01 identifiers reconciled": all(p["identifiers"]["erp"] == GT["identifier_mappings"][pid]["erp_material"]
                                         and p["identifiers"]["mes"] == GT["identifier_mappings"][pid]["mes_item"] for pid, p in prod.items()),
    "ISS-02 Eastbay ultimate parent unresolved (same lots)": bool(by_title("Eastbay")) and affected_lots(by_title("Eastbay")[0]) == sorted(lots["ISS-02"]),
    "ISS-03 Nordvik attestation expired (same lots)": bool(by_title("Nordvik")) and affected_lots(by_title("Nordvik")[0]) == sorted(lots["ISS-03"]),
    "ISS-04 VX-2170 revisions B/C by effectivity": [r["rev"] for r in prod["VX-2170"]["revisions"]] == ["B", "C"] and bool(prod["VX-2170"]["revision_changes"]),
    "ISS-05 no test for VX-2170 rev C (same lots)": bool(by_title("revision C")) and affected_lots(by_title("revision C")[0]) == sorted(lots["ISS-05"]),
    "ISS-06 VX-LFP50 capacity conflict, range shown": bool(by_title("VX-LFP50 capacity")) and prod["VX-LFP50"]["status"] == "review",
    "ISS-07 62-cell production mismatch": any("V21260706" in i["affected"] and "62" in i["description"] for i in issues),
    "ISS-08 B-grade invoice excluded and flagged": bool(by_title("Unidentified product")) and any(x["reason"] == "Product could not be identified" for x in cs["excluded_sales"]),
}
for k, ok in checks.items():
    rec(k, ok, "detected" if ok else "MISSED")

# ---- extra findings not in the oracle
oracle_like = ("Eastbay", "Nordvik", "revision C", "VX-LFP50 capacity", "Production count", "Unidentified product")
extra = [i for i in issues if not any(s in i["title"] for s in oracle_like)]

# ---- accidental use of hidden truth / unsupported conclusions
blob = json.dumps(ANALYSIS).lower()
secrets = {"Eastbay true ultimate parent": next(s["true_ultimate_parent"] for s in GT["suppliers"] if s["erp_id"] == "0000100268"),
           "Nordvik renewal note": "never sent", "Double-posting explanation": "confirmed twice", "B-grade true origin": "set aside from 2026 scrap"}
leaks = [k for k, v in secrets.items() if v.lower() in blob]
pipeline_src = (REPO / "pipeline/analyze_customer_files.py").read_text()
reads_internal = "ground_truth" in pipeline_src or "expected_results" in pipeline_src or "intentional_issues" in pipeline_src
unsupported = []
if ANALYSIS["eligibility"]["status"] == "eligible":
    unsupported.append("Overall eligibility shown as established despite open issues")
if prod["VX-LFP50"]["status"] == "supported":
    unsupported.append("VX-LFP50 marked supported despite conflicting capacity")

matches = sum(r[1] == "MATCH" for r in rows)
md = ["# Validation report: customer-data analysis vs internal test oracle", "",
      "The analysis in `lib/analysis/dashboard_analysis.json` was produced from customer-provided files only. This report compares it with "
      "`ground_truth.json` / `expected_results.md` / `intentional_issues.md` for validation. Nothing here was used to produce the analysis.", "",
      f"**Result:** {matches}/{len(rows)} comparisons match; {len(leaks)} hidden-truth leaks; {len(unsupported)} unsupported conclusions; "
      f"pipeline reads internal files: {'YES' if reads_internal else 'no'}.", "",
      "## Calculations and expected findings", "", "| Area | Result | Detail |", "|---|---|---|"]
md += [f"| {a} | {r} | {d} |" for a, r, d in rows]
md += ["", "## Findings not in the oracle (not false positives - each is grounded in a cited 45X rule)", ""]
md += [f"- **{i['severity']}** {i['title']} - rule(s) {', '.join(i['rule_refs'])}. {i['description']}" for i in extra] or ["- None"]
md += ["", "## Expected findings missed", ""] + ([f"- {k}" for k, ok in checks.items() if not ok] or ["- None"])
md += ["", "## Calculation differences", ""] + ([f"- {a}: {d}" for a, r, d in rows if r == "DIFFERENCE" and ("credit" in a or "sold" in a or "production" in a)] or ["- None"])
md += ["", "## Unsupported conclusions", ""] + ([f"- {u}" for u in unsupported] or ["- None"])
md += ["", "## Accidental use of hidden ground truth", ""] + ([f"- Leak: {l}" for l in leaks] or ["- None found (checked private facts that exist only in ground_truth.json)."])
md += ["", "## Method notes", "",
       "- Capacity per cell is taken from the rated energy stated in each capacity test report (§1.45X-3(e)(3)(ii)-(iii)); the oracle "
       "computes nominal V x rated Ah. Both give 18.00 Wh (VX-2170) and 155.52 Wh (VX-LFP50).",
       "- The oracle treats the material-assistance test as out of scope; the analysis surfaces it as a CRITICAL open item because the "
       "Form 7207 instructions make it a 2026 eligibility condition but the repository lacks the test method.",
       "- The oracle has no §48C item; the analysis flags it because Form 7207 line 6 requires the answer and the company records are silent."]
(REPO / "pipeline" / "VALIDATION_REPORT.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print("\n".join(md[:8]))
