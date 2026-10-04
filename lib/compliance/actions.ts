import type { ManufacturerDataset } from "@/lib/domain/types";
import type { Issue } from "./types";

/** Imperative next step for an issue — used by the overview action queue and the missing-information list. */
export function issueAction(issue: Issue, ds: ManufacturerDataset): string {
  const sup = ds.suppliers.find((s) => s.id === issue.supplierId);
  const comps = issue.componentIds.map((id) => ds.components.find((c) => c.id === id)?.shortName).join(", ");
  const supName = sup?.name.replace(/ (LLC|Inc\.|Ltd\.|Co\., Ltd\.|SAS|Co\.)$/, "") ?? "";
  switch (issue.type) {
    case "ownership_unknown":
      return `Get ultimate-parent disclosure from ${supName}`;
    case "attestation_expired":
      return `Get ${supName} attestation for ${issue.trigger.replace("No attestation covers ", "")}`;
    case "attestation_missing":
      return `Get supplier certification from ${supName}`;
    case "attestation_expiring":
      return `Renew ${supName} attestation`;
    case "ein_conflict":
      return `Confirm ${supName} EIN and get corrected attestation`;
    case "pfe_review":
      return `Complete PFE review of ${supName}`;
    case "pfe_risk":
      return `Document PFE treatment of ${supName}`;
    case "capacity_test_missing":
      return `Upload ${comps} rated capacity test report`;
    case "capacity_conflict":
      return `Reconcile ${comps} rated capacity (datasheet vs. spec)`;
    case "claimant_undetermined":
      return `Execute claimant agreement for ${comps} with Lakeshore`;
    case "section_48c_unknown":
      return "Confirm §48C status of Batavia facility";
    case "related_party_sale":
      return "Decide related-person election for sales to Volterra Energy Storage";
    case "unmatched_sale": {
      const sale = ds.sales.find((s) => s.id === issue.saleIds?.[0]);
      return `Match ${sale?.invoiceNumber ?? "sales record"} to a customer and production lots`;
    }
    case "work_order_missing":
      return `Upload missing work order for ${issue.batchIds?.[0] ?? "lot"}`;
  }
}
