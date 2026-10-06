# Volterra Battery Systems, Inc. - data package for 2026

FICTIONAL DATA. Every company, person, address, identifier and transaction in this package is synthetic.

## About Volterra

Volterra Battery Systems, Inc. manufactures lithium-ion battery cells at one plant, the Volterra Holland Cell Plant in
Holland, Michigan. It started production in 2026 and makes two cells:

- **VX-2170** - a 21700 cylindrical NMC cell sold to power-tool and e-bike makers.
- **VX-LFP50** - a 50 Ah-class prismatic LFP cell sold to a stationary-storage integrator.

Volterra buys cathode active material, graphite anode material, separator, electrolyte and cell cans/cases from outside
suppliers, coats its own electrodes and assembles the cells.

## What is in each folder

| Folder | Source system | Contents |
|---|---|---|
| `COMPANY/` | Corporate tax records | Legal entity, tax year, facility address and the plant codes each system uses |
| `PLM/` | Product lifecycle management | Product master (attributes by revision) and bill of materials |
| `MES/` | Manufacturing execution system | Item master, production orders (one finished lot each) and material consumption (lot genealogy) |
| `ERP/` | Enterprise resource planning | Vendor master, purchase price list and invoice lines (Jan 2026 - mid-Jan 2027) |
| `QUALITY/` | Quality document repository | Cell qualification test reports |
| `SUPPLIER_EVIDENCE/` | Procurement document store | Supplier attestations, declarations, questionnaires and certificates |

## Identifiers differ between systems

Each system uses its own keys. They can be reconciled through cross-reference fields:

| Thing | PLM | ERP | MES | Where the link is |
|---|---|---|---|---|
| 21700 cell | VX-2170 | MAT-10004721 | VX2170_R7 | PLM `ERP_MATERIAL_NO`; MES `plm_part_ref` |
| Prismatic cell | VX-LFP50 | MAT-10004755 | LFP50-PR-A | PLM `ERP_MATERIAL_NO`; MES `plm_part_ref` |
| Plant | - | MI01 (`WERKS`) | HOLLAND-01 (`site`) | `COMPANY/company_and_facility.xlsx`, Facilities sheet |
| Purchased materials | RM-... (BOM `COMPONENT_ITEM`) | MAT-3000... | MAT-3000... | BOM `ERP_MATERIAL_NO` |
| Finished lot | - | `CHARG` on invoices | `lot_id` | same value |

Units also differ: the BOM states grams and square meters per cell, while MES records consumption in kilograms and
square meters. MES `routing_version` is not the PLM engineering revision. Dates are ISO in MES, MM/DD/YYYY in ERP
invoices and Excel dates in PLM.

## How the records relate

```
PLM product (revision, effective dates) --BOM--> purchased materials --ERP material--> supplier (vendor master)
      |                                                                                      |
      +--ERP_MATERIAL_NO / plm_part_ref                                    supplier documents (SUPPLIER_EVIDENCE)
      v
MES production order --lot_id--> material consumption (which supplier lots, received when)
      |
      +--lot_id = CHARG--> ERP invoice line (customer, date, quantity)
      |
QUALITY test report (product + revision) --> technical specifications
```

## Worked example: tracing one VX-2170 lot

1. **Product definition** - `PLM/product_master.xlsx`: VX-2170 revision B, effective 2026-01-15, 3.6 V, 5.0 Ah, ERP material MAT-10004721.
2. **Bill of materials** - `PLM/bom.xlsx`: VX-2170 rev B contains RM-CAM-811 (24.5 g NMC811 per cell, ERP MAT-30000102) inside cathode electrode SA-CE-2170.
3. **Supplier** - `ERP/supplier_master.xlsx`: MAT-30000102 is supplied by Great Plains Cathode LLC (vendor 0000100231, Lincoln, NE).
4. **Production** - `MES/production_orders.csv`: order MO-26-0101 (ERP order 1000231) produced lot V21260209, 4,812 good cells, 2026-02-09 to 2026-02-20 at site HOLLAND-01.
5. **Actual material used** - `MES/material_consumption.csv`: lot V21260209 consumed 122.5000 KG of MAT-30000102 from supplier lot GPC2602-001, received 2026-02-04.
6. **Sale** - `ERP/sales.csv`: invoice 90041208 on 02/26/2026 shipped 1,000 cells of MAT-10004721 from batch V21260209 to Northgate E-Bike Co..
7. **Supporting evidence** -
   - `QUALITY/VX2170_RevB_Qualification_Report.pdf` (rated capacity page 3, voltage and volume page 2);
   - `SUPPLIER_EVIDENCE/GreatPlainsCathode_Supplier_Attestation_2026.pdf` (manufacturing site, ownership and coverage page 1, signature page 2).
