# Expected results (INTERNAL - TEST ONLY)

What a correctly functioning Marigold prototype should conclude from the customer-facing files for tax year 2026.
All numbers below were computed by `generate_dataset.py`; `validate_dataset.py` recomputes them from the files.

Three layers are kept separate throughout:

1. **True** - what `ground_truth.json` says actually happened.
2. **Established** - what can be shown from the customer-facing files.
3. **Unresolved** - what the customer files cannot establish. Marigold must flag these, not resolve them from the ground truth.

Status vocabulary: `SUPPORTED`, `RESOLVED_BY_CROSS_REFERENCE`, `RESOLVED_BY_EFFECTIVITY`, `MISSING_EVIDENCE_REQUIRES_REVIEW`,
`EXPIRED_EVIDENCE_REQUIRES_REVIEW`, `CONFLICTING_EVIDENCE_REQUIRES_REVIEW`, `DISCREPANCY_REQUIRES_REVIEW`,
`EXCLUDED_UNMATCHED_REQUIRES_REVIEW`, `NOT_COMPUTED_REQUIRES_REVIEW`.

## 1. Summary

| Conclusion | Expected value | Status |
|---|---|---|
| Claimant | Volterra Battery Systems, Inc. | SUPPORTED |
| Facility | Volterra Holland Cell Plant, Holland, MI (United States) | SUPPORTED |
| Claimed component type | Battery cells only (VX-2170, VX-LFP50) | SUPPORTED |
| VX-2170 cells sold in 2026 | 46,500 | SUPPORTED |
| VX-LFP50 cells sold in 2026 | 10,000 | SUPPORTED |
| VX-2170 estimated credit | $29,295.00 | Partly SUPPORTED, partly requires review |
| VX-LFP50 estimated credit | $54,432.00 to $56,000.00 | CONFLICTING_EVIDENCE_REQUIRES_REVIEW |
| **Total estimated credit** | **$83,727.00 to $85,295.00** | Requires review |
| Credit on lots with no open issues | $15,085.35 | SUPPORTED |
| Material-assistance (PFE) test | Inputs provided, no pass/fail | NOT_COMPUTED_REQUIRES_REVIEW |

## 2. Claimant and facility

- **Conclusion:** Volterra Battery Systems, Inc. is the claimant; it owns and operates the only facility, Volterra Holland Cell Plant, 4100 Lakeshore Industrial Drive, Holland, MI 49423, United States.
- **Status:** SUPPORTED. **Human review:** No.
- **Evidence:** `COMPANY/company_and_facility.xlsx` (LegalEntity and Facilities sheets); MES `site` = HOLLAND-01 and ERP `WERKS` = MI01 map to FAC-001 (ISS-01).
- **Related parties:** the LegalEntity sheet lists no parent, subsidiaries or affiliates, and none of the four customers is a Volterra entity, so all sales are to unrelated persons (SUPPORTED).

## 3. Product identity (ISS-01)

| PLM | ERP material | MES item | Reconciled via | Status |
|---|---|---|---|---|
| VX-2170 | MAT-10004721 | VX2170_R7 | product_master ERP_MATERIAL_NO; item_master plm_part_ref | RESOLVED_BY_CROSS_REFERENCE |
| VX-LFP50 | MAT-10004755 | LFP50-PR-A | product_master ERP_MATERIAL_NO; item_master plm_part_ref | RESOLVED_BY_CROSS_REFERENCE |

`MAT-10004759` (VXLFP50 CELL B-GRADE) appears only in `ERP/sales.csv` and does not reconcile to any product (ISS-08).

## 4. Preliminary eligibility by product

Battery-cell definition tests (Form 7207 instructions, line 5a; see `tax_rules.py`): at least 12 Wh, at least 100 Wh/L, capacity-to-power ratio at most 100:1.

### VX-2170 (cylindrical NMC)

| Fact | Value | Evidence | Status |
|---|---|---|---|
| Nominal voltage | 3.6 V | QUALITY/VX2170_RevB_Qualification_Report.pdf p.2 | SUPPORTED (rev B) |
| Rated capacity | 5.0 Ah | same report p.3; PLM RATED_CAPACITY_AH | SUPPORTED for rev B; MISSING for rev C (ISS-05) |
| Energy per cell | 18.0 Wh (>= 12 Wh) | derived | SUPPORTED (rev B) |
| Volumetric energy density | 742.4 Wh/L (>= 100) | report p.3 (external volume p.2) | SUPPORTED (rev B) |
| Capacity-to-power ratio | 0.25 : 1 (<= 100) | report p.4 | SUPPORTED (rev B) |
| Produced in the U.S. | Holland, MI | MES site HOLLAND-01 -> company file | SUPPORTED |

- **Conclusion:** meets the battery-cell definition on revision B evidence. Revision C lots (V21260706, V21260817, V21261005, V21261130) lack a qualification report.
- **Expected status:** revision B lots SUPPORTED; revision C lots MISSING_EVIDENCE_REQUIRES_REVIEW (ISS-05), plus supplier issues ISS-02 and ISS-03.

### VX-LFP50 (prismatic LFP)

| Fact | PLM value | Test report value (draft) | Status |
|---|---|---|---|
| Rated capacity | 50.0 Ah | 48.6 Ah (p.3) | CONFLICTING_EVIDENCE_REQUIRES_REVIEW (ISS-06) |
| Energy per cell | 160.0 Wh | 155.52 Wh | both >= 12 Wh |
| Volumetric energy density | 396.4 Wh/L | 385.3 Wh/L | both >= 100 Wh/L |
| Capacity-to-power ratio | 1.0 : 1 | 0.972 : 1 | both <= 100:1 |

- **Conclusion:** meets the battery-cell definition under either capacity value, but the credit amount depends on which value is correct, and the only test evidence is an unapproved draft.
- **Expected status:** CONFLICTING_EVIDENCE_REQUIRES_REVIEW for all VX-LFP50 lots. **Human review:** Yes.

## 5. Production (2026)

| MES order | Lot | Product | BOM rev | Start | End | Planned | MES qty_good | Finished-lot qty | Scrap | Open issues on lot |
|---|---|---|---|---|---|---|---|---|---|---|
| MO-26-0101 | V21260209 | VX-2170 | B | 2026-02-09 | 2026-02-20 | 5,000 | 4,812 | 4,812 | 188 | none |
| MO-26-0114 | V21260309 | VX-2170 | B | 2026-03-09 | 2026-03-20 | 6,000 | 5,874 | 5,874 | 126 | none |
| MO-26-0132 | V21260406 | VX-2170 | B | 2026-04-06 | 2026-04-17 | 6,500 | 6,391 | 6,391 | 109 | none |
| MO-26-0157 | V21260526 | VX-2170 | B | 2026-05-26 | 2026-06-12 | 7,000 | 6,868 | 6,868 | 132 | none |
| MO-26-0163 | LP5260608 | VX-LFP50 | A | 2026-06-08 | 2026-06-19 | 1,200 | 1,146 | 1,146 | 54 | ISS-06 |
| MO-26-0171 | V21260706 | VX-2170 | C | 2026-07-06 | 2026-07-17 | 6,500 | 6,212 | 6,150 | 288 | ISS-02, ISS-03, ISS-05, ISS-07 |
| MO-26-0172 | LP5260706 | VX-LFP50 | A | 2026-07-06 | 2026-07-17 | 1,500 | 1,452 | 1,452 | 48 | ISS-03, ISS-06 |
| MO-26-0188 | LP5260803 | VX-LFP50 | A | 2026-08-03 | 2026-08-14 | 1,800 | 1,761 | 1,761 | 39 | ISS-03, ISS-06 |
| MO-26-0195 | V21260817 | VX-2170 | C | 2026-08-17 | 2026-08-28 | 7,000 | 6,905 | 6,905 | 95 | ISS-02, ISS-03, ISS-05 |
| MO-26-0209 | LP5260908 | VX-LFP50 | A | 2026-09-08 | 2026-09-18 | 2,000 | 1,958 | 1,958 | 42 | ISS-03, ISS-06 |
| MO-26-0221 | V21261005 | VX-2170 | C | 2026-10-05 | 2026-10-16 | 7,000 | 6,887 | 6,887 | 113 | ISS-02, ISS-03, ISS-05 |
| MO-26-0222 | LP5261005 | VX-LFP50 | A | 2026-10-05 | 2026-10-16 | 2,000 | 1,972 | 1,972 | 28 | ISS-03, ISS-06 |
| MO-26-0240 | LP5261102 | VX-LFP50 | A | 2026-11-02 | 2026-11-13 | 2,200 | 2,163 | 2,163 | 37 | ISS-03, ISS-06 |
| MO-26-0258 | V21261130 | VX-2170 | C | 2026-11-30 | 2026-12-11 | 7,500 | 7,322 | 7,322 | 178 | ISS-02, ISS-03, ISS-05 |
| MO-26-0259 | LP5261201 | VX-LFP50 | A | 2026-12-01 | 2026-12-11 | 2,100 | 2,040 | 2,040 | 60 | ISS-03, ISS-06 |

| Product | Orders | Planned | MES reported good | Finished-lot good (use this) | Scrap |
|---|---|---|---|---|---|
| VX-2170 | 8 | 52,500 | 51,271 | 51,209 | 1,229 |
| VX-LFP50 | 7 | 12,800 | 12,492 | 12,492 | 308 |

- **Known discrepancy:** MO-26-0171 reports 6,212 good cells, the finished lot shows 6,150 (ISS-07).

## 6. Sales (2026)

| Product | 2026 invoices | 2026 lines | Cells sold in 2026 | Revenue 2026 | Ending inventory 12/31/2026 | Jan 2027 cells (excluded) |
|---|---|---|---|---|---|---|
| VX-2170 | 16 | 23 | 46,500 | $180,425.00 | 4,709 | 3,800 (invoices 90041232) |
| VX-LFP50 | 7 | 12 | 10,000 | $580,000.00 | 2,492 | 1,500 (invoices 90041231) |

- `ERP/sales.csv` contains 26 invoices (39 lines), of which 24 invoices (36 lines) are dated 2026.
- Invoices dated January 2027 are outside the tax year and must be excluded (scope rule, not an intentional issue).
- Invoice 90041233 (140 x MAT-10004759, $1,260.00) is excluded and flagged (ISS-08).
- Cumulative cells sold never exceed cumulative finished-lot output available before each invoice date (checked by the validator).

## 7. Credit calculation

Rule inputs (`tax_rules.py`): $35.00/kWh for battery cells, phase-out factor 100% for 2026 sales, kWh per cell = nominal V x rated Ah / 1000 (assumption A1).

| Product | Capacity basis | Rated Ah | kWh per cell | Cells sold 2026 | Total kWh | Estimated credit | On lots with no open issues | On lots with open issues |
|---|---|---|---|---|---|---|---|---|
| VX-2170 | PLM = test report | 5.0 | 0.018 | 46,500 | 837.0 | $29,295.00 | $15,085.35 | $14,209.65 |
| VX-LFP50 | PLM value | 50.0 | 0.16 | 10,000 | 1,600.0 | $56,000.00 | $0.00 | $56,000.00 |
| VX-LFP50 | Draft test report | 48.6 | 0.15552 | 10,000 | 1,555.2 | $54,432.00 | $0.00 | $54,432.00 |

- **Total estimated credit:** $83,727.00 (test-report basis) to $85,295.00 (PLM basis). Status: requires review.
- **Credit with no open issues:** $15,085.35 - VX-2170 sales allocated to lots with no open issues (V21260209, V21260309, V21260406, V21260526).
- **Credit touched by each open issue (PLM basis, overlapping):** ISS-02 $14,209.65; ISS-03 $63,792.05; ISS-05 $14,209.65; ISS-06 $56,000.00; ISS-07 $3,874.50

## 8. Evidence and substantiation status by lot

| Lot | Product | BOM rev | Open issues | Lot status |
|---|---|---|---|---|
| V21260209 | VX-2170 | B | none | SUPPORTED |
| V21260309 | VX-2170 | B | none | SUPPORTED |
| V21260406 | VX-2170 | B | none | SUPPORTED |
| V21260526 | VX-2170 | B | none | SUPPORTED |
| LP5260608 | VX-LFP50 | A | ISS-06 | REQUIRES REVIEW |
| V21260706 | VX-2170 | C | ISS-02, ISS-03, ISS-05, ISS-07 | REQUIRES REVIEW |
| LP5260706 | VX-LFP50 | A | ISS-03, ISS-06 | REQUIRES REVIEW |
| LP5260803 | VX-LFP50 | A | ISS-03, ISS-06 | REQUIRES REVIEW |
| V21260817 | VX-2170 | C | ISS-02, ISS-03, ISS-05 | REQUIRES REVIEW |
| LP5260908 | VX-LFP50 | A | ISS-03, ISS-06 | REQUIRES REVIEW |
| V21261005 | VX-2170 | C | ISS-02, ISS-03, ISS-05 | REQUIRES REVIEW |
| LP5261005 | VX-LFP50 | A | ISS-03, ISS-06 | REQUIRES REVIEW |
| LP5261102 | VX-LFP50 | A | ISS-03, ISS-06 | REQUIRES REVIEW |
| V21261130 | VX-2170 | C | ISS-02, ISS-03, ISS-05 | REQUIRES REVIEW |
| LP5261201 | VX-LFP50 | A | ISS-03, ISS-06 | REQUIRES REVIEW |

## 9. Supplier issues

| Supplier | Material | Evidence on file | Expected status |
|---|---|---|---|
| Great Plains Cathode LLC | MAT-30000102 | GreatPlainsCathode_Supplier_Attestation_2026.pdf (coverage 2026-01-01 to 2026-12-31) | SUPPORTED |
| Prairie Phosphate Materials Inc. | MAT-30000108 | PrairiePhosphate_Supplier_Questionnaire_2026.pdf (coverage 2026-01-01 to 2026-12-31) | SUPPORTED |
| Kestrel Graphite Corp. | MAT-30000205 | KestrelGraphite_Supplier_Attestation_2026.pdf (coverage 2026-01-01 to 2026-12-31) | SUPPORTED |
| Tamarack Membrane Inc. | MAT-30000411 | TamarackMembrane_Supplier_Attestation_2026.pdf (coverage 2026-01-01 to 2026-12-31) | SUPPORTED |
| Eastbay Separator Co., Ltd. | MAT-30000415 | EastbaySeparator_Supplier_Declaration_2026.pdf (coverage 2026-06-01 to 2027-05-31) | MISSING_EVIDENCE_REQUIRES_REVIEW - ultimate parent not disclosed (ISS-02) |
| Nordvik Electrolyte AB | MAT-30000520 | NordvikElectrolyte_Supplier_Attestation_2025-2026.pdf (coverage 2025-07-01 to 2026-06-30) | EXPIRED_EVIDENCE_REQUIRES_REVIEW for lots received after 2026-06-30 (ISS-03) |
| Lakeshore Can & Stamping Inc. | MAT-30000610, MAT-30000655 | LakeshoreCan_Supplier_Attestation_2026.pdf (coverage 2026-01-01 to 2026-12-31) | SUPPORTED |

Electrode active materials (NMC811 and LFP cathode material, synthetic graphite) are purchased inputs. Volterra does not claim a credit for them.

## 10. Material-assistance inputs (not computed)

Status: NOT_COMPUTED_REQUIRES_REVIEW (`tax_rules.UNRESOLVED_RULES` U1). Inputs available from the customer files:

| BOM | Direct material cost per cell (purchased materials) |
|---|---|
| VX-2170 rev B | $1.30 |
| VX-2170 rev C | $1.28 |
| VX-LFP50 rev A | $10.45 |

| Supplier | Cost of material consumed in 2026 |
|---|---|
| Great Plains Cathode LLC | $48,819.78 |
| Prairie Phosphate Materials Inc. | $46,208.00 |
| Kestrel Graphite Corp. | $23,424.28 |
| Tamarack Membrane Inc. | $18,374.95 |
| Eastbay Separator Co., Ltd. | $1,923.53 |
| Nordvik Electrolyte AB | $20,233.84 |
| Lakeshore Can & Stamping Inc. | $42,510.37 |

## 11. Unresolved issues (must remain unresolved)

- **ISS-02** Eastbay Separator ultimate parent not disclosed - expected status `MISSING_EVIDENCE_REQUIRES_REVIEW`. Mark the ultimate-parent fact for Eastbay Separator as MISSING EVIDENCE and flag the lots that consumed MAT-30000415 for review. Do not state, guess or infer the ultimate parent.
- **ISS-03** Nordvik electrolyte attestation expired 2026-06-30, no renewal on file - expected status `EXPIRED_EVIDENCE_REQUIRES_REVIEW`. Mark electrolyte supplier evidence as EXPIRED for finished lots that consumed MAT-30000520 lots received after 2026-06-30, and flag those lots for review. Lots using electrolyte received on or before 2026-06-30 are supported. Do not assume a renewal exists.
- **ISS-05** No qualification report covers VX-2170 revision C - expected status `MISSING_EVIDENCE_REQUIRES_REVIEW`. Mark capacity and specification evidence for VX-2170 revision C lots as MISSING and flag for review. The estimate may use the PLM value 5.0 Ah, labelled as not supported by a test report.
- **ISS-06** VX-LFP50 rated capacity conflict: PLM 50.0 Ah vs draft test report 48.6 Ah - expected status `CONFLICTING_EVIDENCE_REQUIRES_REVIEW`. Mark VX-LFP50 rated capacity as CONFLICTING, show the credit under both values ($54,432.00 to $56,000.00), mark neither as supported, and flag for review.
- **ISS-07** MES order confirmation exceeds finished-lot quantity for MO-26-0171 by 62 cells - expected status `DISCREPANCY_REQUIRES_REVIEW`. Flag the 62-cell discrepancy on MO-26-0171 for review and use the finished-lot quantity (6150) for available-to-sell calculations, showing both values.
- **ISS-08** B-grade invoice line cannot be linked to an eligible product or production lot - expected status `EXCLUDED_UNMATCHED_REQUIRES_REVIEW`. Exclude the line from the credit estimate and flag it for review as an unmatched sales record. Do not map it to VX-LFP50 based on the description.
