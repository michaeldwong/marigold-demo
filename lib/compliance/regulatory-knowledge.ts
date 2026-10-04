/**
 * Regulatory knowledge service boundary.
 *
 * The future implementation will index the regulatory corpus under
 * docs/compliance/ (Form 7207 and instructions, T.D. 10010 and corrections,
 * IRS notices and bulletins), retrieve the passages relevant to a set of facts,
 * and return findings that always carry source citations.
 */

import type { ComplianceContext, ComplianceFinding, ManufacturingFacts, RegulatoryCitation } from "./types";
import { CITATIONS } from "./citations";

export interface RegulatoryKnowledgeService {
  /** Evaluate facts against the regulatory corpus for a context (rule version, tax year). */
  evaluate(facts: ManufacturingFacts, context: ComplianceContext): Promise<ComplianceFinding[]>;
  /** Look up citations relevant to a topic (e.g. "battery cell definition"). */
  findCitations(topic: string): Promise<RegulatoryCitation[]>;
}

/**
 * Mock implementation: keyword lookup over a static citation catalog.
 *
 * TODO: Replace with compliance reasoning grounded in documents under
 * docs/compliance/ — retrieval over chunked, versioned source documents.
 * TODO: Every future compliance finding must carry source citations.
 */
export class MockRegulatoryKnowledgeService implements RegulatoryKnowledgeService {
  async evaluate(): Promise<ComplianceFinding[]> {
    // Findings are produced by the mock rules engine today; this service only supplies citations.
    return [];
  }

  async findCitations(topic: string): Promise<RegulatoryCitation[]> {
    const q = topic.toLowerCase();
    return Object.values(CITATIONS).filter(
      (c) => c.section.toLowerCase().includes(q) || c.excerpt.toLowerCase().includes(q),
    );
  }
}

export const regulatoryKnowledge: RegulatoryKnowledgeService = new MockRegulatoryKnowledgeService();
