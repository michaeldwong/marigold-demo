# Customer-data analysis summary (internal)

Produced by `pipeline/analyze_customer_files.py` from customer-provided files only. No `INTERNAL_TEST_ONLY` file was read.

- **Claimant:** Volterra Battery Systems, Inc. (C corporation, Delaware); parent: None; affiliates: None
- **Facility:** Volterra Holland Cell Plant, 4100 Lakeshore Industrial Drive, Holland, MI 49423, United States (ERP MI01, MES HOLLAND-01)
- **Eligibility:** Volterra appears to qualify, but eligibility cannot yet be fully established. 4 of 7 requirements are satisfied by the files provided. 3 need more information or review.
- **Estimated 2026 credit:** $83,727.00 (up to $85,295.00)

| Product | Revisions | Produced (lot qty) | Sold 2026 | Capacity used | Credit | Upper |
|---|---|---|---|---|---|---|
| VX-2170 | B, C | 51,209 | 46,500 | 18.00 Wh = 0.01800 kWh | $29,295.00 | $29,295.00 |
| VX-LFP50 | A | 12,492 | 10,000 | 155.52 Wh = 0.15552 kWh | $54,432.00 | $56,000.00 |

## Requirements

- `review` Products are battery cells that meet the technical definition: Every tested product clears the thresholds by a wide margin: VX-2170 rev B: 18.0 Wh, 742 Wh/L, capacity-to-power 0.25:1; VX-LFP50 rev A: 155.5 Wh, 385 Wh/L, capacity-to-power 0.97:1 (draft report). Some test evidence is missing or unapproved.
- `satisfied` Volterra makes the cells itself: Volterra makes its own cathode and anode electrodes from purchased materials and assembles the cells itself (15 production orders in 2026, all at its own plant).
- `satisfied` Cells are made in the United States: All 15 production orders ran at Volterra Holland Cell Plant, 4100 Lakeshore Industrial Drive, Holland, MI 49423.
- `satisfied` Cells were sold in 2026 to unrelated customers: 23 invoices in 2026 to 3 customers. Company records list no parent or affiliates. 2 January 2027 invoices are outside the tax year and excluded.
- `satisfied` Volterra is not a restricted foreign entity: Volterra Battery Systems, Inc. is a Delaware C corporation with no parent company listed.
- `review` Materials do not come from restricted foreign sources: This test has not been performed. The method is not in the documents available, and ownership or attestation evidence is incomplete for: Eastbay Separator Co., Ltd., Nordvik Electrolyte AB.
- `review` No overlapping §48C investment credit: The company records do not address §48C.

## Issues

- **CRITICAL** [SUPPLY CHAIN / SUPPLIER] Foreign-entity sourcing test has not been performed (credit affected $83,727.00)
- **HIGH** [SUPPLY CHAIN / SUPPLIER] Nordvik Electrolyte AB: supplier attestation expired (credit affected $62,403.74)
- **HIGH** [PRODUCT / TECHNICAL] VX-LFP50 capacity is not settled (credit affected $54,432.00)
- **HIGH** [PRODUCT / TECHNICAL] No capacity test for VX-2170 revision C (credit affected $14,209.65)
- **HIGH** [SUPPLY CHAIN / SUPPLIER] Eastbay Separator Co., Ltd.: ultimate parent unresolved (credit affected $14,209.65)
- **MEDIUM** [CORPORATE / CLAIMANT] §48C status of the Holland plant not documented (credit affected $83,727.00)
- **MEDIUM** [SALES / TRANSACTIONS] Unidentified product on invoice 90041233 (credit affected $0.00)
- **LOW** [PRODUCTION / RECONCILIATION] Production count mismatch on lot V21260706 (credit affected $0.00)

## Excluded sales

- Invoice 90041231 (01/08/2027): 1,500 cells - Sold in January 2027, outside the 2026 tax year
- Invoice 90041232 (01/12/2027): 3,800 cells - Sold in January 2027, outside the 2026 tax year
- Invoice 90041233 (11/24/2026): 140 cells - Product could not be identified
