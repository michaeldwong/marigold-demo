# Intentional issues (INTERNAL - TEST ONLY)

Every deliberately introduced discrepancy or gap in the customer-facing dataset. There are exactly 8; `validate_dataset.py` checks that the files contain these and no others.

Each issue has exactly one expected Marigold behavior. Marigold must never use information that exists only in `ground_truth.json`; where evidence is missing or conflicting, the expected behavior is to flag for review.

## ISS-01 - Product and site identifiers differ across PLM, MES and ERP

- **Category:** Identity reconciliation
- **What was planted:** Each product has a different identifier in each system: VX-2170: PLM VX-2170 / ERP MAT-10004721 / MES VX2170_R7; VX-LFP50: PLM VX-LFP50 / ERP MAT-10004755 / MES LFP50-PR-A. The plant is ERP plant MI01 and MES site HOLLAND-01.
- **Why it is realistic:** PLM, ERP and MES are administered by different teams and assign their own keys.
- **Private truth (ground_truth.json only):** The identifiers refer to the same two products and the same plant.
- **What the customer-facing evidence shows:** PLM/product_master.xlsx ERP_MATERIAL_NO; MES/item_master.csv plm_part_ref; ERP descriptions contain the PLM number; COMPANY/company_and_facility.xlsx Facilities sheet maps ERP_PLANT to MES_SITE.
- **Expected Marigold behavior (the one correct behavior):** Reconcile each product and the plant to a single identity using the cross-references in the customer files, and show the mapping with its source fields.
- **Expected status:** `RESOLVED_BY_CROSS_REFERENCE`
- **Human review expected:** No
- **Affected records:** VX-2170, VX-LFP50

## ISS-02 - Eastbay Separator ultimate parent not disclosed

- **Category:** Supplier ownership - missing evidence
- **What was planted:** SUPPLIER_EVIDENCE/EastbaySeparator_Supplier_Declaration_2026.pdf page 1 states 'Ultimate parent: Not disclosed - confidential'; ERP supplier master notes only the Singapore immediate parent.
- **Why it is realistic:** Foreign suppliers commonly disclose the immediate holding company but decline to identify beneficial owners.
- **Private truth (ground_truth.json only):** Ultimate parent is Huaying Advanced Materials Group Co., Ltd. (China), 62% indirect ownership. This appears ONLY in ground_truth.json.
- **What the customer-facing evidence shows:** Immediate parent Eastbay Holdings Pte. Ltd. (Singapore). Ultimate parent not disclosed.
- **Expected Marigold behavior (the one correct behavior):** Mark the ultimate-parent fact for Eastbay Separator as MISSING EVIDENCE and flag the lots that consumed MAT-30000415 for review. Do not state, guess or infer the ultimate parent.
- **Expected status:** `MISSING_EVIDENCE_REQUIRES_REVIEW`
- **Human review expected:** Yes
- **Affected records:** V21260706, V21260817, V21261005, V21261130

## ISS-03 - Nordvik electrolyte attestation expired 2026-06-30, no renewal on file

- **Category:** Supplier evidence - expired
- **What was planted:** SUPPLIER_EVIDENCE/NordvikElectrolyte_Supplier_Attestation_2025-2026.pdf covers materials delivered through 2026-06-30. No later Nordvik attestation exists in the customer files.
- **Why it is realistic:** Annual supplier attestations lapse when procurement does not chase renewals.
- **Private truth (ground_truth.json only):** A renewal for 2026-07-01 to 2027-06-30 was signed by Nordvik but never sent to Volterra.
- **What the customer-facing evidence shows:** Electrolyte lots in MES/material_consumption.csv with component_lot_received after 2026-06-30 are not covered by any attestation on file.
- **Expected Marigold behavior (the one correct behavior):** Mark electrolyte supplier evidence as EXPIRED for finished lots that consumed MAT-30000520 lots received after 2026-06-30, and flag those lots for review. Lots using electrolyte received on or before 2026-06-30 are supported. Do not assume a renewal exists.
- **Expected status:** `EXPIRED_EVIDENCE_REQUIRES_REVIEW`
- **Human review expected:** Yes
- **Affected records:** V21260706, LP5260706, LP5260803, V21260817, LP5260908, V21261005, LP5261005, LP5261102, V21261130, LP5261201

## ISS-04 - VX-2170 BOM revision C effective 2026-07-01 (separator change)

- **Category:** Effective-dated BOM
- **What was planted:** PLM/bom.xlsx and PLM/product_master.xlsx contain VX-2170 revision B (2026-01-15 to 2026-06-30) and revision C (from 2026-07-01, ECN-2026-031). Revision C replaces RM-SEP-016 (Tamarack) with RM-SEP-021 (Eastbay).
- **Why it is realistic:** Engineering change notices switch suppliers mid-year for cost reasons.
- **Private truth (ground_truth.json only):** Lots started on or after 2026-07-01 were built to revision C; MES consumption confirms MAT-30000415 was used.
- **What the customer-facing evidence shows:** BOM effectivity dates; MES consumption of MAT-30000415 only on lots started on or after 2026-07-01.
- **Expected Marigold behavior (the one correct behavior):** Assign each VX-2170 lot to the BOM revision in effect on its production start date and evaluate supplier evidence against that revision's materials.
- **Expected status:** `RESOLVED_BY_EFFECTIVITY`
- **Human review expected:** No
- **Affected records:** V21260209, V21260309, V21260406, V21260526, V21260706, V21260817, V21261005, V21261130

## ISS-05 - No qualification report covers VX-2170 revision C

- **Category:** Product evidence - missing
- **What was planted:** QUALITY/ contains VX2170_RevB_Qualification_Report.pdf only. Page 1 states the report applies only to revision B.
- **Why it is realistic:** Re-qualification after a material change is often scheduled but not completed before production continues.
- **Private truth (ground_truth.json only):** Revision C cells have the same rated capacity (5.0 Ah); they were simply never re-tested and documented.
- **What the customer-facing evidence shows:** No test report for VX-2170 revision C. PLM still lists 5.0 Ah for revision C.
- **Expected Marigold behavior (the one correct behavior):** Mark capacity and specification evidence for VX-2170 revision C lots as MISSING and flag for review. The estimate may use the PLM value 5.0 Ah, labelled as not supported by a test report.
- **Expected status:** `MISSING_EVIDENCE_REQUIRES_REVIEW`
- **Human review expected:** Yes
- **Affected records:** V21260706, V21260817, V21261005, V21261130

## ISS-06 - VX-LFP50 rated capacity conflict: PLM 50.0 Ah vs draft test report 48.6 Ah

- **Category:** Conflicting evidence
- **What was planted:** PLM/product_master.xlsx RATED_CAPACITY_AH = 50.0; QUALITY/VXLFP50_RevA_Qualification_Report_DRAFT.pdf page 3 'Declared rated capacity: 48.6 Ah'. The report is a draft with no reviewer signature.
- **Why it is realistic:** PLM attributes often hold the design target and are not updated after test results.
- **Private truth (ground_truth.json only):** True rated capacity is 48.6 Ah; the PLM value is a stale design target.
- **What the customer-facing evidence shows:** Two sources disagree; the only test evidence is an unapproved draft.
- **Expected Marigold behavior (the one correct behavior):** Mark VX-LFP50 rated capacity as CONFLICTING, show the credit under both values ($54,432.00 to $56,000.00), mark neither as supported, and flag for review.
- **Expected status:** `CONFLICTING_EVIDENCE_REQUIRES_REVIEW`
- **Human review expected:** Yes
- **Affected records:** LP5260608, LP5260706, LP5260803, LP5260908, LP5261005, LP5261102, LP5261201

## ISS-07 - MES order confirmation exceeds finished-lot quantity for MO-26-0171 by 62 cells

- **Category:** Quantity discrepancy
- **What was planted:** MES/production_orders.csv MO-26-0171 qty_good = 6212; MES/material_consumption.csv fg_lot_qty for lot V21260706 = 6150, and material consumed corresponds to 6150 good + 288 scrap cells.
- **Why it is realistic:** Order confirmations are sometimes double-posted after rework while the lot record is correct.
- **Private truth (ground_truth.json only):** 6150 good cells; 62 reworked cells were confirmed twice.
- **What the customer-facing evidence shows:** Two MES records disagree by 62 cells; material consumption supports the lower figure.
- **Expected Marigold behavior (the one correct behavior):** Flag the 62-cell discrepancy on MO-26-0171 for review and use the finished-lot quantity (6150) for available-to-sell calculations, showing both values.
- **Expected status:** `DISCREPANCY_REQUIRES_REVIEW`
- **Human review expected:** Yes
- **Affected records:** V21260706

## ISS-08 - B-grade invoice line cannot be linked to an eligible product or production lot

- **Category:** Unmatched / ambiguous record
- **What was planted:** ERP/sales.csv invoice 90041233: MATNR MAT-10004759 'VXLFP50 CELL B-GRADE', 140 EA to Circuit Loop Recycling LLC, no batch (CHARG blank). MAT-10004759 is not in the PLM product master or MES item master.
- **Why it is realistic:** Off-spec product is sold to recyclers under separate material numbers outside normal lot tracking.
- **Private truth (ground_truth.json only):** Downgraded VX-LFP50 cells set aside from 2026 scrap counts after failing outgoing capacity QC.
- **What the customer-facing evidence shows:** Description resembles VX-LFP50 but no identifier or lot links it to an eligible product.
- **Expected Marigold behavior (the one correct behavior):** Exclude the line from the credit estimate and flag it for review as an unmatched sales record. Do not map it to VX-LFP50 based on the description.
- **Expected status:** `EXCLUDED_UNMATCHED_REQUIRES_REVIEW`
- **Human review expected:** Yes
- **Affected records:** 90041233
