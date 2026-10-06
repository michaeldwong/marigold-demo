# Data dictionary (INTERNAL)

Every customer-facing file: the fictional source system, what it represents, keys, relationships and the Marigold facts it can support.

## `COMPANY/company_and_facility.xlsx`

- **Source system:** Corporate tax/legal records (maintained by Tax)
- **Represents:** Legal entity, synthetic EIN, tax year, facility address and identifiers, production lines.
- **Primary key:** LegalEntity: FIELD. Facilities: FACILITY_ID. ProductionLines: (FACILITY_ID, ERP_WORK_CENTER).
- **Relationships:** Facilities.ERP_PLANT -> ERP/sales.csv WERKS; Facilities.MES_SITE -> MES/production_orders.csv site; ProductionLines.MES_LINE -> production_orders.line.
- **Can support:** Claimant identity; facility is in the United States; plant identifier reconciliation; related-party status.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| LegalEntity.FIELD / VALUE | text |  | Key-value facts about the legal entity, including related entities. |
| Facilities.FACILITY_ID | text |  | Corporate facility identifier. |
| Facilities.ERP_PLANT | text |  | Plant code used by ERP (SAP-style WERKS). |
| Facilities.MES_SITE | text |  | Site code used by MES. |
| Facilities.STREET/CITY/STATE/ZIP/COUNTRY | text |  | Physical address. |
| Facilities.OWNER / OPERATOR | text |  | Entity owning / operating the plant. |
| Facilities.OPERATIONS_START | date |  | First day of operations. |
| ProductionLines.ERP_WORK_CENTER / MES_LINE / DESCRIPTION | text |  | Line identifiers in each system. |

## `PLM/product_master.xlsx`

- **Source system:** PLM (product lifecycle management) export
- **Represents:** One row per product revision with released attributes.
- **Primary key:** (PART_NUMBER, REVISION)
- **Relationships:** ERP_MATERIAL_NO -> ERP/sales.csv MATNR; PART_NUMBER -> MES/item_master.csv plm_part_ref; PART_NUMBER -> bom.xlsx TOP_ASSEMBLY.
- **Can support:** Product classification inputs (voltage, capacity, dimensions); revision effectivity; identifier mapping.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| PART_NUMBER | text |  | PLM part number of the finished cell. |
| REVISION | text |  | Engineering revision. |
| PART_NAME / DESCRIPTION | text |  | Names. |
| LIFECYCLE_STATE | text |  | Released or Superseded. |
| EFFECTIVE_FROM / EFFECTIVE_TO | date |  | Revision effectivity (blank TO = open-ended). |
| CHANGE_NOTICE / CHANGE_DESCRIPTION | text |  | Engineering change notice that released the revision. |
| ERP_MATERIAL_NO | text |  | Cross-reference to the ERP material number. |
| ITEM_CLASS | text |  | PLM item class. |
| FORM_FACTOR / CHEMISTRY | text |  | Cell construction. |
| NOMINAL_VOLTAGE_V | number | V | Nominal voltage. |
| RATED_CAPACITY_AH | number | Ah | Rated capacity attribute held in PLM. |
| DIMENSIONS_MM | text | mm | Nominal external dimensions. |
| MASS_G | number | g | Nominal mass. |
| MAX_CONT_DISCHARGE_A | number | A | Maximum continuous discharge current. |
| CHARGE_VOLTAGE_V / DISCHARGE_CUTOFF_V | number | V | Voltage limits. |
| SPEC_DOC | text |  | Engineering specification reference. |

## `PLM/bom.xlsx`

- **Source system:** PLM bill of materials export
- **Represents:** Two-level product structure per revision: cell -> electrode subassemblies (made in-house) -> purchased materials.
- **Primary key:** (TOP_ASSEMBLY, TOP_REV, FIND_NO)
- **Relationships:** COMPONENT_ITEM (purchased) -> ERP_MATERIAL_NO -> ERP/supplier_master MATERIALS_SUPPLIED and material_purchase_prices MATNR; PARENT_ITEM -> COMPONENT_ITEM of the level above.
- **Can support:** What goes into each cell, by revision; which purchased materials (and therefore suppliers) affect which lots.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| TOP_ASSEMBLY / TOP_REV | text |  | Finished cell and revision the line belongs to. |
| BOM_LEVEL | integer |  | 1 = direct child of the cell, 2 = child of a subassembly. |
| FIND_NO | text |  | Position number. |
| PARENT_ITEM | text |  | Immediate parent of the component. |
| COMPONENT_ITEM / COMPONENT_DESCRIPTION | text |  | PLM component part number and description. |
| QTY_PER | number | per UOM | Quantity per one parent item. |
| UOM | text |  | G (grams), M2 (square meters) or EA (each). |
| MAKE_BUY | text |  | Make = produced in-house; Purchased = bought from a supplier. |
| ERP_MATERIAL_NO | text |  | ERP material for purchased components. |
| EFFECTIVE_FROM / EFFECTIVE_TO / CHANGE_NOTICE | date/text |  | Effectivity of the revision. |

## `MES/item_master.csv`

- **Source system:** MES (manufacturing execution system) item master
- **Represents:** MES item codes for finished cells.
- **Primary key:** item_code
- **Relationships:** plm_part_ref -> PLM/product_master.xlsx PART_NUMBER; item_code -> production_orders.csv item_code.
- **Can support:** Identifier mapping between MES and PLM.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| item_code | text |  | MES item code. |
| item_description | text |  | MES description. |
| plm_part_ref | text |  | PLM part number reference. |
| routing_version | text |  | MES routing version (not the PLM revision). |
| default_line | text |  | MES line code. |
| uom | text |  | Unit of measure. |
| status | text |  | Item status. |

## `MES/production_orders.csv`

- **Source system:** MES production order history
- **Represents:** One row per production order; each order produces one finished lot.
- **Primary key:** order_id
- **Relationships:** item_code -> item_master; site -> company Facilities.MES_SITE; lot_id -> material_consumption.fg_lot_id and ERP/sales.csv CHARG; erp_order_ref = ERP process order.
- **Can support:** Production quantities and dates; U.S. production (via site); lots available to sell.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| order_id | text |  | MES order number. |
| erp_order_ref | text |  | ERP process order number. |
| item_code | text |  | MES item code. |
| site / line | text |  | MES site and line codes. |
| lot_id | text |  | Finished-goods lot number. |
| start_ts / end_ts | ISO timestamp | local time | Order start/end. |
| qty_planned | integer | EA | Planned quantity. |
| qty_good | integer | EA | Good quantity confirmed on the order. |
| qty_scrap | integer | EA | Scrapped cells. |
| uom | text |  | EA. |
| order_status | text |  | Order status. |

## `MES/material_consumption.csv`

- **Source system:** MES lot genealogy / material consumption
- **Represents:** What purchased material lots were actually consumed by each order (backflushed through the electrode subassemblies).
- **Primary key:** (order_id, component_material, component_lot)
- **Relationships:** order_id -> production_orders; fg_lot_id -> production_orders.lot_id; component_material -> ERP material / PLM BOM ERP_MATERIAL_NO.
- **Can support:** Actual material usage by lot; which suppliers' material went into which lots; delivery dates for evidence coverage; finished-lot quantities.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| order_id | text |  | MES order. |
| fg_lot_id | text |  | Finished lot. |
| fg_lot_qty | integer | EA | Good quantity recorded on the finished lot at lot close. |
| component_material | text |  | ERP material number consumed. |
| component_lot | text |  | Supplier lot consumed. |
| component_lot_received | date |  | Date the supplier lot was received at the plant. |
| qty_consumed | number | KG / M2 / EA | Quantity consumed (good + scrapped cells). |
| uom | text |  | KG, M2 or EA (note: BOM uses G and M2). |
| posted_ts | ISO timestamp |  | Posting time. |

## `ERP/supplier_master.xlsx`

- **Source system:** ERP vendor master (SAP-style field names)
- **Represents:** One row per supplier.
- **Primary key:** LIFNR
- **Relationships:** MATERIALS_SUPPLIED -> ERP material numbers; LIFNR -> material_purchase_prices.LIFNR.
- **Can support:** Supplier identity, country and materials supplied; procurement's (unverified) parent note.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| LIFNR | text |  | Vendor number. |
| NAME1 | text |  | Supplier legal name. |
| LAND1 | text |  | Country (ISO 3166 alpha-2). |
| STRAS / ORT01 / REGIO / PSTLZ | text |  | Street, city, region, postal code. |
| MATERIALS_SUPPLIED | text |  | Materials bought from this vendor. |
| PARENT_COMPANY_NOTE | text |  | Free-text parent information recorded by procurement at onboarding (not verified). |
| ZTERM | text |  | Payment terms. |
| STATUS | text |  | Vendor status. |

## `ERP/material_purchase_prices.xlsx`

- **Source system:** ERP purchasing info records / price list
- **Represents:** 2026 purchase price per material.
- **Primary key:** MATNR
- **Relationships:** LIFNR -> supplier_master.
- **Can support:** Direct material costs (inputs to a future material-assistance calculation).

| Column | Type | Unit | Meaning |
|---|---|---|---|
| MATNR / MAKTX | text |  | Material number and description. |
| MEINS | text |  | Purchasing unit (KG, M2, EA). |
| NETPR | number | USD per MEINS | Net price. |
| WAERS | text |  | Currency. |
| LIFNR / VENDOR_NAME | text |  | Vendor. |
| VALID_FROM / VALID_TO | date |  | Price validity. |

## `ERP/sales.csv`

- **Source system:** ERP billing document export (SAP-style field names)
- **Represents:** One row per invoice line, January 2026 to mid-January 2027.
- **Primary key:** (VBELN, POSNR)
- **Relationships:** MATNR -> PLM product_master ERP_MATERIAL_NO; CHARG -> MES production_orders.lot_id; WERKS -> company Facilities.ERP_PLANT.
- **Can support:** Units sold, sale dates (tax-year scope), customers, link from sale to production lot.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| VBELN | text |  | Invoice number. |
| POSNR | text |  | Invoice line. |
| FKDAT | date MM/DD/YYYY |  | Invoice date. |
| KUNNR / NAME1 | text |  | Customer number and name. |
| MATNR / ARKTX | text |  | Material sold and line text. |
| CHARG | text |  | Batch (finished lot) shipped; blank if not batch-managed. |
| FKIMG | integer | EA | Billed quantity. |
| VRKME | text |  | Sales unit. |
| NETPR | number | USD/EA | Unit price. |
| NETWR | number | USD | Net line value. |
| WAERK | text |  | Currency. |
| WERKS | text |  | Shipping plant. |
| LAND1 | text |  | Ship-to country. |

## `QUALITY/*.pdf`

- **Source system:** Quality / engineering document repository
- **Represents:** Cell qualification test reports (one per tested product revision).
- **Primary key:** Document number in header
- **Relationships:** Product and revision stated on page 1.
- **Can support:** Technical specifications for battery-cell classification and kWh capacity; approval status.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| Page 1 |  |  | Document status, product/revision scope, summary. |
| Page 2 |  |  | Identification, voltage, dimensions, external volume. |
| Page 3 |  |  | Capacity samples, declared rated capacity, rated energy, energy density. |
| Page 4 |  |  | Rate capability, capacity-to-power ratio, sign-off. |

## `SUPPLIER_EVIDENCE/*.pdf`

- **Source system:** Supplier compliance documents (procurement document store)
- **Represents:** Supplier attestations, a declaration, a questionnaire and a certificate of origin.
- **Primary key:** File name
- **Relationships:** Supplier legal name and Volterra vendor number on page 1; materials covered by ERP material number.
- **Can support:** Supplier ownership, manufacturing origin, representation coverage by delivery date.

| Column | Type | Unit | Meaning |
|---|---|---|---|
| Page 1 |  |  | Supplier identity, materials and manufacturing sites, immediate and ultimate parent, coverage period. |
| Page 2 |  |  | Representations and signature (penalty of perjury). |
