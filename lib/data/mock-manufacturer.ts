/**
 * Seeded demo dataset — Volterra Battery Systems (FICTIONAL).
 *
 * Every company, person, supplier, EIN, address and document in this file is
 * invented for demonstration purposes. Numbers are illustrative only.
 *
 * The dataset is deliberately imperfect. Seeded problems include:
 *  - Northstar Cathode (SUP-1203): attestation coverage gap Apr 1 – Jun 30, 2027
 *  - Qingdao Separator (SUP-1842): ultimate parent unresolved
 *  - Tianjin Huayu Carbon (SUP-1377): possible PFE supplier (VX-2170 BOM v3.1/v3.2)
 *  - Huaxin Electrolyte (SUP-1519): PFE review not completed
 *  - Lumen Carbon Additives (SUP-1791): attestation never received
 *  - Great Lakes Foil (SUP-1610): EIN on attestation conflicts with supplier master
 *  - Keystone / Mohawk / Rochester Precision: attestations expiring early 2028
 *  - VX-4680: no capacity test report; datasheet and engineering spec conflict
 *  - Related-party sales of VX-2170 to Volterra Energy Storage LLC; no election on file
 *  - One unmatched sales record ("EV0LV Mobility Inc.")
 *  - VM-16: contract manufacturing at Lakeshore; claimant certification unsigned
 *  - Batavia facility: Section 48C status not confirmed
 *  - BOM change: VX-2170 v3.3 replaced Tianjin graphite with Appalachian graphite
 *  - VX-P280: fully substantiated, advisor-reviewed
 *
 * In production this module is replaced by the ingestion pipeline + database.
 * TODO: Replace seeded data with normalized records produced by controlled
 * spreadsheet/document imports and, later, ERP/MES/PLM integrations.
 */

import type {
  BomLine,
  BomVersion,
  EvidenceDocument,
  ManufacturerDataset,
  Material,
  ProductionBatch,
  SaleRecord,
  SourceRef,
  Supplier,
} from "@/lib/domain/types";

/* -------------------------------------------------------------------------- */
/* People                                                                     */
/* -------------------------------------------------------------------------- */

const people: ManufacturerDataset["people"] = [
  { id: "P-SC", name: "Sarah Chen", initials: "SC", role: "Procurement Manager", team: "Procurement" },
  { id: "P-MR", name: "Marcus Reyes", initials: "MR", role: "Supply Chain Compliance Lead", team: "Procurement" },
  { id: "P-AP", name: "Anika Patel", initials: "AP", role: "Director of Tax", team: "Tax" },
  { id: "P-DK", name: "David Kim", initials: "DK", role: "Corporate Controller", team: "Finance" },
  { id: "P-LO", name: "Lena Ortiz", initials: "LO", role: "Plant Operations Manager", team: "Operations" },
  { id: "P-JW", name: "James Whitfield", initials: "JW", role: "Cell Engineering Lead", team: "Engineering" },
  { id: "P-EM", name: "Elena Morales", initials: "EM", role: "Associate General Counsel", team: "Legal" },
  { id: "P-RH", name: "Rachel Hollis, CPA", initials: "RH", role: "External advisor · Hollis & Mercer LLP", team: "External advisor" },
];

/* -------------------------------------------------------------------------- */
/* Materials                                                                  */
/* -------------------------------------------------------------------------- */

const materials: Material[] = [
  { id: "MAT-NMC811", name: "Cathode active material — NMC811", partNumber: "CAM-811-A", role: "Cathode" },
  { id: "MAT-GRAPH", name: "Anode active material — synthetic graphite", partNumber: "AAM-SG-20", role: "Anode" },
  { id: "MAT-SEP", name: "Separator — ceramic-coated PE, 12 µm", partNumber: "SEP-CC12", role: "Separator" },
  { id: "MAT-ELEC", name: "Electrolyte — 1M LiPF6 in EC/EMC", partNumber: "ELY-1M-A", role: "Electrolyte" },
  { id: "MAT-CUFOIL", name: "Copper foil, 6 µm", partNumber: "CUF-06", role: "Current collector" },
  { id: "MAT-ALFOIL", name: "Aluminum foil, 12 µm", partNumber: "ALF-12", role: "Current collector" },
  { id: "MAT-CAN217", name: "Can & cap assembly — 21700", partNumber: "CAN-217-NP", role: "Enclosure" },
  { id: "MAT-CAN468", name: "Can & cap assembly — 46-series", partNumber: "CAN-468-NP", role: "Enclosure" },
  { id: "MAT-BINDER", name: "PVDF binder", partNumber: "BND-PVDF-5130", role: "Binder" },
  { id: "MAT-CNT", name: "Conductive additive — CNT dispersion", partNumber: "CNA-CNT-2", role: "Conductive additive" },
  { id: "MAT-TABS", name: "Tabs & insulators kit", partNumber: "TAB-NI-AL", role: "Hardware" },
  { id: "MAT-LFP", name: "Cathode active material — LFP", partNumber: "CAM-LFP-H", role: "Cathode" },
  { id: "MAT-BINDLFP", name: "Binder & conductive carbon (LFP)", partNumber: "BND-LFP-K", role: "Binder" },
  { id: "MAT-PCASE", name: "Prismatic aluminum case & lid — P280", partNumber: "CASE-P280", role: "Enclosure" },
  { id: "MAT-CELLP280", name: "VX-P280 cell (internal transfer)", partNumber: "VX-P280", role: "Battery cell" },
  { id: "MAT-BMS", name: "Battery management board, 18S", partNumber: "BMS-18S-B", role: "Electronics" },
  { id: "MAT-BUSBAR", name: "Busbar set", partNumber: "BB-18-CU", role: "Interconnect" },
  { id: "MAT-HARNESS", name: "Voltage sense harness", partNumber: "HRN-VS18", role: "Electronics" },
  { id: "MAT-ENCL", name: "Module enclosure", partNumber: "ENC-VM16", role: "Enclosure" },
];

/* -------------------------------------------------------------------------- */
/* Suppliers                                                                  */
/* -------------------------------------------------------------------------- */

const clearAllYears = { 2026: "clear", 2027: "clear", 2028: "not_evaluated" } as const;

function supplier(s: Omit<Supplier, "facilities"> & { facility: [string, string, string] }): Supplier {
  const { facility, ...rest } = s;
  return {
    ...rest,
    facilities: [{ id: `${s.id}-F1`, supplierId: s.id, name: facility[0], city: facility[1], country: facility[2] }],
  };
}

const suppliers: Supplier[] = [
  supplier({
    id: "SUP-1203",
    name: "Northstar Cathode Materials LLC",
    aliases: ["Northstar CAM", "NCM LLC"],
    ein: { value: "62-1847730", kind: "known", sourceId: "SRC-SUPMASTER-1203" },
    country: "United States",
    facility: ["Clarksville CAM Plant", "Clarksville, TN", "United States"],
    ownership: [
      { entityName: "Northstar Materials Holdings Co., Ltd.", country: "South Korea", relationship: "immediate_parent", ownershipPct: 100, status: "verified", sourceId: "SRC-OWN-1203" },
      { entityName: "Northstar Materials Holdings Co., Ltd.", country: "South Korea", relationship: "ultimate_parent", status: "verified", sourceId: "SRC-OWN-1203" },
    ],
    ultimateParent: { value: "Northstar Materials Holdings Co., Ltd.", kind: "known", sourceId: "SRC-OWN-1203" },
    ultimateParentCountry: "South Korea",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Ownership disclosure and attestation indicate no prohibited foreign entity ownership or effective control.",
    qualification: { status: "qualified", since: "2025-11-03" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1377",
    name: "Tianjin Huayu Carbon Materials Co., Ltd.",
    aliases: ["Huayu Carbon", "TJ Huayu"],
    ein: { value: null, kind: "missing", note: "Foreign supplier — no EIN on file" },
    country: "China",
    facility: ["Binhai Graphitization Plant", "Tianjin", "China"],
    ownership: [
      { entityName: "Huayu New Energy Group Co., Ltd.", country: "China", relationship: "immediate_parent", ownershipPct: 72, status: "reported", sourceId: "SRC-OWN-1377" },
      { entityName: "Huayu New Energy Group Co., Ltd.", country: "China", relationship: "ultimate_parent", status: "reported", sourceId: "SRC-OWN-1377", note: "Annual report indicates provincial state-asset shareholder." },
    ],
    ultimateParent: { value: "Huayu New Energy Group Co., Ltd.", kind: "known", sourceId: "SRC-OWN-1377" },
    ultimateParentCountry: "China",
    pfeStatusByYear: { 2026: "pfe_risk", 2027: "pfe_risk", 2028: "pfe_risk" },
    pfeRationale: "Parent annual report indicates state-asset ownership. Treated as a prohibited foreign entity for MACR purposes (placeholder treatment).",
    qualification: { status: "qualified", since: "2024-06-12" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1842",
    name: "Qingdao Separator Materials Ltd.",
    aliases: ["Qingdao Sep. Materials", "QSM Ltd."],
    ein: { value: null, kind: "missing", note: "Foreign supplier — no EIN on file" },
    country: "China",
    facility: ["Jimo Wet-Process Separator Plant", "Qingdao", "China"],
    ownership: [
      { entityName: "Harborline Advanced Materials Pte. Ltd.", country: "Singapore", relationship: "immediate_parent", ownershipPct: 100, status: "reported", sourceId: "SRC-OWN-1842" },
      { entityName: "Unknown", country: "Unknown", relationship: "ultimate_parent", status: "unknown", note: "Supplier declined to disclose beneficial owners above the Singapore holding company." },
    ],
    ultimateParent: { value: null, kind: "missing", note: "Not disclosed above Harborline Advanced Materials Pte. Ltd. (Singapore)." },
    pfeStatusByYear: { 2026: "unknown", 2027: "unknown", 2028: "not_evaluated" },
    pfeRationale: "Supplier signed a non-PFE representation but has not disclosed its ultimate parent; PFE status cannot be determined.",
    qualification: { status: "qualified", since: "2025-03-18" },
    procurementOwner: "P-MR",
    masterMatch: "alias_match",
  }),
  supplier({
    id: "SUP-1519",
    name: "Huaxin Electrolyte Materials (Zhangjiagang) Co., Ltd.",
    aliases: ["Huaxin Electrolyte"],
    ein: { value: null, kind: "missing", note: "Foreign supplier — no EIN on file" },
    country: "China",
    facility: ["Zhangjiagang Electrolyte Plant", "Zhangjiagang, Jiangsu", "China"],
    ownership: [
      { entityName: "Huaxin Chemical Group Co., Ltd.", country: "China", relationship: "ultimate_parent", ownershipPct: 100, status: "reported", sourceId: "SRC-OWN-1519" },
    ],
    ultimateParent: { value: "Huaxin Chemical Group Co., Ltd.", kind: "known", sourceId: "SRC-OWN-1519" },
    ultimateParentCountry: "China",
    pfeStatusByYear: { 2026: "review_required", 2027: "review_required", 2028: "review_required" },
    pfeRationale: "China-headquartered private parent. PFE analysis (effective control, licensing, debt) not completed.",
    qualification: { status: "qualified", since: "2024-09-30" },
    procurementOwner: "P-MR",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1610",
    name: "Great Lakes Foil Co.",
    aliases: ["GL Foil"],
    ein: { value: "25-1093388", kind: "known", sourceId: "SRC-SUPMASTER-1610" },
    country: "United States",
    facility: ["Erie Rolling Mill", "Erie, PA", "United States"],
    ownership: [
      { entityName: "Great Lakes Industrial Holdings, Inc.", country: "United States", relationship: "ultimate_parent", ownershipPct: 100, status: "verified" },
    ],
    ultimateParent: { value: "Great Lakes Industrial Holdings, Inc.", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic supplier with domestic parent.",
    qualification: { status: "qualified", since: "2027-05-14" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1640",
    name: "Mohawk Copper Foil Inc.",
    aliases: [],
    ein: { value: "14-2201876", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Amsterdam Foil Works", "Amsterdam, NY", "United States"],
    ownership: [{ entityName: "Mohawk Copper Foil Inc.", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Mohawk Copper Foil Inc. (independent)", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic, independently held.",
    qualification: { status: "qualified", since: "2025-08-01" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1655",
    name: "Hudson Valley Foil Products Inc.",
    aliases: [],
    ein: { value: "14-3390512", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Kingston Plant", "Kingston, NY", "United States"],
    ownership: [{ entityName: "Hudson Valley Foil Products Inc.", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Hudson Valley Foil Products Inc. (independent)", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic, independently held.",
    qualification: { status: "qualified", since: "2026-04-11" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1702",
    name: "Keystone Can Components Inc.",
    aliases: ["Keystone Can"],
    ein: { value: "23-2948810", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Reading Deep-Draw Plant", "Reading, PA", "United States"],
    ownership: [{ entityName: "Keystone Industrial Group LLC", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Keystone Industrial Group LLC", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic supplier with domestic parent.",
    qualification: { status: "qualified", since: "2025-02-20" },
    procurementOwner: "P-MR",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1708",
    name: "Tri-State Aluminum Rolling LLC",
    aliases: ["Tri-State Rolling"],
    ein: { value: "55-0712244", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Ravenswood Rolling Mill", "Ravenswood, WV", "United States"],
    ownership: [{ entityName: "Tri-State Metals Holdings LLC", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Tri-State Metals Holdings LLC", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic supplier with domestic parent.",
    qualification: { status: "qualified", since: "2024-12-02" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1733",
    name: "Arcadia Fluoropolymers SAS",
    aliases: ["Arcadia PVDF"],
    ein: { value: null, kind: "missing", note: "Foreign supplier — no EIN on file" },
    country: "France",
    facility: ["Pierre-Bénite Works", "Lyon", "France"],
    ownership: [{ entityName: "Arcadia Group SA", country: "France", relationship: "ultimate_parent", ownershipPct: 100, status: "verified", sourceId: "SRC-OWN-1733" }],
    ultimateParent: { value: "Arcadia Group SA", kind: "known", sourceId: "SRC-OWN-1733" },
    ultimateParentCountry: "France",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "EU-headquartered listed parent; no PFE indicators.",
    qualification: { status: "qualified", since: "2024-10-15" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1791",
    name: "Lumen Carbon Additives Inc.",
    aliases: ["Lumen CNT"],
    ein: { value: null, kind: "missing", note: "Not present in supplier master" },
    country: "United States",
    facility: ["Akron Dispersion Plant", "Akron, OH", "United States"],
    ownership: [{ entityName: "Lumen Nanomaterials Holdings Inc.", country: "United States", relationship: "ultimate_parent", status: "reported" }],
    ultimateParent: { value: "Lumen Nanomaterials Holdings Inc.", kind: "assumption", note: "Per supplier website; not confirmed in writing." },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic per public information; no attestation received.",
    qualification: { status: "conditional", since: "2026-06-30" },
    procurementOwner: "P-SC",
    masterMatch: "unmatched",
  }),
  supplier({
    id: "SUP-1805",
    name: "Rochester Precision Stamping Inc.",
    aliases: ["RPS"],
    ein: { value: "16-1557039", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Gates Stamping Plant", "Rochester, NY", "United States"],
    ownership: [{ entityName: "Rochester Precision Stamping Inc.", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Rochester Precision Stamping Inc. (independent)", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic, independently held.",
    qualification: { status: "qualified", since: "2025-01-09" },
    procurementOwner: "P-MR",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1821",
    name: "Appalachian Graphite Materials LLC",
    aliases: ["AGM"],
    ein: { value: "62-1950034", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Chattanooga Anode Plant", "Chattanooga, TN", "United States"],
    ownership: [{ entityName: "Appalachian Minerals Corp.", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Appalachian Minerals Corp.", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic supplier with domestic parent.",
    qualification: { status: "qualified", since: "2026-11-20" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1840",
    name: "Carolina Membrane Technologies Inc.",
    aliases: [],
    ein: { value: "56-2209871", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Gastonia Membrane Plant", "Gastonia, NC", "United States"],
    ownership: [{ entityName: "Carolina Membrane Technologies Inc.", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Carolina Membrane Technologies Inc. (independent)", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic, independently held.",
    qualification: { status: "qualified", since: "2026-08-08" },
    procurementOwner: "P-MR",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1856",
    name: "Ozark LFP Materials Inc.",
    aliases: [],
    ein: { value: "71-0943360", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Springdale Cathode Plant", "Springdale, AR", "United States"],
    ownership: [{ entityName: "Ozark Advanced Materials Holdings LLC", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Ozark Advanced Materials Holdings LLC", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic supplier with domestic parent.",
    qualification: { status: "qualified", since: "2026-05-19" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1869",
    name: "Hoshino Electrolyte America, Inc.",
    aliases: ["Hoshino EA"],
    ein: { value: "93-1180457", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Hillsboro Electrolyte Plant", "Hillsboro, OR", "United States"],
    ownership: [
      { entityName: "Hoshino Fine Chemicals Co., Ltd.", country: "Japan", relationship: "ultimate_parent", ownershipPct: 100, status: "verified", sourceId: "SRC-OWN-1869" },
    ],
    ultimateParent: { value: "Hoshino Fine Chemicals Co., Ltd.", kind: "known", sourceId: "SRC-OWN-1869" },
    ultimateParentCountry: "Japan",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Japan-headquartered listed parent; no PFE indicators.",
    qualification: { status: "qualified", since: "2026-03-02" },
    procurementOwner: "P-MR",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1874",
    name: "Seneca Polymer Additives Inc.",
    aliases: [],
    ein: { value: "16-1874402", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Geneva Compounding Plant", "Geneva, NY", "United States"],
    ownership: [{ entityName: "Seneca Polymer Additives Inc.", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Seneca Polymer Additives Inc. (independent)", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic, independently held.",
    qualification: { status: "qualified", since: "2026-07-14" },
    procurementOwner: "P-SC",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1890",
    name: "Finger Lakes Metal Fabrication LLC",
    aliases: ["FLMF"],
    ein: { value: "16-2093315", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Canandaigua Fabrication Plant", "Canandaigua, NY", "United States"],
    ownership: [{ entityName: "Finger Lakes Metal Fabrication LLC", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Finger Lakes Metal Fabrication LLC (independent)", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic, independently held.",
    qualification: { status: "qualified", since: "2026-06-01" },
    procurementOwner: "P-MR",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1902",
    name: "Pacific Rim Electronics (Dongguan) Co., Ltd.",
    aliases: ["PRE Dongguan"],
    ein: { value: null, kind: "missing", note: "Foreign supplier — no EIN on file" },
    country: "China",
    facility: ["Dongguan SMT Plant", "Dongguan, Guangdong", "China"],
    ownership: [
      { entityName: "Pacific Rim Electronics Holdings Ltd.", country: "Hong Kong SAR", relationship: "ultimate_parent", status: "reported", sourceId: "SRC-OWN-1902" },
    ],
    ultimateParent: { value: "Pacific Rim Electronics Holdings Ltd.", kind: "known", sourceId: "SRC-OWN-1902" },
    ultimateParentCountry: "Hong Kong SAR",
    pfeStatusByYear: { 2026: "review_required", 2027: "review_required", 2028: "review_required" },
    pfeRationale: "Hong Kong parent; effective-control and licensing review not completed.",
    qualification: { status: "qualified", since: "2026-09-21" },
    procurementOwner: "P-MR",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1915",
    name: "Genesee Wire Harness Co.",
    aliases: [],
    ein: { value: "16-1408827", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Batavia Harness Shop", "Batavia, NY", "United States"],
    ownership: [{ entityName: "Genesee Wire Harness Co. (independent)", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Genesee Wire Harness Co. (independent)", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic, independently held.",
    qualification: { status: "qualified", since: "2026-09-01" },
    procurementOwner: "P-MR",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-1925",
    name: "Empire Busbar & Electrical Inc.",
    aliases: [],
    ein: { value: "16-2671190", kind: "known", sourceId: "SRC-SUPMASTER-GENERIC" },
    country: "United States",
    facility: ["Syracuse Plant", "Syracuse, NY", "United States"],
    ownership: [{ entityName: "Empire Busbar & Electrical Inc. (independent)", country: "United States", relationship: "ultimate_parent", status: "verified" }],
    ultimateParent: { value: "Empire Busbar & Electrical Inc. (independent)", kind: "known" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Domestic, independently held.",
    qualification: { status: "qualified", since: "2026-09-01" },
    procurementOwner: "P-MR",
    masterMatch: "matched",
  }),
  supplier({
    id: "SUP-INT",
    name: "Volterra Battery Manufacturing LLC (internal)",
    aliases: [],
    ein: { value: "88-4410391", kind: "known", sourceId: "SRC-ENTMAP" },
    country: "United States",
    facility: ["Rochester Cell Plant — Line 3", "Rochester, NY", "United States"],
    ownership: [{ entityName: "Volterra Battery Systems, Inc.", country: "United States", relationship: "ultimate_parent", status: "verified", sourceId: "SRC-ENTMAP" }],
    ultimateParent: { value: "Volterra Battery Systems, Inc.", kind: "known", sourceId: "SRC-ENTMAP" },
    ultimateParentCountry: "United States",
    pfeStatusByYear: { ...clearAllYears },
    pfeRationale: "Internal production at a U.S. facility.",
    qualification: { status: "qualified", since: "2026-01-01" },
    procurementOwner: "P-LO",
    masterMatch: "matched",
  }),
];

/* -------------------------------------------------------------------------- */
/* BOM versions                                                               */
/* -------------------------------------------------------------------------- */

type LineSpec = [materialId: string, supplierId: string, qty: string, unitCost: number];

/** BOM master spreadsheet rows start at these offsets so provenance can cite row numbers. */
let bomRowCursor = 12;
const bomSources: SourceRef[] = [];

function bom(
  id: string,
  componentId: string,
  version: string,
  from: string,
  to: string | null,
  status: BomVersion["status"],
  changeSummary: string,
  approvedBy: string,
  sourceEvidenceId: string,
  sheet: string,
  specs: LineSpec[],
): BomVersion {
  const lines: BomLine[] = specs.map(([materialId, supplierId, qty, unitCost], i) => {
    const row = bomRowCursor++;
    const lineId = `${id}-L${i + 1}`;
    const sourceId = `SRC-${lineId}`;
    const material = materials.find((m) => m.id === materialId)!;
    const sup = suppliers.find((s) => s.id === supplierId)!;
    bomSources.push({
      id: sourceId,
      finding: `${material.name} — ${sup.name} — $${unitCost.toFixed(2)} per unit (${version})`,
      evidenceId: sourceEvidenceId,
      locator: { type: "spreadsheet", sheet, row, column: "Supplier Cost (USD/unit)", cellValue: unitCost.toFixed(2) },
      extractionConfidence: 0.99,
      extractionMethod: "structured_import",
      usedIn: [`${componentId} material assistance (MACR) calculation`, `${version} effective-period cost basis`],
    });
    return {
      id: lineId,
      lineNo: (i + 1) * 10,
      materialId,
      supplierId,
      supplierFacilityId: `${supplierId}-F1`,
      quantityPerUnit: qty,
      unitCost: { value: unitCost, kind: "known", sourceId },
    };
  });
  bomRowCursor += 3;
  return { id, componentId, version, effective: { from, to }, status, changeSummary, approvedBy, sourceEvidenceId, lines };
}

const vx2170Lines = (graphiteSupplier: string, graphiteCost: number, cathodeCost: number): LineSpec[] => [
  ["MAT-NMC811", "SUP-1203", "9.62 g", cathodeCost],
  ["MAT-GRAPH", graphiteSupplier, "6.10 g", graphiteCost],
  ["MAT-SEP", "SUP-1842", "0.071 m²", 0.16],
  ["MAT-ELEC", "SUP-1519", "4.95 g", 0.17],
  ["MAT-CUFOIL", "SUP-1640", "0.060 m²", 0.12],
  ["MAT-CAN217", "SUP-1702", "1 set", 0.12],
  ["MAT-ALFOIL", "SUP-1708", "0.062 m²", 0.05],
  ["MAT-BINDER", "SUP-1733", "0.19 g", 0.05],
  ["MAT-CNT", "SUP-1791", "0.06 g", 0.03],
  ["MAT-TABS", "SUP-1805", "1 kit", 0.09],
];

const bomVersions: BomVersion[] = [
  bom("BOM-2170-v3.1", "CMP-2170", "v3.1", "2026-07-01", "2026-12-31", "superseded",
    "Production-release BOM for Line 1 ramp.", "J. Whitfield (ECO-2026-118)", "EV-BOM-2026", "Cell BOM (H2-2026)",
    vx2170Lines("SUP-1377", 0.30, 0.71)),
  bom("BOM-2170-v3.2", "CMP-2170", "v3.2", "2027-01-01", "2027-06-30", "superseded",
    "Cathode price update (CY2027 contract); graphite cost re-baselined.", "J. Whitfield (ECO-2026-171)", "EV-BOM-2027", "Cell BOM",
    vx2170Lines("SUP-1377", 0.31, 0.70)),
  bom("BOM-2170-v3.3", "CMP-2170", "v3.3", "2027-07-01", null, "active",
    "Anode graphite source changed from Tianjin Huayu Carbon (SUP-1377) to Appalachian Graphite Materials (SUP-1821) to reduce PFE exposure.",
    "J. Whitfield (ECO-2027-064)", "EV-BOM-2027", "Cell BOM",
    vx2170Lines("SUP-1821", 0.34, 0.70)),
  bom("BOM-4680-v1.0", "CMP-4680", "v1.0", "2027-08-01", null, "active",
    "Initial production BOM for Line 2.", "J. Whitfield (ECO-2027-091)", "EV-BOM-2027", "Cell BOM 46-series",
    [
      ["MAT-NMC811", "SUP-1203", "48.1 g", 0.98],
      ["MAT-GRAPH", "SUP-1821", "30.4 g", 0.52],
      ["MAT-SEP", "SUP-1842", "0.36 m²", 0.30],
      ["MAT-ELEC", "SUP-1519", "24.6 g", 0.31],
      ["MAT-CUFOIL", "SUP-1610", "0.30 m²", 0.20],
      ["MAT-CAN468", "SUP-1702", "1 set", 0.28],
      ["MAT-ALFOIL", "SUP-1708", "0.31 m²", 0.09],
      ["MAT-BINDER", "SUP-1733", "0.95 g", 0.08],
      ["MAT-CNT", "SUP-1791", "0.30 g", 0.05],
      ["MAT-TABS", "SUP-1805", "1 kit", 0.12],
    ]),
  bom("BOM-P280-v2.0", "CMP-P280", "v2.0", "2027-01-01", null, "active",
    "Domestic-content redesign: all cathode, anode and separator sourcing moved to U.S. suppliers.", "J. Whitfield (ECO-2026-150)", "EV-BOM-2027", "Prismatic BOM",
    [
      ["MAT-LFP", "SUP-1856", "1.62 kg", 13.4],
      ["MAT-GRAPH", "SUP-1821", "0.71 kg", 4.1],
      ["MAT-SEP", "SUP-1840", "2.9 m²", 2.2],
      ["MAT-ELEC", "SUP-1869", "0.68 kg", 3.1],
      ["MAT-CUFOIL", "SUP-1655", "2.7 m²", 1.6],
      ["MAT-ALFOIL", "SUP-1708", "2.8 m²", 0.9],
      ["MAT-BINDLFP", "SUP-1874", "0.06 kg", 0.75],
      ["MAT-PCASE", "SUP-1890", "1 set", 2.45],
    ]),
  bom("BOM-VM16-v1.0", "CMP-VM16", "v1.0", "2027-07-01", null, "active",
    "Initial module BOM (Lakeshore Precision Assembly build).", "J. Whitfield (ECO-2027-077)", "EV-BOM-2027", "Module BOM",
    [
      ["MAT-CELLP280", "SUP-INT", "18 cells", 513.0],
      ["MAT-BMS", "SUP-1902", "1 board", 85.0],
      ["MAT-BUSBAR", "SUP-1925", "1 set", 32.0],
      ["MAT-HARNESS", "SUP-1915", "1 harness", 24.0],
      ["MAT-ENCL", "SUP-1890", "1 enclosure", 96.0],
    ]),
];

/* -------------------------------------------------------------------------- */
/* Production batches (monthly lot records from MES)                          */
/* -------------------------------------------------------------------------- */

const batchSources: SourceRef[] = [];

function monthEnd(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return d.toISOString().slice(0, 10);
}

// Sequence chosen so the October 2027 VX-2170 lot is BATCH-2027-00421.
let batchSeq = 412;
function batches(
  componentId: string,
  facilityId: string,
  lineId: string,
  year: number,
  monthly: [month: number, qty: number][],
  woPrefix: string,
): ProductionBatch[] {
  return monthly.map(([m, qty]) => {
    const id = year === 2026 ? `BATCH-2026-01${190 + m - 11}` : `BATCH-2027-00${batchSeq++}`;
    const from = `${year}-${String(m).padStart(2, "0")}-01`;
    const to = monthEnd(year, m);
    const mesSourceId = `SRC-MES-${id}`;
    const workOrder = `${woPrefix}-${year}${String(m).padStart(2, "0")}`;
    batchSources.push({
      id: mesSourceId,
      finding: `${qty.toLocaleString("en-US")} units produced ${from} – ${to}`,
      evidenceId: year === 2026 ? "EV-MES-2026Q4" : "EV-MES-2027",
      locator: {
        type: "system_record",
        system: "MES Production Export",
        recordId: id,
        fields: { component: componentId, facility: facilityId, line: lineId, period_start: from, period_end: to, good_units: String(qty), work_order: workOrder },
      },
      extractionConfidence: 0.99,
      extractionMethod: "structured_import",
      usedIn: ["Production records", "45X credit calculation", "MACR production weighting"],
    });
    return {
      id,
      componentId,
      facilityId,
      lineId,
      productionDate: from,
      periodEnd: to,
      quantity: qty,
      workOrder,
      mesSourceId,
      workOrderEvidenceId: "EV-WO-2027",
    };
  });
}

const allBatches: ProductionBatch[] = [
  // Late-December 2026 lot built on BOM v3.1 and sold in January 2027.
  ...batches("CMP-2170", "FAC-ROC", "LN-ROC-1", 2026, [[12, 140_000]], "WO-L1"),
  ...batches("CMP-2170", "FAC-ROC", "LN-ROC-1", 2027, [
    [1, 460_000], [2, 480_000], [3, 540_000], [4, 600_000], [5, 650_000], [6, 700_000],
    [7, 780_000], [8, 840_000], [9, 890_000], [10, 940_000], [11, 960_000], [12, 980_000],
  ], "WO-L1"),
  ...batches("CMP-P280", "FAC-ROC", "LN-ROC-3", 2027, [
    [1, 30_000], [2, 32_000], [3, 34_000], [4, 36_000], [5, 38_000], [6, 40_000],
    [7, 44_000], [8, 46_000], [9, 48_000], [10, 50_000], [11, 50_000], [12, 52_000],
  ], "WO-L3"),
  ...batches("CMP-4680", "FAC-ROC", "LN-ROC-2", 2027, [[9, 20_000], [10, 35_000], [11, 45_000], [12, 50_000]], "WO-L2"),
  ...batches("CMP-VM16", "FAC-BTV", "LN-BTV-A", 2027, [[7, 600], [8, 800], [9, 900], [10, 1_000], [11, 1_100], [12, 1_200]], "LPA-WO"),
];

// Deliberately missing work order: the October 2027 VX-2170 lot (BATCH-2027-00421).
allBatches.find((b) => b.id === "BATCH-2027-00421")!.workOrderEvidenceId = undefined;

/* -------------------------------------------------------------------------- */
/* Sales                                                                      */
/* -------------------------------------------------------------------------- */

type SaleSpec = {
  componentId: string;
  customer: string;
  customerKey: string;
  date: string;
  qty: number;
  relatedParty?: boolean;
  unmatched?: string;
};

const saleSpecs: SaleSpec[] = [];
const months = (fn: (m: number) => SaleSpec | null) => {
  for (let m = 1; m <= 12; m++) {
    const s = fn(m);
    if (s) saleSpecs.push(s);
  }
};
const d = (m: number, day: number) => `2027-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// VX-2170 — Meridian Power Tools (monthly)
const meridianQty = [380_000, 340_000, 380_000, 420_000, 460_000, 500_000, 520_000, 560_000, 600_000, 620_000, 640_000, 660_000];
months((m) => ({ componentId: "CMP-2170", customer: "Meridian Power Tools Inc.", customerKey: "MERIDIAN", date: d(m, 24), qty: meridianQty[m - 1] }));
// VX-2170 — Cascade E-Mobility (quarterly)
[[3, 300_000], [6, 420_000], [9, 520_000], [12, 560_000]].forEach(([m, q]) =>
  saleSpecs.push({ componentId: "CMP-2170", customer: "Cascade E-Mobility Corp.", customerKey: "CASCADE", date: d(m, 28), qty: q }),
);
// VX-2170 — Volterra Energy Storage LLC (related party)
[[9, 110_000], [11, 120_000]].forEach(([m, q]) =>
  saleSpecs.push({ componentId: "CMP-2170", customer: "Volterra Energy Storage LLC", customerKey: "VES", date: d(m, 15), qty: q, relatedParty: true }),
);
// VX-2170 — unmatched sales register line
saleSpecs.push({
  componentId: "CMP-2170",
  customer: "EV0LV Mobility Inc.",
  customerKey: "EVOLV",
  date: d(11, 9),
  qty: 120_000,
  unmatched: "Customer name does not match customer master (closest: “Evolv Mobility, Inc.”, 82% similarity); no invoice located; not allocated to a production lot.",
});
// VX-P280 — Harbor Grid Storage (bi-monthly) & Prairie Utility Storage Partners (quarterly)
[[2, 40_000], [4, 46_000], [6, 50_000], [8, 52_000], [10, 56_000], [12, 60_000]].forEach(([m, q]) =>
  saleSpecs.push({ componentId: "CMP-P280", customer: "Harbor Grid Storage LLC", customerKey: "HARBOR", date: d(m, 20), qty: q }),
);
[[3, 14_000], [6, 16_000], [9, 18_000], [12, 20_000]].forEach(([m, q]) =>
  saleSpecs.push({ componentId: "CMP-P280", customer: "Prairie Utility Storage Partners LP", customerKey: "PRAIRIE", date: d(m, 26), qty: q }),
);
// VX-4680 — Cascade E-Mobility
[[10, 30_000], [11, 42_000], [12, 53_000]].forEach(([m, q]) =>
  saleSpecs.push({ componentId: "CMP-4680", customer: "Cascade E-Mobility Corp.", customerKey: "CASCADE", date: d(m, 18), qty: q }),
);
// VM-16 modules — Harbor Grid Storage
[[9, 1_600], [11, 1_700], [12, 1_700]].forEach(([m, q]) =>
  saleSpecs.push({ componentId: "CMP-VM16", customer: "Harbor Grid Storage LLC", customerKey: "HARBOR", date: d(m, 22), qty: q }),
);

const saleSources: SourceRef[] = [];
const invoiceDocs: EvidenceDocument[] = [];

/** Mock FIFO matcher: allocates sold units to the earliest lots with remaining quantity. */
function allocateFifo(specs: SaleSpec[], lots: ProductionBatch[]): SaleRecord[] {
  const remaining = new Map(lots.map((b) => [b.id, b.quantity]));
  // VX-P280 cells transferred to Lakeshore for VM-16 assembly are consumed first from each month's lot
  // (internal transfer — not a sale). 18 cells per module produced.
  for (const mod of lots.filter((b) => b.componentId === "CMP-VM16")) {
    const month = mod.productionDate.slice(0, 7);
    const cellLot = lots.find((b) => b.componentId === "CMP-P280" && b.productionDate.startsWith(month));
    if (cellLot) remaining.set(cellLot.id, remaining.get(cellLot.id)! - mod.quantity * 18);
  }
  const sorted = [...specs].sort((a, b) => a.date.localeCompare(b.date));
  let invSeq = 40_112;
  return sorted.map((s, idx) => {
    const id = `SAL-${String(idx + 1).padStart(4, "0")}`;
    const invoiceNumber = `INV-27-${invSeq++}`;
    const allocations: SaleRecord["allocations"] = [];
    if (!s.unmatched) {
      let need = s.qty;
      for (const lot of lots.filter((b) => b.componentId === s.componentId && b.periodEnd <= s.date.replace(/-\d\d$/, "-31")).sort((a, b) => a.productionDate.localeCompare(b.productionDate))) {
        if (need <= 0) break;
        const avail = remaining.get(lot.id)!;
        if (avail <= 0 || lot.productionDate > s.date) continue;
        const take = Math.min(avail, need);
        allocations.push({ batchId: lot.id, quantity: take });
        remaining.set(lot.id, avail - take);
        need -= take;
      }
      if (need > 0) throw new Error(`Seed data error: ${id} (${s.componentId}) over-allocates by ${need}`);
    }
    const sourceId = `SRC-SALE-${id}`;
    saleSources.push({
      id: sourceId,
      finding: `${s.qty.toLocaleString("en-US")} units sold to ${s.customer} on ${s.date}`,
      evidenceId: "EV-SALES-2027",
      locator: {
        type: "system_record",
        system: "ERP Sales Register",
        recordId: invoiceNumber,
        fields: { customer: s.customer, ship_date: s.date, item: s.componentId.replace("CMP-", "VX-"), quantity: String(s.qty), related_party_flag: s.relatedParty ? "Y" : "N" },
      },
      extractionConfidence: s.unmatched ? 0.62 : 0.99,
      extractionMethod: "structured_import",
      usedIn: ["Sale records", "45X credit calculation"],
    });
    const invoiceEvidenceId = s.unmatched ? undefined : `EV-${invoiceNumber}`;
    if (invoiceEvidenceId) {
      invoiceDocs.push({
        id: invoiceEvidenceId,
        fileName: `${invoiceNumber}.pdf`,
        title: `Invoice ${invoiceNumber} — ${s.customer}`,
        category: "invoice",
        status: "verified",
        sizeKb: 84 + ((invSeq * 7) % 60),
        receivedAt: `${s.date}T17:00:00Z`,
        source: "erp_export",
        pages: 1,
        links: { componentIds: [s.componentId] },
      });
    }
    const contractEvidenceId = {
      MERIDIAN: "EV-MSA-MERIDIAN",
      CASCADE: "EV-MSA-CASCADE",
      HARBOR: "EV-MSA-HARBOR",
      PRAIRIE: "EV-MSA-PRAIRIE",
      VES: "EV-ICA-VES",
      EVOLV: undefined,
    }[s.customerKey];
    return {
      id,
      invoiceNumber,
      componentId: s.componentId,
      customerName: s.customer,
      customerEntityId: s.relatedParty ? "ENT-VES" : undefined,
      saleDate: s.date,
      quantity: s.qty,
      relatedParty: !!s.relatedParty,
      matchStatus: s.unmatched ? "unmatched" : "matched",
      matchNote: s.unmatched,
      allocations,
      invoiceEvidenceId,
      contractEvidenceId,
      sourceId,
    };
  });
}

const sales = allocateFifo(saleSpecs, allBatches);

/* -------------------------------------------------------------------------- */
/* Evidence documents                                                         */
/* -------------------------------------------------------------------------- */

function attestation(
  id: string,
  supplierId: string,
  from: string,
  to: string,
  opts: { status?: EvidenceDocument["status"]; ein?: string; fileName?: string; receivedAt: string; materialIds: string[]; note?: string; signatory: string },
): EvidenceDocument {
  const sup = suppliers.find((s) => s.id === supplierId)!;
  return {
    id,
    fileName: opts.fileName ?? `${sup.name.split(" ")[0]}_Supplier_Attestation_${from.slice(0, 7)}.pdf`,
    title: `Supplier attestation — ${sup.name} (${from} – ${to})`,
    category: "supplier_attestation",
    status: opts.status ?? "verified",
    sizeKb: 210 + (id.length * 13) % 240,
    receivedAt: opts.receivedAt,
    source: "supplier_portal",
    pages: 3,
    attestation: {
      supplierId,
      ein: opts.ein ?? (sup.ein.value ?? "N/A — foreign supplier"),
      coverage: { from, to },
      penaltyOfPerjury: true,
      signatory: opts.signatory,
      representation:
        "Supplier represents that it is not a prohibited foreign entity and that the listed materials do not include material assistance from a prohibited foreign entity for the coverage period.",
      materialIds: opts.materialIds,
    },
    links: { supplierIds: [supplierId] },
    note: opts.note,
  };
}

const evidence: EvidenceDocument[] = [
  {
    id: "EV-BOM-2027", fileName: "2027_BOM_Master.xlsx", title: "BOM master workbook — FY2027", category: "bom", status: "verified",
    sizeKb: 1_842, receivedAt: "2028-01-09T15:12:00Z", source: "file_upload",
    links: { componentIds: ["CMP-2170", "CMP-4680", "CMP-P280", "CMP-VM16"] },
  },
  {
    id: "EV-BOM-2026", fileName: "2026_H2_BOM_Master.xlsx", title: "BOM master workbook — H2 2026", category: "bom", status: "superseded",
    sizeKb: 1_406, receivedAt: "2028-01-09T15:12:00Z", source: "file_upload", supersededBy: "EV-BOM-2027",
    links: { componentIds: ["CMP-2170"] }, note: "Retained for BOM v3.1, which governs the December 2026 lot sold in January 2027.",
  },
  {
    id: "EV-SUPMASTER", fileName: "Supplier_Master_2027-12.csv", title: "Supplier master export (Dec 2027)", category: "supplier_master", status: "verified",
    sizeKb: 96, receivedAt: "2028-01-10T10:41:00Z", source: "erp_export", links: {},
  },
  {
    id: "EV-MES-2027", fileName: "MES_Production_Export_FY2027.csv", title: "MES production export — FY2027", category: "mes_extract", status: "verified",
    sizeKb: 3_210, receivedAt: "2028-01-11T08:03:00Z", source: "mes_import", links: { facilityIds: ["FAC-ROC", "FAC-BTV"] },
  },
  {
    id: "EV-MES-2026Q4", fileName: "MES_Production_Export_2026Q4.csv", title: "MES production export — Q4 2026", category: "mes_extract", status: "verified",
    sizeKb: 812, receivedAt: "2028-01-11T08:03:00Z", source: "mes_import", links: { facilityIds: ["FAC-ROC"] },
  },
  {
    id: "EV-WO-2027", fileName: "Work_Order_Extract_FY2027.xlsx", title: "Work order extract — FY2027", category: "work_order", status: "verified",
    sizeKb: 1_120, receivedAt: "2028-01-11T08:10:00Z", source: "erp_export", links: {},
    note: "Work order WO-L1-202710 (BATCH-2027-00421) is not present in the extract.",
  },
  {
    id: "EV-SALES-2027", fileName: "ERP_Sales_Register_FY2027.xlsx", title: "ERP sales register — FY2027", category: "sales_report", status: "verified",
    sizeKb: 640, receivedAt: "2028-01-12T13:22:00Z", source: "erp_export", links: {},
  },
  {
    id: "EV-CAPTEST-2170", fileName: "VX2170_Capacity_Test_2027.pdf", title: "VX-2170 rated capacity test report", category: "capacity_test", status: "verified",
    sizeKb: 2_480, receivedAt: "2027-02-14T16:30:00Z", source: "file_upload", pages: 12, links: { componentIds: ["CMP-2170"] },
  },
  {
    id: "EV-CAPTEST-P280", fileName: "VXP280_Rated_Capacity_Report_2026.pdf", title: "VX-P280 rated capacity & energy density report", category: "capacity_test", status: "verified",
    sizeKb: 3_015, receivedAt: "2026-12-04T11:00:00Z", source: "file_upload", pages: 18, links: { componentIds: ["CMP-P280"] },
  },
  {
    id: "EV-DATASHEET-4680", fileName: "VX4680_Product_Datasheet_revC.pdf", title: "VX-4680 product datasheet (rev C)", category: "other", status: "conflicting",
    sizeKb: 640, receivedAt: "2027-09-02T09:15:00Z", source: "file_upload", pages: 2, links: { componentIds: ["CMP-4680"] },
    note: "Marketing datasheet — not a capacity test. States 26.0 Ah; engineering spec ES-4680-002 states 25.4 Ah minimum.",
  },
  {
    id: "EV-SPEC-4680", fileName: "VX4680_Engineering_Spec_ES-4680-002.pdf", title: "VX-4680 engineering specification ES-4680-002", category: "other", status: "conflicting",
    sizeKb: 1_210, receivedAt: "2027-07-28T14:40:00Z", source: "file_upload", pages: 9, links: { componentIds: ["CMP-4680"] },
  },
  {
    id: "EV-MODSPEC-VM16", fileName: "VM16_Module_Specification_and_Test.pdf", title: "VM-16 module specification & aggregate capacity test", category: "capacity_test", status: "verified",
    sizeKb: 2_204, receivedAt: "2027-08-19T12:00:00Z", source: "file_upload", pages: 14, links: { componentIds: ["CMP-VM16"] },
  },
  {
    id: "EV-ENTITY-MAP", fileName: "Volterra_Legal_Entity_Chart_2027.pdf", title: "Legal entity chart & intercompany map — 2027", category: "entity_documentation", status: "verified",
    sizeKb: 388, receivedAt: "2028-01-08T09:30:00Z", source: "file_upload", pages: 4, links: { entityIds: ["ENT-VBS", "ENT-VBM", "ENT-VES"] },
  },
  {
    id: "EV-CMA-DRAFT", fileName: "Lakeshore_Contract_Manufacturing_Agreement_DRAFT_v4.docx", title: "Contract manufacturing agreement — Lakeshore (draft v4, unsigned)", category: "contract", status: "pending_review",
    sizeKb: 274, receivedAt: "2028-01-22T18:05:00Z", source: "email_intake", pages: 31, links: { componentIds: ["CMP-VM16"], entityIds: ["ENT-LPA"], facilityIds: ["FAC-BTV"] },
    note: "Draft does not include a §45X claimant clause or signed Contract Manufacturing Certification Statement.",
  },
  {
    id: "EV-48C-ROC", fileName: "Rochester_48C_Confirmation_Memo.pdf", title: "Section 48C confirmation memo — Rochester Cell Plant", category: "section_48c", status: "verified",
    sizeKb: 156, receivedAt: "2028-01-15T10:20:00Z", source: "file_upload", pages: 2, links: { facilityIds: ["FAC-ROC"] },
  },
  {
    id: "EV-OWN-1203", fileName: "Northstar_Ownership_Disclosure_2027.pdf", title: "Ownership disclosure — Northstar Cathode Materials", category: "supplier_attestation", status: "verified",
    sizeKb: 420, receivedAt: "2027-01-20T09:00:00Z", source: "supplier_portal", pages: 5, links: { supplierIds: ["SUP-1203"] },
  },
  {
    id: "EV-OWN-1842", fileName: "QSM_Corporate_Profile_2027.pdf", title: "Qingdao Separator Materials — corporate profile", category: "other", status: "received",
    sizeKb: 1_330, receivedAt: "2027-11-30T03:12:00Z", source: "email_intake", pages: 6, links: { supplierIds: ["SUP-1842"] },
    note: "Identifies Singapore holding company only. Beneficial owners not disclosed.",
  },
  {
    id: "EV-OWN-1377", fileName: "Huayu_New_Energy_Annual_Report_2026_excerpt.pdf", title: "Huayu New Energy Group — annual report excerpt", category: "other", status: "verified",
    sizeKb: 2_950, receivedAt: "2027-05-06T08:00:00Z", source: "file_upload", pages: 4, links: { supplierIds: ["SUP-1377"] },
  },
  {
    id: "EV-QUEST-1519", fileName: "Huaxin_PFE_Questionnaire_Response.pdf", title: "Huaxin Electrolyte — PFE questionnaire response (incomplete)", category: "other", status: "received",
    sizeKb: 310, receivedAt: "2027-12-12T02:44:00Z", source: "email_intake", pages: 7, links: { supplierIds: ["SUP-1519"] },
  },
  {
    id: "EV-OWN-1733", fileName: "Arcadia_Group_Ownership_Statement.pdf", title: "Arcadia Group — ownership statement", category: "other", status: "verified",
    sizeKb: 180, receivedAt: "2027-01-25T09:00:00Z", source: "supplier_portal", pages: 1, links: { supplierIds: ["SUP-1733"] },
  },
  {
    id: "EV-OWN-1869", fileName: "Hoshino_Ownership_Statement.pdf", title: "Hoshino Fine Chemicals — ownership statement", category: "other", status: "verified",
    sizeKb: 175, receivedAt: "2027-01-25T09:00:00Z", source: "supplier_portal", pages: 1, links: { supplierIds: ["SUP-1869"] },
  },
  {
    id: "EV-OWN-1902", fileName: "PacificRim_Corporate_Registry_Extract.pdf", title: "Pacific Rim Electronics — corporate registry extract", category: "other", status: "received",
    sizeKb: 520, receivedAt: "2027-10-02T05:30:00Z", source: "email_intake", pages: 3, links: { supplierIds: ["SUP-1902"] },
  },
  { id: "EV-MSA-MERIDIAN", fileName: "Meridian_Supply_Agreement_2026.pdf", title: "Supply agreement — Meridian Power Tools", category: "contract", status: "verified", sizeKb: 910, receivedAt: "2026-06-10T09:00:00Z", source: "file_upload", pages: 22, links: { componentIds: ["CMP-2170"] } },
  { id: "EV-MSA-CASCADE", fileName: "Cascade_Master_Supply_Agreement.pdf", title: "Master supply agreement — Cascade E-Mobility", category: "contract", status: "verified", sizeKb: 1_204, receivedAt: "2026-08-15T09:00:00Z", source: "file_upload", pages: 34, links: { componentIds: ["CMP-2170", "CMP-4680"] } },
  { id: "EV-MSA-HARBOR", fileName: "Harbor_Grid_Supply_Agreement.pdf", title: "Supply agreement — Harbor Grid Storage", category: "contract", status: "verified", sizeKb: 1_010, receivedAt: "2026-11-02T09:00:00Z", source: "file_upload", pages: 28, links: { componentIds: ["CMP-P280", "CMP-VM16"] } },
  { id: "EV-MSA-PRAIRIE", fileName: "Prairie_Utility_Supply_Agreement.pdf", title: "Supply agreement — Prairie Utility Storage Partners", category: "contract", status: "verified", sizeKb: 860, receivedAt: "2026-12-01T09:00:00Z", source: "file_upload", pages: 19, links: { componentIds: ["CMP-P280"] } },
  { id: "EV-ICA-VES", fileName: "Intercompany_Supply_Agreement_VBM-VES.pdf", title: "Intercompany supply agreement — VBM → Volterra Energy Storage", category: "contract", status: "verified", sizeKb: 402, receivedAt: "2027-06-30T09:00:00Z", source: "file_upload", pages: 11, links: { componentIds: ["CMP-2170"], entityIds: ["ENT-VBM", "ENT-VES"] } },

  // Supplier attestations
  attestation("EV-ATT-1203-2026", "SUP-1203", "2026-01-01", "2026-12-31", { receivedAt: "2026-01-14T10:00:00Z", materialIds: ["MAT-NMC811"], signatory: "H. Park, CFO", fileName: "Northstar_Supplier_Attestation_2026.pdf" }),
  attestation("EV-ATT-1203-2027Q1", "SUP-1203", "2027-01-01", "2027-03-31", { receivedAt: "2027-01-20T10:00:00Z", materialIds: ["MAT-NMC811"], signatory: "H. Park, CFO", fileName: "Northstar_Supplier_Attestation_2027Q1.pdf", note: "Quarterly attestation; renewal for Q2 2027 was not received." }),
  attestation("EV-ATT-1203-2027H2", "SUP-1203", "2027-07-01", "2027-12-31", { receivedAt: "2027-07-11T10:00:00Z", materialIds: ["MAT-NMC811"], signatory: "H. Park, CFO", fileName: "Northstar_Supplier_Attestation_2027H2.pdf" }),
  attestation("EV-ATT-1842-2027", "SUP-1842", "2026-07-01", "2027-12-31", { status: "pending_review", receivedAt: "2027-02-03T01:20:00Z", materialIds: ["MAT-SEP"], signatory: "Wang Lei, General Manager", fileName: "QSM_NonPFE_Representation_2027.pdf", note: "Representation signed, but ultimate parent not identified." }),
  attestation("EV-ATT-1610-2027", "SUP-1610", "2027-05-01", "2028-04-30", { status: "conflicting", ein: "25-1093383", receivedAt: "2027-05-20T15:00:00Z", materialIds: ["MAT-CUFOIL"], signatory: "R. Novak, President", fileName: "GreatLakesFoil_Attestation_2027.pdf", note: "EIN on attestation (25-1093383) differs from supplier master (25-1093388)." }),
  attestation("EV-ATT-1640", "SUP-1640", "2026-07-01", "2028-03-15", { receivedAt: "2026-06-25T15:00:00Z", materialIds: ["MAT-CUFOIL"], signatory: "T. Bellamy, CEO" }),
  attestation("EV-ATT-1655", "SUP-1655", "2027-01-01", "2028-12-31", { receivedAt: "2026-12-18T15:00:00Z", materialIds: ["MAT-CUFOIL"], signatory: "M. Duarte, CFO" }),
  attestation("EV-ATT-1702", "SUP-1702", "2026-07-01", "2028-02-28", { receivedAt: "2026-06-29T15:00:00Z", materialIds: ["MAT-CAN217", "MAT-CAN468"], signatory: "P. Lindqvist, VP Finance" }),
  attestation("EV-ATT-1708", "SUP-1708", "2026-01-01", "2028-12-31", { receivedAt: "2025-12-15T15:00:00Z", materialIds: ["MAT-ALFOIL"], signatory: "D. Graves, CFO" }),
  attestation("EV-ATT-1733", "SUP-1733", "2026-01-01", "2028-03-31", { receivedAt: "2025-12-20T15:00:00Z", materialIds: ["MAT-BINDER"], signatory: "C. Morel, Directeur Financier" }),
  attestation("EV-ATT-1805", "SUP-1805", "2026-07-01", "2028-03-10", { receivedAt: "2026-06-30T15:00:00Z", materialIds: ["MAT-TABS"], signatory: "G. Fiorentino, Owner" }),
  attestation("EV-ATT-1821", "SUP-1821", "2027-01-01", "2028-12-31", { receivedAt: "2026-12-22T15:00:00Z", materialIds: ["MAT-GRAPH"], signatory: "L. Ashworth, CFO" }),
  attestation("EV-ATT-1840", "SUP-1840", "2027-01-01", "2028-12-31", { receivedAt: "2026-12-21T15:00:00Z", materialIds: ["MAT-SEP"], signatory: "K. Boateng, CFO" }),
  attestation("EV-ATT-1856", "SUP-1856", "2027-01-01", "2028-12-31", { receivedAt: "2026-12-19T15:00:00Z", materialIds: ["MAT-LFP"], signatory: "S. Whitaker, CEO" }),
  attestation("EV-ATT-1869", "SUP-1869", "2027-01-01", "2028-12-31", { receivedAt: "2026-12-17T15:00:00Z", materialIds: ["MAT-ELEC"], signatory: "Y. Tanaka, President" }),
  attestation("EV-ATT-1874", "SUP-1874", "2027-01-01", "2028-12-31", { receivedAt: "2026-12-16T15:00:00Z", materialIds: ["MAT-BINDLFP"], signatory: "A. Kowalski, CFO" }),
  attestation("EV-ATT-1890", "SUP-1890", "2027-01-01", "2028-12-31", { receivedAt: "2026-12-16T15:00:00Z", materialIds: ["MAT-PCASE", "MAT-ENCL"], signatory: "B. Haines, Managing Member" }),
  attestation("EV-ATT-1915", "SUP-1915", "2027-06-01", "2028-12-31", { receivedAt: "2027-06-04T15:00:00Z", materialIds: ["MAT-HARNESS"], signatory: "F. Odum, President" }),
  attestation("EV-ATT-1925", "SUP-1925", "2027-06-01", "2028-12-31", { receivedAt: "2027-06-04T15:00:00Z", materialIds: ["MAT-BUSBAR"], signatory: "N. Russo, CFO" }),
  ...invoiceDocs,
];

/* -------------------------------------------------------------------------- */
/* Provenance: hand-curated source pointers                                   */
/* -------------------------------------------------------------------------- */

const curatedSources: SourceRef[] = [
  {
    id: "SRC-CAP-2170",
    finding: "Rated capacity: 5.2 Ah",
    evidenceId: "EV-CAPTEST-2170",
    locator: {
      type: "document",
      page: 4,
      section: "4.2 Rated Capacity Test (IEC 61960-3, 0.2C discharge at 25 °C)",
      excerpt:
        "Five cells drawn from production lot WO-L1-202701 were charged at CC-CV to 4.20 V and discharged at 0.2 C to 2.50 V. The measured discharge capacity of the test unit was 5.21 Ah at the specified test conditions (mean of five cells; σ = 0.02 Ah). The rated capacity is therefore declared as 5.2 Ah.",
      highlight: "the measured discharge capacity of the test unit was 5.21 Ah at the specified test conditions",
    },
    extractionConfidence: 0.98,
    extractionMethod: "mock_extraction",
    usedIn: ["VX-2170 2027 eligibility determination", "45X credit calculation (kWh per unit)"],
  },
  {
    id: "SRC-VOLT-2170",
    finding: "Nominal voltage: 3.6 V",
    evidenceId: "EV-CAPTEST-2170",
    locator: { type: "document", page: 3, section: "3.1 Cell identification", excerpt: "Model VX-2170 — cylindrical 21700 lithium-ion cell. Nominal voltage 3.6 V; charge cut-off 4.20 V; discharge cut-off 2.50 V.", highlight: "Nominal voltage 3.6 V" },
    extractionConfidence: 0.99,
    extractionMethod: "mock_extraction",
    usedIn: ["45X credit calculation (kWh per unit)"],
  },
  {
    id: "SRC-ED-2170",
    finding: "Volumetric energy density: 712 Wh/L",
    evidenceId: "EV-CAPTEST-2170",
    locator: { type: "document", page: 6, section: "4.4 Energy density", excerpt: "Using the measured energy of 18.76 Wh and the nominal cell volume of 26.35 cm³, the volumetric energy density is 712 Wh/L.", highlight: "the volumetric energy density is 712 Wh/L" },
    extractionConfidence: 0.95,
    extractionMethod: "mock_extraction",
    usedIn: ["Battery cell classification (≥100 Wh/L)"],
  },
  {
    id: "SRC-CPR-2170",
    finding: "Capacity-to-power ratio: 0.12 : 1",
    evidenceId: "EV-CAPTEST-2170",
    locator: { type: "document", page: 7, section: "4.5 Maximum continuous discharge", excerpt: "Maximum continuous discharge current 45 A (162 W at nominal voltage). Capacity-to-power ratio 18.72 Wh : 162 W ≈ 0.12 : 1.", highlight: "≈ 0.12 : 1" },
    extractionConfidence: 0.93,
    extractionMethod: "mock_extraction",
    usedIn: ["Battery cell capacity limit (≤100:1)"],
  },
  {
    id: "SRC-CAP-P280",
    finding: "Rated capacity: 280 Ah",
    evidenceId: "EV-CAPTEST-P280",
    locator: { type: "document", page: 5, section: "5.1 Rated capacity", excerpt: "At 0.5 C / 25 °C the mean discharge capacity across 10 samples was 283.4 Ah. The declared rated capacity is 280 Ah.", highlight: "The declared rated capacity is 280 Ah" },
    extractionConfidence: 0.99,
    extractionMethod: "mock_extraction",
    usedIn: ["VX-P280 2027 eligibility determination", "45X credit calculation (kWh per unit)"],
  },
  {
    id: "SRC-VOLT-P280",
    finding: "Nominal voltage: 3.2 V",
    evidenceId: "EV-CAPTEST-P280",
    locator: { type: "document", page: 3, section: "2. Cell identification", excerpt: "Model VX-P280 — prismatic LiFePO4 cell, nominal voltage 3.2 V, aluminum hard case.", highlight: "nominal voltage 3.2 V" },
    extractionConfidence: 0.99,
    extractionMethod: "mock_extraction",
    usedIn: ["45X credit calculation (kWh per unit)"],
  },
  {
    id: "SRC-ED-P280",
    finding: "Volumetric energy density: 368 Wh/L",
    evidenceId: "EV-CAPTEST-P280",
    locator: { type: "document", page: 8, section: "5.4 Energy density", excerpt: "Volumetric energy density (measured energy / external case volume): 368 Wh/L.", highlight: "368 Wh/L" },
    extractionConfidence: 0.97,
    extractionMethod: "mock_extraction",
    usedIn: ["Battery cell classification (≥100 Wh/L)"],
  },
  {
    id: "SRC-CPR-P280",
    finding: "Capacity-to-power ratio: 2 : 1",
    evidenceId: "EV-CAPTEST-P280",
    locator: { type: "document", page: 9, section: "5.5 Rate capability", excerpt: "Maximum continuous discharge 0.5 C (140 A, 448 W). Capacity-to-power ratio 896 Wh : 448 W = 2 : 1.", highlight: "= 2 : 1" },
    extractionConfidence: 0.96,
    extractionMethod: "mock_extraction",
    usedIn: ["Battery cell capacity limit (≤100:1)"],
  },
  {
    id: "SRC-CAP-4680-DS",
    finding: "Rated capacity per datasheet: 26.0 Ah",
    evidenceId: "EV-DATASHEET-4680",
    locator: { type: "document", page: 1, section: "Key specifications", excerpt: "Typical capacity 26.0 Ah · Nominal voltage 3.6 V · Energy 93.6 Wh · Format 46-series cylindrical.", highlight: "Typical capacity 26.0 Ah" },
    extractionConfidence: 0.83,
    extractionMethod: "mock_extraction",
    usedIn: ["VX-4680 credit estimate (assumption)"],
  },
  {
    id: "SRC-CAP-4680-SPEC",
    finding: "Minimum rated capacity per engineering spec: 25.4 Ah",
    evidenceId: "EV-SPEC-4680",
    locator: { type: "document", page: 3, section: "2.3 Electrical performance requirements", excerpt: "Minimum rated capacity: 25.4 Ah at 0.33 C, 25 °C, following formation and 3 conditioning cycles.", highlight: "Minimum rated capacity: 25.4 Ah" },
    extractionConfidence: 0.91,
    extractionMethod: "mock_extraction",
    usedIn: ["Rated capacity conflict check"],
  },
  {
    id: "SRC-VOLT-4680",
    finding: "Nominal voltage: 3.6 V",
    evidenceId: "EV-SPEC-4680",
    locator: { type: "document", page: 2, section: "2.1 Identification", excerpt: "Nominal voltage 3.6 V; charge cut-off 4.20 V.", highlight: "Nominal voltage 3.6 V" },
    extractionConfidence: 0.97,
    extractionMethod: "mock_extraction",
    usedIn: ["45X credit calculation (kWh per unit)"],
  },
  {
    id: "SRC-CAP-VM16",
    finding: "Aggregate module capacity: 16.13 kWh",
    evidenceId: "EV-MODSPEC-VM16",
    locator: { type: "document", page: 6, section: "3.2 Aggregate capacity", excerpt: "18 × VX-P280 cells in series (18S1P), 57.6 V nominal. Aggregate capacity 18 × 896 Wh = 16,128 Wh (16.13 kWh). Measured: 16.31 kWh at 0.5 C.", highlight: "Aggregate capacity 18 × 896 Wh = 16,128 Wh (16.13 kWh)" },
    extractionConfidence: 0.97,
    extractionMethod: "mock_extraction",
    usedIn: ["VM-16 classification (≥7 kWh)", "45X credit calculation"],
  },
  {
    id: "SRC-ENTMAP",
    finding: "Volterra Battery Manufacturing LLC operates the Rochester Cell Plant and invoices customers",
    evidenceId: "EV-ENTITY-MAP",
    locator: { type: "document", page: 2, section: "Operating entities", excerpt: "Volterra Battery Manufacturing LLC (EIN 88-4410391), a wholly owned subsidiary of Volterra Battery Systems, Inc., owns and operates the Rochester Cell Plant, holds title to work in process and finished cells, and invoices third-party customers.", highlight: "owns and operates the Rochester Cell Plant, holds title to work in process and finished cells, and invoices third-party customers" },
    extractionConfidence: 0.94,
    extractionMethod: "mock_extraction",
    usedIn: ["Claimant determination — Rochester components", "Related-party mapping"],
  },
  {
    id: "SRC-ENTMAP-VES",
    finding: "Volterra Energy Storage LLC is under common control with the claimant",
    evidenceId: "EV-ENTITY-MAP",
    locator: { type: "document", page: 3, section: "Affiliates", excerpt: "Volterra Energy Storage LLC (EIN 88-4410522) — 100% owned by Volterra Battery Systems, Inc. Purchases cells from Volterra Battery Manufacturing LLC under the intercompany supply agreement for residential storage systems.", highlight: "100% owned by Volterra Battery Systems, Inc." },
    extractionConfidence: 0.95,
    extractionMethod: "mock_extraction",
    usedIn: ["Related-party sale treatment"],
  },
  {
    id: "SRC-CMA-DRAFT",
    finding: "Lakeshore Precision Assembly assembles VM-16 modules under a draft contract manufacturing agreement",
    evidenceId: "EV-CMA-DRAFT",
    locator: { type: "document", page: 4, section: "§2.1 Services", excerpt: "Contractor shall assemble VM-16 battery modules at its Batavia, New York facility using cells consigned by Volterra … [§9 Tax Credits — RESERVED; parties to discuss]", highlight: "[§9 Tax Credits — RESERVED; parties to discuss]" },
    extractionConfidence: 0.78,
    extractionMethod: "mock_extraction",
    usedIn: ["VM-16 claimant determination"],
  },
  {
    id: "SRC-48C-ROC",
    finding: "No Section 48C allocation for Rochester Cell Plant property",
    evidenceId: "EV-48C-ROC",
    locator: { type: "document", page: 1, section: "Conclusion", excerpt: "Neither Volterra Battery Manufacturing LLC nor any affiliate applied for or received a Section 48C allocation for property located at the Rochester Cell Plant after August 16, 2022.", highlight: "applied for or received a Section 48C allocation for property located at the Rochester Cell Plant" },
    extractionConfidence: 0.96,
    extractionMethod: "mock_extraction",
    usedIn: ["Section 48C exclusion check — Rochester"],
  },
  {
    id: "SRC-FACILITY-ROC",
    finding: "Production facility: Rochester, NY",
    evidenceId: "EV-MES-2027",
    locator: { type: "system_record", system: "MES Facility Master", recordId: "SITE-ROC-01", fields: { site_name: "Rochester Cell Plant", address: "1450 Lyell Innovation Pkwy, Rochester, NY 14606", country: "US", operator: "Volterra Battery Manufacturing LLC" } },
    extractionConfidence: 0.99,
    extractionMethod: "structured_import",
    usedIn: ["U.S. production check"],
  },
  {
    id: "SRC-FACILITY-BTV",
    finding: "Production facility: Batavia, NY",
    evidenceId: "EV-MES-2027",
    locator: { type: "system_record", system: "MES Facility Master", recordId: "SITE-BTV-01", fields: { site_name: "Batavia Module Plant", address: "220 Commerce Dr, Batavia, NY 14020", country: "US", operator: "Lakeshore Precision Assembly LLC" } },
    extractionConfidence: 0.99,
    extractionMethod: "structured_import",
    usedIn: ["U.S. production check"],
  },
  {
    id: "SRC-SUPMASTER-1203",
    finding: "Northstar Cathode Materials LLC — EIN 62-1847730",
    evidenceId: "EV-SUPMASTER",
    locator: { type: "spreadsheet", sheet: "Supplier_Master_2027-12.csv", row: 118, column: "tax_id", cellValue: "62-1847730" },
    extractionConfidence: 0.99,
    extractionMethod: "structured_import",
    usedIn: ["Supplier identity", "Attestation EIN match"],
  },
  {
    id: "SRC-SUPMASTER-1610",
    finding: "Great Lakes Foil Co. — EIN 25-1093388 (supplier master)",
    evidenceId: "EV-SUPMASTER",
    locator: { type: "spreadsheet", sheet: "Supplier_Master_2027-12.csv", row: 164, column: "tax_id", cellValue: "25-1093388" },
    extractionConfidence: 0.99,
    extractionMethod: "structured_import",
    usedIn: ["Supplier identity", "Attestation EIN match"],
  },
  {
    id: "SRC-SUPMASTER-GENERIC",
    finding: "Supplier EIN per supplier master",
    evidenceId: "EV-SUPMASTER",
    locator: { type: "spreadsheet", sheet: "Supplier_Master_2027-12.csv", row: 0, column: "tax_id", cellValue: "see supplier record" },
    extractionConfidence: 0.99,
    extractionMethod: "structured_import",
    usedIn: ["Supplier identity"],
  },
  {
    id: "SRC-ATT-1610-EIN",
    finding: "Great Lakes Foil attestation states EIN 25-1093383",
    evidenceId: "EV-ATT-1610-2027",
    locator: { type: "document", page: 1, section: "Supplier identification", excerpt: "Supplier: Great Lakes Foil Co., 2200 Bayfront Hwy, Erie, PA. Federal EIN: 25-1093383.", highlight: "Federal EIN: 25-1093383" },
    extractionConfidence: 0.88,
    extractionMethod: "mock_extraction",
    usedIn: ["Attestation EIN match"],
  },
  {
    id: "SRC-OWN-1203",
    finding: "Ultimate parent: Northstar Materials Holdings Co., Ltd. (South Korea)",
    evidenceId: "EV-OWN-1203",
    locator: { type: "document", page: 2, section: "Ownership structure", excerpt: "Northstar Cathode Materials LLC is a wholly owned subsidiary of Northstar Materials Holdings Co., Ltd., a company listed on the Korea Exchange. No shareholder holds more than 9% of the parent's voting securities.", highlight: "wholly owned subsidiary of Northstar Materials Holdings Co., Ltd." },
    extractionConfidence: 0.96,
    extractionMethod: "mock_extraction",
    usedIn: ["Supplier PFE status", "MACR qualifying numerator"],
  },
  {
    id: "SRC-OWN-1377",
    finding: "Ultimate parent: Huayu New Energy Group Co., Ltd. (state-asset shareholder)",
    evidenceId: "EV-OWN-1377",
    locator: { type: "document", page: 3, section: "Shareholding structure", excerpt: "The Company holds 72% of Tianjin Huayu Carbon Materials Co., Ltd. The Company's controlling shareholder is the Tianjin Municipal State-owned Assets Investment Platform.", highlight: "controlling shareholder is the Tianjin Municipal State-owned Assets Investment Platform" },
    extractionConfidence: 0.86,
    extractionMethod: "mock_extraction",
    usedIn: ["Supplier PFE status"],
  },
  {
    id: "SRC-OWN-1842",
    finding: "Immediate parent: Harborline Advanced Materials Pte. Ltd. (Singapore)",
    evidenceId: "EV-OWN-1842",
    locator: { type: "document", page: 2, section: "Corporate information", excerpt: "Qingdao Separator Materials Ltd. is a wholly foreign-owned enterprise whose sole shareholder is Harborline Advanced Materials Pte. Ltd. (Singapore). Information regarding shareholders of Harborline is confidential.", highlight: "Information regarding shareholders of Harborline is confidential." },
    extractionConfidence: 0.71,
    extractionMethod: "mock_extraction",
    usedIn: ["Supplier PFE status", "MACR qualifying numerator"],
  },
  {
    id: "SRC-OWN-1519",
    finding: "Ultimate parent: Huaxin Chemical Group Co., Ltd. (China)",
    evidenceId: "EV-QUEST-1519",
    locator: { type: "document", page: 2, section: "Q3 Ownership", excerpt: "Q3. Identify all entities holding ≥25% ownership. A: Huaxin Chemical Group Co., Ltd. (100%). Q7. Effective control / licensing agreements with foreign entities of concern: [no response]", highlight: "Q7. Effective control / licensing agreements with foreign entities of concern: [no response]" },
    extractionConfidence: 0.66,
    extractionMethod: "mock_extraction",
    usedIn: ["Supplier PFE status"],
  },
  {
    id: "SRC-OWN-1733",
    finding: "Ultimate parent: Arcadia Group SA (France)",
    evidenceId: "EV-OWN-1733",
    locator: { type: "document", page: 1, section: "Statement", excerpt: "Arcadia Fluoropolymers SAS is wholly owned by Arcadia Group SA, listed on Euronext Paris.", highlight: "wholly owned by Arcadia Group SA" },
    extractionConfidence: 0.97,
    extractionMethod: "mock_extraction",
    usedIn: ["Supplier PFE status"],
  },
  {
    id: "SRC-OWN-1869",
    finding: "Ultimate parent: Hoshino Fine Chemicals Co., Ltd. (Japan)",
    evidenceId: "EV-OWN-1869",
    locator: { type: "document", page: 1, section: "Statement", excerpt: "Hoshino Electrolyte America, Inc. is a wholly owned subsidiary of Hoshino Fine Chemicals Co., Ltd. (TSE Prime).", highlight: "wholly owned subsidiary of Hoshino Fine Chemicals Co., Ltd." },
    extractionConfidence: 0.97,
    extractionMethod: "mock_extraction",
    usedIn: ["Supplier PFE status"],
  },
  {
    id: "SRC-OWN-1902",
    finding: "Ultimate parent: Pacific Rim Electronics Holdings Ltd. (Hong Kong SAR)",
    evidenceId: "EV-OWN-1902",
    locator: { type: "document", page: 1, section: "Registry extract", excerpt: "Shareholder: Pacific Rim Electronics Holdings Ltd. (Hong Kong) — 100%. Directors: 3 (names redacted in extract).", highlight: "Pacific Rim Electronics Holdings Ltd. (Hong Kong) — 100%" },
    extractionConfidence: 0.81,
    extractionMethod: "mock_extraction",
    usedIn: ["Supplier PFE status"],
  },
  {
    id: "SRC-ATT-1203-Q1",
    finding: "Northstar attestation coverage: Jan 1 – Mar 31, 2027",
    evidenceId: "EV-ATT-1203-2027Q1",
    locator: { type: "document", page: 1, section: "Coverage period", excerpt: "This certification applies to materials shipped during the period January 1, 2027 through March 31, 2027 and is made under penalty of perjury.", highlight: "January 1, 2027 through March 31, 2027" },
    extractionConfidence: 0.97,
    extractionMethod: "mock_extraction",
    usedIn: ["Attestation coverage — VX-2170 BOM v3.2"],
  },
  {
    id: "SRC-ATT-1842",
    finding: "Qingdao Separator non-PFE representation (2027), ultimate parent not identified",
    evidenceId: "EV-ATT-1842-2027",
    locator: { type: "document", page: 2, section: "Representations", excerpt: "Supplier represents that it is not a prohibited foreign entity … Ultimate parent entity: ______ (left blank)", highlight: "Ultimate parent entity: ______ (left blank)" },
    extractionConfidence: 0.74,
    extractionMethod: "mock_extraction",
    usedIn: ["Supplier PFE status", "MACR qualifying numerator"],
  },
  {
    id: "SRC-ESTIMATE-VM16-CLAIMANT",
    finding: "Volterra expects to claim VM-16 credits (management assumption)",
    evidenceId: "EV-CMA-DRAFT",
    locator: { type: "document", page: 1, section: "Cover email (Jan 22, 2028)", excerpt: "Our working assumption is that Volterra will be the claimant for VM-16 since we own the design and consign the cells — Legal to confirm with Lakeshore.", highlight: "Our working assumption is that Volterra will be the claimant" },
    extractionConfidence: 0.8,
    extractionMethod: "mock_extraction",
    usedIn: ["VM-16 claimant (assumption)"],
  },
];

/* -------------------------------------------------------------------------- */
/* Dataset                                                                    */
/* -------------------------------------------------------------------------- */

export const seedDataset: ManufacturerDataset = {
  company: { name: "Volterra Battery Systems, Inc.", hqEntityId: "ENT-VBS", fiscalYearEnd: "December 31" },
  taxYear: 2027,
  asOf: "2028-02-12",
  people,
  entities: [
    { id: "ENT-VBS", name: "Volterra Battery Systems, Inc.", ein: { value: "88-4410273", kind: "known", sourceId: "SRC-ENTMAP" }, role: "parent", jurisdiction: "Delaware", relatedToGroup: true, sourceId: "SRC-ENTMAP" },
    { id: "ENT-VBM", name: "Volterra Battery Manufacturing LLC", ein: { value: "88-4410391", kind: "known", sourceId: "SRC-ENTMAP" }, role: "manufacturer", jurisdiction: "Delaware", parentId: "ENT-VBS", relatedToGroup: true, sourceId: "SRC-ENTMAP" },
    { id: "ENT-VES", name: "Volterra Energy Storage LLC", ein: { value: "88-4410522", kind: "known", sourceId: "SRC-ENTMAP-VES" }, role: "sales_affiliate", jurisdiction: "Delaware", parentId: "ENT-VBS", relatedToGroup: true, sourceId: "SRC-ENTMAP-VES" },
    { id: "ENT-LPA", name: "Lakeshore Precision Assembly LLC", ein: { value: "16-2280944", kind: "known", sourceId: "SRC-CMA-DRAFT" }, role: "contract_manufacturer", jurisdiction: "New York", relatedToGroup: false, sourceId: "SRC-CMA-DRAFT" },
  ],
  facilities: [
    {
      id: "FAC-ROC",
      name: "Rochester, NY Cell Plant",
      shortName: "Rochester Cell Plant",
      address: "1450 Lyell Innovation Pkwy",
      city: "Rochester",
      state: "NY",
      operatorEntityId: "ENT-VBM",
      ownerEntityId: "ENT-VBM",
      lines: [
        { id: "LN-ROC-1", name: "Line 1 — Cylindrical 21700" },
        { id: "LN-ROC-2", name: "Line 2 — Cylindrical 46-series" },
        { id: "LN-ROC-3", name: "Line 3 — Prismatic LFP" },
        { id: "LN-ROC-P", name: "Cathode pilot line" },
      ],
      section48C: { value: "no_allocation_confirmed", kind: "known", sourceId: "SRC-48C-ROC" },
      registrationNumber: { value: "45X-27-ROC-004417", kind: "known", note: "Mock IRS pre-filing registration number" },
      sourceId: "SRC-FACILITY-ROC",
    },
    {
      id: "FAC-BTV",
      name: "Batavia, NY Module Plant",
      shortName: "Batavia Module Plant",
      address: "220 Commerce Dr",
      city: "Batavia",
      state: "NY",
      operatorEntityId: "ENT-LPA",
      ownerEntityId: "ENT-LPA",
      lines: [{ id: "LN-BTV-A", name: "Module Assembly Line A (Lakeshore)" }],
      section48C: { value: "unknown", kind: "missing", note: "Lakeshore has not confirmed whether any Batavia property received a post-2022 §48C allocation." },
      registrationNumber: { value: null, kind: "missing", note: "Not registered — depends on claimant determination." },
      sourceId: "SRC-FACILITY-BTV",
    },
  ],
  components: [
    {
      id: "CMP-2170",
      sku: "VX-2170",
      name: "VX-2170 Battery Cell",
      shortName: "VX-2170",
      category: "battery_cell",
      description: "21700 cylindrical NMC811 / graphite cell for power tools and light mobility.",
      facilityId: "FAC-ROC",
      lineId: "LN-ROC-1",
      chemistry: "NMC811 / graphite",
      format: "21700 cylindrical",
      productionStart: "2026-07-01",
      bomVersionIds: ["BOM-2170-v3.1", "BOM-2170-v3.2", "BOM-2170-v3.3"],
      capacity: {
        nominalVoltageV: { value: 3.6, kind: "known", sourceId: "SRC-VOLT-2170" },
        ratedCapacityAh: { value: 5.2, kind: "known", sourceId: "SRC-CAP-2170" },
        energyDensityWhPerL: { value: 712, kind: "known", sourceId: "SRC-ED-2170" },
        capacityToPowerRatio: { value: 0.12, kind: "known", sourceId: "SRC-CPR-2170" },
        testStandard: "IEC 61960-3 rated capacity (0.2C, 25 °C)",
        capacityTestEvidenceId: "EV-CAPTEST-2170",
      },
      claimant: {
        claimingEntityId: { value: "ENT-VBM", kind: "known", sourceId: "SRC-ENTMAP" },
        manufacturingEntityId: { value: "ENT-VBM", kind: "known", sourceId: "SRC-ENTMAP" },
        contractManufacturing: { value: false, kind: "known", sourceId: "SRC-ENTMAP" },
        relatedPartyConsiderations: "230,000 cells sold to Volterra Energy Storage LLC (common control). No §45X(a)(3)(B) related-person election on file.",
      },
    },
    {
      id: "CMP-4680",
      sku: "VX-4680",
      name: "VX-4680 Battery Cell",
      shortName: "VX-4680",
      category: "battery_cell",
      description: "46-series large-format cylindrical NMC811 cell for e-mobility. Production started September 2027.",
      facilityId: "FAC-ROC",
      lineId: "LN-ROC-2",
      chemistry: "NMC811 / graphite",
      format: "46-series cylindrical",
      productionStart: "2027-09-01",
      bomVersionIds: ["BOM-4680-v1.0"],
      capacity: {
        nominalVoltageV: { value: 3.6, kind: "known", sourceId: "SRC-VOLT-4680" },
        ratedCapacityAh: {
          value: 26.0,
          kind: "assumption",
          sourceId: "SRC-CAP-4680-DS",
          note: "Estimate uses the datasheet value (26.0 Ah). The engineering spec states 25.4 Ah minimum and no capacity test report has been provided.",
        },
        energyDensityWhPerL: { value: 655, kind: "assumption", sourceId: "SRC-CAP-4680-DS", note: "Derived from datasheet energy and nominal volume; not tested." },
        capacityToPowerRatio: { value: 0.2, kind: "assumption", sourceId: "SRC-CAP-4680-DS", note: "Derived from datasheet; not tested." },
        testStandard: "IEC 61960-3 rated capacity — report not provided",
      },
      claimant: {
        claimingEntityId: { value: "ENT-VBM", kind: "known", sourceId: "SRC-ENTMAP" },
        manufacturingEntityId: { value: "ENT-VBM", kind: "known", sourceId: "SRC-ENTMAP" },
        contractManufacturing: { value: false, kind: "known", sourceId: "SRC-ENTMAP" },
        relatedPartyConsiderations: "All 2027 sales to unrelated customer (Cascade E-Mobility).",
      },
    },
    {
      id: "CMP-P280",
      sku: "VX-P280",
      name: "VX-P280 Prismatic LFP Cell",
      shortName: "VX-P280",
      category: "battery_cell",
      description: "280 Ah prismatic LFP cell for stationary storage. Fully domestic BOM since v2.0.",
      facilityId: "FAC-ROC",
      lineId: "LN-ROC-3",
      chemistry: "LFP / graphite",
      format: "Prismatic, aluminum case",
      productionStart: "2026-10-01",
      bomVersionIds: ["BOM-P280-v2.0"],
      capacity: {
        nominalVoltageV: { value: 3.2, kind: "known", sourceId: "SRC-VOLT-P280" },
        ratedCapacityAh: { value: 280, kind: "known", sourceId: "SRC-CAP-P280" },
        energyDensityWhPerL: { value: 368, kind: "known", sourceId: "SRC-ED-P280" },
        capacityToPowerRatio: { value: 2, kind: "known", sourceId: "SRC-CPR-P280" },
        testStandard: "IEC 62620 rated capacity (0.5C, 25 °C)",
        capacityTestEvidenceId: "EV-CAPTEST-P280",
      },
      claimant: {
        claimingEntityId: { value: "ENT-VBM", kind: "known", sourceId: "SRC-ENTMAP" },
        manufacturingEntityId: { value: "ENT-VBM", kind: "known", sourceId: "SRC-ENTMAP" },
        contractManufacturing: { value: false, kind: "known", sourceId: "SRC-ENTMAP" },
        relatedPartyConsiderations: "All sales to unrelated customers. Cells consigned to Lakeshore for VM-16 assembly are transfers, not sales, and are excluded here.",
      },
    },
    {
      id: "CMP-VM16",
      sku: "VM-16",
      name: "VM-16 Battery Module",
      shortName: "VM-16",
      category: "battery_module_with_cells",
      description: "16.13 kWh, 18S module built from VX-P280 cells. Assembled by Lakeshore Precision Assembly at Batavia, NY.",
      facilityId: "FAC-BTV",
      lineId: "LN-BTV-A",
      chemistry: "LFP",
      format: "18S1P module",
      productionStart: "2027-07-01",
      bomVersionIds: ["BOM-VM16-v1.0"],
      capacity: {
        nominalVoltageV: { value: 57.6, kind: "known", sourceId: "SRC-CAP-VM16" },
        aggregateCapacityKwh: { value: 16.128, kind: "known", sourceId: "SRC-CAP-VM16" },
        energyDensityWhPerL: { value: 214, kind: "known", sourceId: "SRC-CAP-VM16" },
        capacityToPowerRatio: { value: 2, kind: "known", sourceId: "SRC-CAP-VM16" },
        testStandard: "Module aggregate capacity test (0.5C)",
        capacityTestEvidenceId: "EV-MODSPEC-VM16",
      },
      claimant: {
        claimingEntityId: {
          value: "ENT-VBM",
          kind: "assumption",
          sourceId: "SRC-ESTIMATE-VM16-CLAIMANT",
          note: "Management assumption — no signed Contract Manufacturing Certification Statement with Lakeshore.",
        },
        manufacturingEntityId: { value: "ENT-LPA", kind: "known", sourceId: "SRC-CMA-DRAFT" },
        contractManufacturing: { value: true, kind: "known", sourceId: "SRC-CMA-DRAFT" },
        relatedPartyConsiderations: "Lakeshore is unrelated. Integration of VX-P280 cells (produced at a different facility) into VM-16 requires review.",
        notes: "Draft agreement reserves the tax-credit clause. Production began July 2027, before any agreement was executed.",
      },
    },
    {
      id: "CMP-CAM811",
      sku: "VX-CAM811",
      name: "VX-CAM811 Cathode Active Material (pilot)",
      shortName: "VX-CAM811",
      category: "electrode_active_material",
      description: "Pilot-scale NMC811 cathode active material produced on the Rochester pilot line.",
      facilityId: "FAC-ROC",
      lineId: "LN-ROC-P",
      chemistry: "NMC811",
      format: "Powder",
      productionStart: "2027-05-01",
      bomVersionIds: [],
      claimant: {
        claimingEntityId: { value: "ENT-VBM", kind: "known", sourceId: "SRC-ENTMAP" },
        manufacturingEntityId: { value: "ENT-VBM", kind: "known", sourceId: "SRC-ENTMAP" },
        contractManufacturing: { value: false, kind: "known" },
        relatedPartyConsiderations: "Consumed internally; no 2027 sales.",
      },
      evaluationNote:
        "Not evaluated: electrode active materials use a production-cost basis (10% of eligible costs). Cost-accounting data for the pilot line has not been ingested, and no 2027 sales were recorded.",
    },
  ],
  bomVersions,
  materials,
  suppliers,
  evidence,
  sources: [...curatedSources, ...bomSources, ...batchSources, ...saleSources],
  batches: allBatches,
  sales,
};
