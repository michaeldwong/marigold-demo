/**
 * Core manufacturing-compliance domain model.
 *
 * These types describe the canonical, versioned manufacturing record that the
 * 45X workflow is built on: entities → facilities → eligible components →
 * BOM versions → materials → suppliers → ownership → evidence, plus production,
 * sales, and claimant facts.
 *
 * Historical state is first-class: BOM versions, supplier attestations,
 * ownership facts and rule versions all carry effective periods, because the
 * BOM that applies to a batch sold in Q1 may not be today's BOM.
 */

export type ID = string;
/** ISO-8601 calendar date (YYYY-MM-DD). */
export type ISODate = string;
/** ISO-8601 timestamp. */
export type ISODateTime = string;

export interface EffectivePeriod {
  from: ISODate;
  /** Inclusive end date. `null` means open-ended / current. */
  to: ISODate | null;
}

/* -------------------------------------------------------------------------- */
/* Information types & provenance                                             */
/* -------------------------------------------------------------------------- */

/**
 * The four kinds of information the product must keep visibly distinct.
 * - known: supported by source evidence
 * - derived: calculated deterministically from known facts
 * - assumption: provisionally assumed for analysis, not confirmed
 * - missing: cannot currently be determined / requires review
 */
export type InfoKind = "known" | "derived" | "assumption" | "missing";

/** A value together with what kind of information it is and where it came from. */
export interface Fact<T> {
  value: T | null;
  kind: InfoKind;
  /** Pointer into the provenance catalog (SourceRef.id). */
  sourceId?: ID;
  note?: string;
}

export type SourceLocator =
  | {
      type: "document";
      page?: number;
      section?: string;
      /** Surrounding text as extracted. */
      excerpt: string;
      /** Substring of `excerpt` that supports the finding (highlighted in UI). */
      highlight?: string;
    }
  | {
      type: "spreadsheet";
      sheet: string;
      row: number;
      column: string;
      cellValue: string;
    }
  | {
      type: "system_record";
      system: string;
      recordId: string;
      fields: Record<string, string>;
    };

/** A single, citable pointer from a fact to the evidence it was taken from. */
export interface SourceRef {
  id: ID;
  /** Human-readable statement of what the source establishes. */
  finding: string;
  evidenceId: ID;
  locator: SourceLocator;
  /** Confidence that the value was extracted / mapped correctly (0–1). */
  extractionConfidence: number;
  extractionMethod: "manual_entry" | "structured_import" | "mock_extraction";
  /** Descriptions of the determinations/calculations that consume this fact. */
  usedIn: string[];
}

/* -------------------------------------------------------------------------- */
/* Entities & facilities                                                      */
/* -------------------------------------------------------------------------- */

export type EntityRole =
  | "parent"
  | "manufacturer"
  | "sales_affiliate"
  | "contract_manufacturer";

export interface LegalEntity {
  id: ID;
  name: string;
  ein: Fact<string>;
  role: EntityRole;
  jurisdiction: string;
  parentId?: ID;
  /** Related to the Volterra group for 45X related-person purposes. */
  relatedToGroup: boolean;
  sourceId?: ID;
}

export type Section48CStatus = "no_allocation_confirmed" | "unknown" | "allocated";

export interface ProductionLine {
  id: ID;
  name: string;
}

export interface Facility {
  id: ID;
  name: string;
  shortName: string;
  address: string;
  city: string;
  state: string;
  operatorEntityId: ID;
  ownerEntityId: ID;
  lines: ProductionLine[];
  section48C: Fact<Section48CStatus>;
  /** IRS pre-filing registration number (elective pay / transfer). */
  registrationNumber: Fact<string>;
  sourceId?: ID;
}

/* -------------------------------------------------------------------------- */
/* Eligible components                                                        */
/* -------------------------------------------------------------------------- */

export type ComponentCategory =
  | "battery_cell"
  | "battery_module_with_cells"
  | "electrode_active_material";

export interface ClaimantDetermination {
  claimingEntityId: Fact<ID>;
  manufacturingEntityId: Fact<ID>;
  contractManufacturing: Fact<boolean>;
  /** Signed contract manufacturing certification / written claimant agreement. */
  claimantAgreementEvidenceId?: ID;
  relatedPartyConsiderations: string;
  notes?: string;
}

export interface CapacitySpec {
  nominalVoltageV: Fact<number>;
  /** Cells: rated capacity in amp-hours. */
  ratedCapacityAh?: Fact<number>;
  /** Modules: aggregate capacity in kWh. */
  aggregateCapacityKwh?: Fact<number>;
  energyDensityWhPerL: Fact<number>;
  capacityToPowerRatio: Fact<number>;
  testStandard: string;
  /** Evidence ID of the capacity test report; undefined if never provided. */
  capacityTestEvidenceId?: ID;
}

export interface EligibleComponent {
  id: ID;
  sku: string;
  name: string;
  shortName: string;
  category: ComponentCategory;
  description: string;
  facilityId: ID;
  lineId: ID;
  chemistry: string;
  format: string;
  /** Not applicable to electrode active materials (cost-based credit). */
  capacity?: CapacitySpec;
  claimant: ClaimantDetermination;
  /** First commercial production date. */
  productionStart: ISODate;
  bomVersionIds: ID[];
  /** Components that are not yet in scope for evaluation. */
  evaluationNote?: string;
}

/* -------------------------------------------------------------------------- */
/* BOM, materials, suppliers                                                  */
/* -------------------------------------------------------------------------- */

export interface BomVersion {
  id: ID;
  componentId: ID;
  version: string;
  effective: EffectivePeriod;
  status: "superseded" | "active" | "planned";
  changeSummary: string;
  approvedBy: string;
  sourceEvidenceId: ID;
  lines: BomLine[];
}

export interface BomLine {
  id: ID;
  lineNo: number;
  materialId: ID;
  supplierId: ID;
  supplierFacilityId: ID;
  quantityPerUnit: string;
  /** Direct material cost per finished unit, USD. */
  unitCost: Fact<number>;
}

export interface Material {
  id: ID;
  name: string;
  partNumber: string;
  role: string;
}

export type PfeStatus =
  | "clear"
  | "pfe_risk"
  | "review_required"
  | "unknown"
  | "not_evaluated";

export type OwnershipStatus = "verified" | "reported" | "unknown";

export interface OwnershipLink {
  entityName: string;
  country: string;
  relationship: "immediate_parent" | "ultimate_parent";
  ownershipPct?: number;
  status: OwnershipStatus;
  sourceId?: ID;
  note?: string;
}

export interface SupplierFacility {
  id: ID;
  supplierId: ID;
  name: string;
  city: string;
  country: string;
}

export type QualificationStatus = "qualified" | "in_qualification" | "conditional";

export interface Supplier {
  id: ID;
  name: string;
  aliases: string[];
  ein: Fact<string>;
  country: string;
  facilities: SupplierFacility[];
  ownership: OwnershipLink[];
  /** Ultimate parent resolution — separate from the chain for quick access. */
  ultimateParent: Fact<string>;
  ultimateParentCountry?: string;
  pfeStatusByYear: Record<number, PfeStatus>;
  pfeRationale: string;
  qualification: { status: QualificationStatus; since: ISODate };
  procurementOwner: string;
  /** Unmatched to the supplier master (entity-resolution issue). */
  masterMatch: "matched" | "alias_match" | "unmatched";
}

/* -------------------------------------------------------------------------- */
/* Evidence                                                                   */
/* -------------------------------------------------------------------------- */

export type DocumentCategory =
  | "bom"
  | "supplier_attestation"
  | "supplier_master"
  | "mes_extract"
  | "production_record"
  | "work_order"
  | "invoice"
  | "sales_report"
  | "capacity_test"
  | "contract"
  | "entity_documentation"
  | "section_48c"
  | "other";

export type EvidenceStatus =
  | "verified"
  | "received"
  | "pending_review"
  | "expired"
  | "conflicting"
  | "superseded";

export interface AttestationDetails {
  supplierId: ID;
  ein: string;
  coverage: EffectivePeriod;
  penaltyOfPerjury: boolean;
  signatory: string;
  representation: string;
  materialIds: ID[];
}

export interface EvidenceDocument {
  id: ID;
  fileName: string;
  title: string;
  category: DocumentCategory;
  status: EvidenceStatus;
  sizeKb: number;
  receivedAt: ISODateTime;
  source: "file_upload" | "mes_import" | "erp_export" | "email_intake" | "supplier_portal";
  pages?: number;
  attestation?: AttestationDetails;
  /** Free-form links used for search & "used in" display. */
  links: { componentIds?: ID[]; supplierIds?: ID[]; facilityIds?: ID[]; entityIds?: ID[] };
  supersededBy?: ID;
  note?: string;
}

/* -------------------------------------------------------------------------- */
/* Production & sales                                                         */
/* -------------------------------------------------------------------------- */

export interface ProductionBatch {
  id: ID;
  componentId: ID;
  facilityId: ID;
  lineId: ID;
  productionDate: ISODate;
  /** Last production date covered by this lot record. */
  periodEnd: ISODate;
  quantity: number;
  workOrder: string;
  mesSourceId: ID;
  workOrderEvidenceId?: ID;
}

export interface SaleAllocation {
  batchId: ID;
  quantity: number;
}

export interface SaleRecord {
  id: ID;
  invoiceNumber: string;
  componentId: ID;
  customerName: string;
  customerEntityId?: ID;
  saleDate: ISODate;
  quantity: number;
  relatedParty: boolean;
  /** Match state of the sale record against customer master and production. */
  matchStatus: "matched" | "unmatched";
  matchNote?: string;
  /** Mock FIFO allocation of the sale to production lots (derived). */
  allocations: SaleAllocation[];
  invoiceEvidenceId?: ID;
  contractEvidenceId?: ID;
  sourceId: ID;
}

/* -------------------------------------------------------------------------- */
/* Company container                                                          */
/* -------------------------------------------------------------------------- */

export interface ManufacturerDataset {
  company: { name: string; hqEntityId: ID; fiscalYearEnd: string };
  taxYear: number;
  asOf: ISODate;
  entities: LegalEntity[];
  facilities: Facility[];
  components: EligibleComponent[];
  bomVersions: BomVersion[];
  materials: Material[];
  suppliers: Supplier[];
  evidence: EvidenceDocument[];
  sources: SourceRef[];
  batches: ProductionBatch[];
  sales: SaleRecord[];
  people: Person[];
}

export interface Person {
  id: ID;
  name: string;
  initials: string;
  role: string;
  team: "Procurement" | "Tax" | "Finance" | "Operations" | "Engineering" | "Legal" | "External advisor";
}
