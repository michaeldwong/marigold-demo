import type { ID } from "@/lib/domain/types";

/** Deterministic issue identifiers so issues, questions, tasks and audit events can reference one another. */
export const IssueIds = {
  attestationGap: (supplierId: ID) => `ISS-ATT-GAP-${supplierId}`,
  attestationMissing: (supplierId: ID) => `ISS-ATT-MISSING-${supplierId}`,
  attestationExpiring: (supplierId: ID) => `ISS-ATT-EXPIRING-${supplierId}`,
  ownership: (supplierId: ID) => `ISS-OWN-${supplierId}`,
  pfe: (supplierId: ID) => `ISS-PFE-${supplierId}`,
  einConflict: (supplierId: ID) => `ISS-EIN-${supplierId}`,
  capacityMissing: (componentId: ID) => `ISS-CAP-MISSING-${componentId}`,
  capacityConflict: (componentId: ID) => `ISS-CAP-CONFLICT-${componentId}`,
  relatedParty: (componentId: ID) => `ISS-RP-${componentId}`,
  unmatchedSale: (saleId: ID) => `ISS-UNMATCHED-${saleId}`,
  claimant: (componentId: ID) => `ISS-CLAIMANT-${componentId}`,
  section48C: (facilityId: ID) => `ISS-48C-${facilityId}`,
  workOrder: (batchId: ID) => `ISS-WO-${batchId}`,
};
