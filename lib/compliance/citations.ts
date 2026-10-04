import type { RegulatoryCitation } from "./types";

/**
 * Citation catalog pointing into the regulatory materials under docs/compliance/.
 *
 * Excerpts are quoted from the repository copies of those documents. They are
 * attached to mock findings so the UI can demonstrate "why does the system
 * believe this?" — they are NOT an authoritative interpretation.
 *
 * TODO: Replace this static catalog with retrieval over an indexed corpus of
 * docs/compliance/ (chunked, versioned by publication date) so every finding
 * produced by the future rules engine carries machine-verified citations.
 */

const I7207 = {
  document: "Instructions for Form 7207 (Rev. December 2025)",
  file: "docs/compliance/i7207--2025.pdf",
};
const TD10010 = {
  document: "T.D. 10010 — Advanced Manufacturing Production Credit, Final Rule (89 FR 85798)",
  file: "docs/compliance/FR-2024-10-28.pdf",
};
const F7207 = {
  document: "Form 7207 (Rev. December 2025)",
  file: "docs/compliance/f7207.pdf",
};
const DILIGENCE = {
  document: "45X Compliance OS diligence working paper (secondary — not an official source)",
  file: "docs/background/45x-compliance-os-diligence.pdf",
};

export const CITATIONS: Record<string, RegulatoryCitation> = {
  "CIT-BATTERY-CELL-DEF": {
    id: "CIT-BATTERY-CELL-DEF",
    short: "Battery cell definition (Form 7207 instr.)",
    ...I7207,
    page: 5,
    section: "Part II, Line 5a — Battery cell",
    excerpt:
      "Battery cell means an electrochemical cell comprised of one or more positive electrodes and one or more negative electrodes, with an energy density of not less than 100 watt-hours per liter, and capable of storing at least 12 watt-hours of energy. For purposes of computing the credit amount for a battery cell, the capacity must not exceed a capacity-to-power ratio not exceeding 100:1.",
  },
  "CIT-BATTERY-MODULE-DEF": {
    id: "CIT-BATTERY-MODULE-DEF",
    short: "Battery module definition (Form 7207 instr.)",
    ...I7207,
    page: 5,
    section: "Part II, Lines 5b and 5c — Battery module",
    excerpt:
      "To be eligible, either type of battery module must have an aggregate capacity of not less than 7 kilowatt-hours (or, in the case of a module for a hydrogen fuel cell vehicle, not less than 1 kilowatt-hour).",
  },
  "CIT-AGGREGATE-CAPACITY": {
    id: "CIT-AGGREGATE-CAPACITY",
    short: "Aggregate capacity (Form 7207 instr.)",
    ...I7207,
    page: 5,
    section: "Column (d) for lines 5a–5c",
    excerpt:
      "The aggregate capacity of eligible battery components is determined by multiplying the number of eligible components produced and sold by the capacity of each component expressed on a kilowatt-hour basis.",
  },
  "CIT-RATE-CELL": {
    id: "CIT-RATE-CELL",
    short: "Battery cell rate (Form 7207 line 5a)",
    ...F7207,
    page: 1,
    section: "Part II, Line 5a — Battery cell, column (c)",
    excerpt: "a Battery cell … kilowatt-hour basis $ 35.00",
  },
  "CIT-RATE-MODULE": {
    id: "CIT-RATE-MODULE",
    short: "Module rate (Form 7207 line 5b)",
    ...F7207,
    page: 1,
    section: "Part II, Line 5b — Battery module which uses battery cells",
    excerpt: "b Battery module which uses battery cells (limitations apply; $ 10.00",
  },
  "CIT-QUALIFIED-SALES": {
    id: "CIT-QUALIFIED-SALES",
    short: "Qualified sales & related persons",
    ...I7207,
    page: 2,
    section: "Special Rules — Qualified sales",
    excerpt:
      "Sales of eligible components qualify under section 45X only with respect to eligible components, the production of which is within the United States or U.S. territories … For purposes of the advanced manufacturing production credit, persons are treated as related to each other if such persons would be treated as a single employer under the regulations prescribed under the common control rules of section 52(b).",
  },
  "CIT-RELATED-PERSON-ELECTION": {
    id: "CIT-RELATED-PERSON-ELECTION",
    short: "Related-person election (line 5)",
    ...I7207,
    page: 3,
    section: "Part I, Line 5 — Related party election",
    excerpt:
      "Check to indicate whether the related party election under section 45X(a)(3)(B) was made for this tax year. … If yes, complete and submit with Form 7207 the 45X Related Person Election Certification Pursuant to IRC 45X(a)(3)(B) (Appendix B).",
  },
  "CIT-CONTRACT-MFG": {
    id: "CIT-CONTRACT-MFG",
    short: "Contract manufacturing rule",
    ...I7207,
    page: 2,
    section: "Special Rules — Special rule for contract manufacturing arrangements",
    excerpt:
      "If an eligible component is produced by a taxpayer pursuant to a contract manufacturing arrangement, the parties to such agreement may determine by agreement the party that may claim the section 45X credit. … The contract manufacturing arrangement must be entered into before the production of the eligible components is completed. The IRS will not challenge the agreement of the parties if all the parties submit signed certification statements.",
  },
  "CIT-CLAIMANT-TD10010": {
    id: "CIT-CLAIMANT-TD10010",
    short: "Eligible taxpayer (T.D. 10010)",
    ...TD10010,
    page: 385,
    section: "Summary of Comments — Eligible taxpayer",
    excerpt:
      "claiming a section 45X credit with respect to an eligible component must be the person that performs the actual production activities that bring about a substantial transformation resulting in the eligible component and that sells such eligible component to an unrelated person.",
  },
  "CIT-48C": {
    id: "CIT-48C",
    short: "§48C property exclusion (line 6)",
    ...I7207,
    page: 3,
    section: "Part I, Line 6 — Section 48C property",
    excerpt:
      "You can’t claim the advanced manufacturing production credit for eligible components produced using any property that is part of a facility for which a credit under section 48C was previously taken after August 16, 2022.",
  },
  "CIT-MATERIAL-ASSISTANCE": {
    id: "CIT-MATERIAL-ASSISTANCE",
    short: "Material assistance from PFEs",
    ...I7207,
    page: 2,
    section: "What’s New / Special Rules — Material assistance from prohibited foreign entities",
    excerpt:
      "For tax years beginning after July 4 2025, an “eligible component” doesn’t include any property which includes any material assistance from a prohibited foreign entity …",
  },
  "CIT-PFE-TAXPAYER": {
    id: "CIT-PFE-TAXPAYER",
    short: "PFE taxpayer restrictions",
    ...I7207,
    page: 2,
    section: "Prohibited foreign entity restrictions",
    excerpt:
      "In general, for tax years beginning after July 4, 2025, no advanced manufacturing production credit will be allowed if the taxpayer is a specified foreign entity, as defined in section 7701(a)(51)(B), or a foreign-influenced entity, as defined in section 7701(a)(51)(D) …",
  },
  "CIT-MACR-THRESHOLDS": {
    id: "CIT-MACR-THRESHOLDS",
    short: "MACR thresholds (secondary source)",
    ...DILIGENCE,
    page: 3,
    section: "2.4 Policy resilience and changing restrictions",
    excerpt:
      "For qualifying battery components, the statutory material-assistance cost-ratio threshold increases from 60% in 2026 to 65% in 2027, 70% in 2028, 80% in 2029, and 85% thereafter.",
  },
  "CIT-PHASEOUT": {
    id: "CIT-PHASEOUT",
    short: "Phase-out schedule",
    ...I7207,
    page: 3,
    section: "Phase out and termination",
    excerpt:
      "The credit for advanced manufacturing production will phase out for eligible components sold after 2029, except applicable critical minerals.",
  },
  "CIT-BATTERY-CELL-TD10010": {
    id: "CIT-BATTERY-CELL-TD10010",
    short: "Battery cell definition (T.D. 10010)",
    ...TD10010,
    page: 403,
    section: "§ 1.45X–3(e)(3) Battery cell — Definition",
    excerpt:
      "proposed § 1.45X–3(e)(3)(i) would have defined the term battery cell as an electrochemical cell comprised of one or more positive electrodes and one or more negative electrodes, with an energy density of not less than 100 watt-hours per liter, and capable of storing at least 12 watt-hours of energy.",
  },
};

export function getCitation(id: string): RegulatoryCitation {
  const c = CITATIONS[id];
  if (!c) throw new Error(`Unknown citation ${id}`);
  return c;
}
