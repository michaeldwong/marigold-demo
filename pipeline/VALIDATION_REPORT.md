# Validation report: customer-data analysis vs internal test oracle

The analysis in `lib/analysis/dashboard_analysis.json` was produced from customer-provided files only. This report compares it with `ground_truth.json` / `expected_results.md` / `intentional_issues.md` for validation. Nothing here was used to produce the analysis.

**Result:** 16/16 comparisons match; 0 hidden-truth leaks; 0 unsupported conclusions; pipeline reads internal files: no.

## Calculations and expected findings

| Area | Result | Detail |
|---|---|---|
| Total credit (low) | MATCH | analysis $83,727.00 vs oracle $83,727.00 |
| Total credit (high) | MATCH | analysis $85,295.00 vs oracle $85,295.00 |
| VX-2170 credit range | MATCH | analysis $29,295.00-$29,295.00 vs oracle $29,295.00-$29,295.00 |
| VX-2170 cells sold 2026 | MATCH | 46,500 vs 46,500 |
| VX-2170 production (finished-lot qty) | MATCH | 51,209 vs 51,209 |
| VX-LFP50 credit range | MATCH | analysis $54,432.00-$56,000.00 vs oracle $54,432.00-$56,000.00 |
| VX-LFP50 cells sold 2026 | MATCH | 10,000 vs 10,000 |
| VX-LFP50 production (finished-lot qty) | MATCH | 12,492 vs 12,492 |
| ISS-01 identifiers reconciled | MATCH | detected |
| ISS-02 Eastbay ultimate parent unresolved (same lots) | MATCH | detected |
| ISS-03 Nordvik attestation expired (same lots) | MATCH | detected |
| ISS-04 VX-2170 revisions B/C by effectivity | MATCH | detected |
| ISS-05 no test for VX-2170 rev C (same lots) | MATCH | detected |
| ISS-06 VX-LFP50 capacity conflict, range shown | MATCH | detected |
| ISS-07 62-cell production mismatch | MATCH | detected |
| ISS-08 B-grade invoice excluded and flagged | MATCH | detected |

## Findings not in the oracle (not false positives - each is grounded in a cited 45X rule)

- **CRITICAL** Foreign-entity sourcing test has not been performed - rule(s) R-MATERIAL-ASSISTANCE. For 2026, a cell does not qualify if it includes 'material assistance' from a prohibited foreign entity. The documents available to Marigold state this restriction but not the method for testing it, and supplier evidence is incomplete for 2 supplier(s).
- **MEDIUM** §48C status of the Holland plant not documented - rule(s) R-48C. Nothing in the company records says whether any equipment at the plant received a §48C investment credit after August 16, 2022.

## Expected findings missed

- None

## Calculation differences

- None

## Unsupported conclusions

- None

## Accidental use of hidden ground truth

- None found (checked private facts that exist only in ground_truth.json).

## Method notes

- Capacity per cell is taken from the rated energy stated in each capacity test report (§1.45X-3(e)(3)(ii)-(iii)); the oracle computes nominal V x rated Ah. Both give 18.00 Wh (VX-2170) and 155.52 Wh (VX-LFP50).
- The oracle treats the material-assistance test as out of scope; the analysis surfaces it as a CRITICAL open item because the Form 7207 instructions make it a 2026 eligibility condition but the repository lacks the test method.
- The oracle has no §48C item; the analysis flags it because Form 7207 line 6 requires the answer and the company records are silent.
