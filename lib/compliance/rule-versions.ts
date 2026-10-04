import type { RuleVersion } from "./types";

/**
 * Rule versions. Every determination and calculation records the rule version
 * that produced it so results remain reproducible when guidance changes.
 *
 * PLACEHOLDER ONLY. The active version below is a mock used to demonstrate the
 * product workflow. It must eventually be replaced by advisor-reviewed,
 * versioned regulatory logic.
 */
export const RULE_VERSIONS: RuleVersion[] = [
  {
    id: "45X-2027-mock-v0",
    label: "45X · TY2027 · prototype rules v0",
    status: "placeholder",
    effective: { from: "2027-01-01", to: "2027-12-31" },
    description:
      "Demonstration logic: battery cell/module rates from Form 7207, simplified MACR test with placeholder supplier-qualification policy, claimant/related-party/48C gating. Not advisor-reviewed.",
  },
  {
    id: "45X-2026-mock-v0",
    label: "45X · TY2026 · prototype rules v0",
    status: "placeholder",
    effective: { from: "2026-01-01", to: "2026-12-31" },
    description: "Archived placeholder rule set (not used in this prototype dataset).",
  },
];

export const ACTIVE_RULE_VERSION = RULE_VERSIONS[0];
