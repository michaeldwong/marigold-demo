/**
 * Seeded workflow state (FICTIONAL): tasks, review history, audit trail and
 * integration status. Credit figures inside historical audit events are
 * narrative snapshots from earlier calculation runs; current figures are
 * always derived live from the dataset.
 */

import type { AuditEvent, ReviewEntry, ReviewStage, Task } from "@/lib/compliance/types";

export const seedTasks: Task[] = [
  { id: "T-101", title: "Upload Apr–Jun 2027 supplier attestation", issueId: "ISS-ATT-GAP-SUP-1203", affectedLabel: "Northstar Cathode Materials · VX-2170", ownerId: "P-SC", due: "2028-02-20", evidenceReceived: 0, evidenceRequired: 1, status: "awaiting_upload", createdFrom: "seed" },
  { id: "T-102", title: "Obtain ultimate parent disclosure", issueId: "ISS-OWN-SUP-1842", affectedLabel: "Qingdao Separator Materials (SUP-1842)", ownerId: "P-MR", due: "2028-02-23", evidenceReceived: 0, evidenceRequired: 2, status: "in_progress", createdFrom: "seed" },
  { id: "T-103", title: "Upload VX-4680 rated capacity test report", issueId: "ISS-CAP-MISSING-CMP-4680", affectedLabel: "VX-4680 · Line 2", ownerId: "P-JW", due: "2028-02-19", evidenceReceived: 0, evidenceRequired: 1, status: "awaiting_upload", createdFrom: "seed" },
  { id: "T-104", title: "Reconcile rated capacity (26.0 vs 25.4 Ah)", issueId: "ISS-CAP-CONFLICT-CMP-4680", affectedLabel: "VX-4680 datasheet / ES-4680-002", ownerId: "P-JW", due: "2028-02-21", evidenceReceived: 1, evidenceRequired: 1, status: "needs_review", createdFrom: "seed" },
  { id: "T-105", title: "Execute contract manufacturing certification statement", issueId: "ISS-CLAIMANT-CMP-VM16", affectedLabel: "Lakeshore Precision Assembly · VM-16", ownerId: "P-EM", due: "2028-03-01", evidenceReceived: 0, evidenceRequired: 1, status: "blocked", createdFrom: "seed" },
  { id: "T-106", title: "Decide related-person election; prepare Appendix B", issueId: "ISS-RP-CMP-2170", affectedLabel: "Volterra Energy Storage LLC · VX-2170", ownerId: "P-AP", due: "2028-03-06", evidenceReceived: 0, evidenceRequired: 1, status: "in_progress", createdFrom: "seed" },
  { id: "T-107", title: "Match sales line INV-27-40136 to customer and lots", issueId: "ISS-UNMATCHED-SAL-0025", affectedLabel: "“EV0LV Mobility Inc.” · VX-2170", ownerId: "P-DK", due: "2028-02-16", evidenceReceived: 0, evidenceRequired: 1, status: "awaiting_upload", createdFrom: "seed" },
  { id: "T-108", title: "Request supplier certification", issueId: "ISS-ATT-MISSING-SUP-1791", affectedLabel: "Lumen Carbon Additives", ownerId: "P-SC", due: "2028-02-27", evidenceReceived: 0, evidenceRequired: 1, status: "awaiting_upload", createdFrom: "seed" },
  { id: "T-109", title: "Confirm §48C status for Batavia facility", issueId: "ISS-48C-FAC-BTV", affectedLabel: "Batavia Module Plant", ownerId: "P-EM", due: "2028-03-01", evidenceReceived: 0, evidenceRequired: 1, status: "awaiting_upload", createdFrom: "seed" },
  { id: "T-110", title: "Obtain corrected attestation (EIN mismatch)", issueId: "ISS-EIN-SUP-1610", affectedLabel: "Great Lakes Foil Co.", ownerId: "P-SC", due: "2028-02-24", evidenceReceived: 0, evidenceRequired: 1, status: "awaiting_upload", createdFrom: "seed" },
  { id: "T-111", title: "Renew attestations expiring Feb–Mar 2028", affectedLabel: "Keystone Can · Mohawk Copper · Rochester Precision · Arcadia", ownerId: "P-MR", due: "2028-02-26", evidenceReceived: 1, evidenceRequired: 4, status: "in_progress", createdFrom: "seed" },
  { id: "T-112", title: "Upload missing work order WO-L1-202710", issueId: "ISS-WO-BATCH-2027-00421", affectedLabel: "BATCH-2027-00421 · VX-2170", ownerId: "P-LO", due: "2028-02-22", evidenceReceived: 0, evidenceRequired: 1, status: "awaiting_upload", createdFrom: "seed" },
  { id: "T-113", title: "Complete PFE effective-control review", issueId: "ISS-PFE-SUP-1519", affectedLabel: "Huaxin Electrolyte Materials", ownerId: "P-EM", due: "2028-03-10", evidenceReceived: 0, evidenceRequired: 1, status: "in_progress", createdFrom: "seed" },
  { id: "T-114", title: "Advisor review of VX-P280 determination", affectedLabel: "VX-P280 · Rochester", ownerId: "P-RH", due: "2028-02-02", evidenceReceived: 1, evidenceRequired: 1, status: "complete", createdFrom: "seed" },
];

export const seedReviewStages: Record<string, ReviewStage> = {
  "CMP-2170": "needs_review",
  "CMP-4680": "automated",
  "CMP-P280": "reviewed",
  "CMP-VM16": "needs_review",
  "CMP-CAM811": "automated",
};

export const seedReviews: ReviewEntry[] = [
  {
    id: "RV-001",
    componentId: "CMP-P280",
    at: "2028-02-02T16:12:00Z",
    actor: "Rachel Hollis, CPA",
    actorRole: "External advisor · Hollis & Mercer LLP",
    action: "approve",
    note: "Reviewed capacity report, BOM v2.0 supplier attestations (all domestic, full-year coverage) and sales-to-invoice tie-out. Agree with automated assessment for TY2027. Lock after controller sign-off.",
    automatedStatus: "eligible",
    automatedHeadline: "ELIGIBLE",
  },
  {
    id: "RV-002",
    componentId: "CMP-2170",
    at: "2028-02-06T11:40:00Z",
    actor: "Rachel Hollis, CPA",
    actorRole: "External advisor · Hollis & Mercer LLP",
    action: "request_info",
    note: "Before I can sign off on H1 2027 production: need Northstar Q2 bring-down attestation and Qingdao beneficial-ownership disclosure. Related-party sales to VES — please confirm election decision with Anika.",
    automatedStatus: "likely_eligible",
    automatedHeadline: "LIKELY ELIGIBLE — REVIEW REQUIRED",
  },
  {
    id: "RV-003",
    componentId: "CMP-VM16",
    at: "2028-02-08T15:05:00Z",
    actor: "Elena Morales",
    actorRole: "Associate General Counsel",
    action: "note",
    note: "Lakeshore counsel has the claimant clause; they want a share of the credit value. Production started before any agreement — need advisor view on timing requirement.",
    automatedStatus: "requires_review",
    automatedHeadline: "REQUIRES PROFESSIONAL REVIEW",
  },
];

export const seedAudit: AuditEvent[] = [
  {
    id: "AE-1001", at: "2028-01-08T09:30:00Z", type: "document_uploaded", title: "Legal entity chart uploaded",
    actor: "Anika Patel", triggeredBy: "Volterra_Legal_Entity_Chart_2027.pdf", affected: ["Claimant determination", "Related-party mapping"],
  },
  {
    id: "AE-1002", at: "2028-01-09T15:12:00Z", type: "document_uploaded", title: "FY2027 BOM master imported",
    actor: "Marcus Reyes", triggeredBy: "2027_BOM_Master.xlsx", affected: ["VX-2170 BOM v3.2, v3.3", "VX-4680 BOM v1.0", "VX-P280 BOM v2.0", "VM-16 BOM v1.0"],
    note: "6 BOM versions; 53 BOM lines mapped to 21 suppliers.",
  },
  {
    id: "AE-1003", at: "2028-01-09T15:14:00Z", type: "evidence_superseded", title: "H2 2026 BOM master superseded",
    actor: "System", change: { field: "Evidence status", from: "Verified", to: "Superseded (retained)" }, triggeredBy: "2027_BOM_Master.xlsx",
    affected: ["VX-2170 BOM v3.1"], note: "Retained because the December 2026 lot (BOM v3.1) was sold in January 2027.",
  },
  {
    id: "AE-1004", at: "2028-01-09T15:20:00Z", type: "bom_changed", title: "VX-2170 BOM v3.3 effective Jul 1, 2027 recognized",
    actor: "System", change: { field: "Anode graphite supplier", from: "Tianjin Huayu Carbon (SUP-1377)", to: "Appalachian Graphite Materials (SUP-1821)" },
    triggeredBy: "2027_BOM_Master.xlsx · ECO-2027-064", affected: ["VX-2170", "BOM v3.3", "2027 Material Assistance Calculation"],
    recalculation: { label: "VX-2170 H2 MACR (supported)", from: "62.8%", to: "80.3%" },
  },
  {
    id: "AE-1005", at: "2028-01-10T10:41:00Z", type: "record_matched", title: "Supplier master matched to BOM suppliers",
    actor: "System", triggeredBy: "Supplier_Master_2027-12.csv", affected: ["21 suppliers"],
    note: "20 exact matches; 1 alias match (Qingdao Sep. Materials → Qingdao Separator Materials Ltd., needs review); 1 unmatched (Lumen Carbon Additives).",
  },
  {
    id: "AE-1006", at: "2028-01-11T08:03:00Z", type: "data_extracted", title: "MES production export ingested",
    actor: "System", triggeredBy: "MES_Production_Export_FY2027.csv", affected: ["35 production lots", "Rochester Cell Plant", "Batavia Module Plant"],
    note: "Work order WO-L1-202710 (BATCH-2027-00421) not found in work-order extract.",
  },
  {
    id: "AE-1007", at: "2028-01-12T13:22:00Z", type: "record_matched", title: "Sales register matched to customers and production lots",
    actor: "System", triggeredBy: "ERP_Sales_Register_FY2027.xlsx", affected: ["35 sale records", "VX-2170", "VX-P280", "VX-4680", "VM-16"],
    note: "34 matched (mock FIFO lot allocation). 1 unmatched: INV-27-40136 “EV0LV Mobility Inc.”",
  },
  {
    id: "AE-1008", at: "2028-01-15T10:20:00Z", type: "data_extracted", title: "Section 48C memo extracted",
    actor: "System", triggeredBy: "Rochester_48C_Confirmation_Memo.pdf", affected: ["Rochester Cell Plant"],
    change: { field: "Rochester §48C status", from: "Unknown", to: "No allocation (confirmed)" },
  },
  {
    id: "AE-1009", at: "2028-01-18T14:02:00Z", type: "calculation_refreshed", title: "TY2027 credit estimate calculated",
    actor: "System", affected: ["All components"], note: "Rule version 45X-2027-mock-v0.",
    recalculation: { label: "Estimated credit", from: "—", to: "$18.3M ($14.5M supported)" },
  },
  {
    id: "AE-1010", at: "2028-01-22T18:05:00Z", type: "document_uploaded", title: "Lakeshore contract manufacturing agreement (draft) received",
    actor: "Elena Morales", triggeredBy: "Lakeshore_Contract_Manufacturing_Agreement_DRAFT_v4.docx", affected: ["VM-16", "Claimant determination"],
    note: "§9 Tax Credits reserved. Claimant remains an assumption.",
  },
  {
    id: "AE-1011", at: "2028-01-29T14:41:00Z", type: "supplier_changed", title: "Supplier SUP-1842 ownership status changed",
    actor: "System", change: { field: "Ultimate parent", from: "Unknown", to: "Pending review" }, triggeredBy: "QSM_Corporate_Profile_2027.pdf",
    affected: ["VX-2170", "BOM v3.2", "2027 Material Assistance Calculation"],
    recalculation: { label: "Potential eligible credit (VX-2170)", from: "$5.39M", to: "$5.39M — pending review" },
    note: "Profile identifies Harborline Advanced Materials Pte. Ltd. (Singapore) as sole shareholder; beneficial owners not disclosed.",
  },
  {
    id: "AE-1012", at: "2028-02-02T16:12:00Z", type: "reviewer_decision", title: "VX-P280 determination approved",
    actor: "Rachel Hollis, CPA", change: { field: "Review stage", from: "Needs professional review", to: "Reviewed" },
    affected: ["VX-P280", "TY2027 determination"], note: "Automated result (ELIGIBLE) retained alongside reviewer approval.",
  },
  {
    id: "AE-1013", at: "2028-02-06T11:40:00Z", type: "reviewer_decision", title: "Additional information requested — VX-2170",
    actor: "Rachel Hollis, CPA", affected: ["VX-2170", "Northstar Cathode Materials", "Qingdao Separator Materials"],
  },
  {
    id: "AE-1014", at: "2028-02-09T09:12:00Z", type: "value_changed", title: "VX-4680 rated capacity flagged as conflicting",
    actor: "System", change: { field: "Rated capacity basis", from: "Known (datasheet)", to: "Assumption — conflicts with ES-4680-002" },
    triggeredBy: "VX4680_Engineering_Spec_ES-4680-002.pdf", affected: ["VX-4680", "45X credit calculation"],
  },
  {
    id: "AE-1015", at: "2028-02-11T17:30:00Z", type: "determination_changed", title: "VM-16 determination set to Requires Professional Review",
    actor: "System", change: { field: "Eligibility", from: "Likely eligible", to: "Requires professional review" },
    affected: ["VM-16", "Claimant determination"], triggeredBy: "Lakeshore_Contract_Manufacturing_Agreement_DRAFT_v4.docx",
    recalculation: { label: "Supported credit (VM-16)", from: "$806K", to: "$0 — at risk" },
  },
];

export interface Integration {
  name: string;
  system: string;
  status: "not_connected" | "file_import" | "csv_imported" | "planned";
  lastSync?: string;
  note: string;
}

export const integrations: Integration[] = [
  { name: "ERP", system: "Finance & sales orders", status: "not_connected", note: "Sales register imported as file (ERP_Sales_Register_FY2027.xlsx)" },
  { name: "MES", system: "Production lots & work orders", status: "file_import", lastSync: "2028-01-11T08:03:00Z", note: "Scheduled CSV export (mock)" },
  { name: "PLM", system: "Product definitions & ECOs", status: "not_connected", note: "BOM versions currently from BOM master workbook" },
  { name: "Supplier master", system: "Vendor records", status: "csv_imported", lastSync: "2028-01-10T10:41:00Z", note: "Supplier_Master_2027-12.csv" },
  { name: "Procurement", system: "POs, qualification records", status: "not_connected", note: "Planned once supplier workflow repeats" },
  { name: "Accounting", system: "Cost ledger, inventory", status: "not_connected", note: "Needed for electrode active material cost basis" },
  { name: "Document repository", system: "Contracts, attestations", status: "file_import", lastSync: "2028-02-11T17:30:00Z", note: "Manual upload & email intake" },
  { name: "External watchlists", system: "Corporate registries, PFE/FEOC lists", status: "planned", note: "Ownership and equity-change monitoring" },
];
