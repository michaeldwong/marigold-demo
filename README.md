# 45X Compliance OS — frontend prototype

An interactive prototype of an evidence-backed manufacturing compliance workspace for the U.S. **Section 45X Advanced Manufacturing Production Credit**. It runs entirely in the browser on a seeded, fictional battery manufacturer (Volterra Battery Systems, tax year 2027).

> **Prototype only.** All data is fictional. Calculations and determinations come from deterministic **placeholder** logic (`45X-2027-mock-v0`). They are not tax or legal advice and have not been reviewed by an advisor. No backend, authentication, database, LLM or real integration is used.

## Prerequisites

- **Node.js ≥ 20.9** (Node 22 LTS recommended; see `.nvmrc`)
- **npm** (bundled with Node)

The project uses only cross-platform Node tooling (Next.js, TypeScript, Tailwind CSS). No native modules, OS-specific paths or shell commands, and no network access at build time (system font stack; no web-font download).

## Run

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm start            # http://localhost:3000
```

Type-check only: `npm run typecheck`.

### macOS

Install Node 22 using any method (nodejs.org installer, `nvm`, `fnm`, Volta or Homebrew `node@22`), make sure `node -v` prints ≥ 20.9, then run the commands above.

### Linux

Install Node 22 (nodejs.org binaries, NodeSource packages, or `nvm install 22`), then run the same commands. Nothing else is required.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds a static export and publishes it on every push to `main`, at `https://<user>.github.io/<repo>/`.

One-time setup: in the repository, go to **Settings → Pages → Source** and choose **GitHub Actions**. (On a free GitHub plan, Pages requires a public repository.)

To reproduce the Pages build locally:

```bash
STATIC_EXPORT=true PAGES_BASE_PATH=/marigold-demo npm run build   # writes ./out
```

The static site behaves like the local app: each visitor gets their own in-browser copy of the demo state.

## What's in the prototype

The demo navigation is intentionally small:

| Area | Route | Highlights |
|---|---|---|
| Overview | `/overview` | Estimated vs. supported credit; claim readiness (evidence coverage, eligibility and professional review as three separate measures); an action queue ranked by the credit each item unlocks; a "where the credit comes from" table by component |
| Eligibility | `/eligibility` | Component × requirement matrix and the claimant determination by facility. Each component opens a workspace at `/components/[id]` with Determination, Calculation (CSV workpaper export), BOM & suppliers, Production & sales, Missing evidence and Professional review tabs |
| Supply chain | `/supply-chain` | BOM version timeline with effective periods; BOM table (supplier, ultimate parent, PFE status, cost, MACR treatment); MACR analysis by BOM/evidence window; supplier exposure register |
| Missing information | `/questions` | One list of everything the claim still needs: the action, the question, why it matters, the credit affected, owner, due date and status. Answer it, then accept it through professional review to trigger a recalculation |
| Evidence | `/evidence` | Evidence requirements with filters; data-quality records |
| Documents | `/documents` | Drag-and-drop / multi-file upload with mock progress, category suggestion and correction, linking to evidence requests; repository; integration status |
| Audit trail | `/audit` | Append-only history of seeded events plus every action taken in the session, with before/after recalculations |

Built but not linked from the navigation (kept for later): `/production-sales`, `/scenarios` (sourcing scenarios and MACR threshold outlook) and `/settings`.

Every material value can be traced to its source. A **View source** link opens the *Source & Evidence* drawer, which shows the document page and section with the excerpt highlighted, the spreadsheet sheet/row/column, or the system record, along with extraction confidence, evidence status and where the value is used.

State is held client-side and resets on refresh. Actions are recorded under a fixed demo user (Anika Patel, Director of Tax).

## Source documents

Citations in the app point to regulatory documents under `docs/compliance/` (Form 7207 and its instructions, T.D. 10010). The `docs/` folder is not committed to this repository; place the documents there locally if you need them.

## Architecture

```
app/                       Next.js App Router pages (thin; render client components)
components/
  shell/                   Sidebar, top bar (facility / tax-year selectors, global search)
  provenance/              Source & Evidence inspector drawer (sources, documents, suppliers, issues, citations)
  dashboard/  eligibility/  supply-chain/  evidence/  tasks/  documents/  audit/  scenarios/  settings/  tables/
  ui/                      Primitives (pills, cards, tabs, tooltips, info-kind badges) and status vocabularies
lib/
  domain/types.ts          Canonical manufacturing model (entities, facilities, components, BOM versions,
                           materials, suppliers, ownership, evidence, provenance, lots, sales) with effective dates
  data/                    Seeded fictional dataset + seeded workflow history (tasks, reviews, audit)
  compliance/
    types.ts               Findings, issues, questions, tasks, reviews, audit events, citations
    rules-engine.ts        ComplianceRulesEngine interface (the UI depends only on this)
    mock-rules-engine.ts   Deterministic placeholder implementation + adaptive question generation
    issues.ts              Exception detection from data (missing/stale/conflicting/ambiguous facts)
    regulatory-knowledge.ts RegulatoryKnowledgeService interface + mock
    citations.ts           Citation catalog quoting docs/compliance/
    rule-versions.ts       Versioned rule sets
  calculations/            credit.ts · material-assistance.ts · evidence.ts · data-quality.ts · scenario.ts
  documents/               ComplianceDocumentAnalyzer interface + mock (filename heuristics)
  state/                   Client store (reducer + audit), facility scoping
```

**Flow:** raw evidence → extraction/mapping → structured facts → versioned deterministic calculations → compliance finding → professional review → locked determination. Every dashboard figure is derived from one `rulesEngine.analyze(dataset, context)` pass, so the screens cannot disagree with each other. User actions (answers, reviews, uploads) change the context or the dataset, and the analysis is re-derived.

### How the mock calculation works

- **Credit** is computed per sale × production lot: `units × kWh/unit × rate × phase-out`, using the battery-cell ($35/kWh) and module-with-cells ($10/kWh) rates from Form 7207.
- A credit line is **supported** only when capacity, claimant, §48C, sale treatment and the lot-level MACR are all supported by evidence or resolved by review. Otherwise it is **at risk**, and its credit is attributed to the primary blocking issue. That attribution drives the "credit at risk" breakdown.
- **MACR** is evaluated per lot, using the BOM version and the supplier evidence in effect on that lot's production dates (simplified qualifying-cost / total-cost ratio). Thresholds come from the diligence paper, not official guidance.
- **Answers never change credit directly.** They are recorded as reported facts, and only a professional-review acceptance resolves the issue and recalculates.

## Extension points (where real systems plug in)

| Future capability | Replace | Notes |
|---|---|---|
| LLM / document-AI extraction | `lib/documents/mock-analyzer.ts` → implement `ComplianceDocumentAnalyzer` | Must return fields with page/sheet/row provenance and confidence; feeds `SourceRef` records |
| Advisor-reviewed regulatory rules | `lib/compliance/mock-rules-engine.ts` → implement `ComplianceRulesEngine`; add a `RuleVersion` | Keep calculations deterministic and versioned; the UI and audit model stay unchanged |
| Grounded regulatory knowledge | `lib/compliance/regulatory-knowledge.ts` → implement `RegulatoryKnowledgeService` over `docs/compliance/` | Every finding must carry citations (`ComplianceFinding.sources`) |
| Data ingestion / persistence | `lib/data/mock-manufacturer.ts`, `lib/state/workspace.tsx` | Replace the seed with an API; persist the audit trail as an append-only event log with calculation snapshots |
| Integrations (ERP, MES, PLM, procurement, accounting, watchlists) | `lib/data/mock-workflow.ts` (`integrations`) | Status display only today |

Search the codebase for `TODO:` and `PLACEHOLDER ONLY` to find every deliberately deferred piece.

## Known limitations

- Single tax year (2027) and a single seeded company. The 2026 and 2028 entries in the tax-year selector are disabled.
- Electrode active materials (a cost-based credit) are shown as *Not evaluated*; cost accounting is not modeled.
- MACR logic, supplier-qualification policy, related-party, contract-manufacturing and §48C treatments are simplified placeholders.
- Lot allocation of sales uses a mock FIFO matcher.
- No persistence, authentication, permissions, or server-side security. The security controls listed in Settings are planned, not implemented.
- Uploaded files are never read or sent anywhere; categorization uses the file name only.
