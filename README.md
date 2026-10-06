# Marigold - Section 45X demo

A customer demo of Marigold: a dashboard that tells a U.S. battery manufacturer whether it appears to qualify for the
Section 45X Advanced Manufacturing Production Credit, how much credit to expect, how that number was calculated, and what
evidence is still missing.

The demo company is **Volterra Battery Systems, Inc.** (fictional), tax year **2026**, with two battery cells: VX-2170
(cylindrical NMC) and VX-LFP50 (prismatic LFP).

> **Demo only.** All company data is synthetic. The analysis is pre-computed and is not tax advice.

## How the demo works

```
customer files (data/volterra_synthetic/volterra_synthetic_data, excluding INTERNAL_TEST_ONLY)
    |
    v
pipeline/analyze_customer_files.py   <- simulates the future Marigold ingestion pipeline
    |   applies only the rules in pipeline/tax_rules_45x.py, each quoted from docs/compliance/
    v
lib/analysis/dashboard_analysis.json  <- structured facts, evidence pointers, rules, issues
    |
    v
Next.js dashboard (app/, components/pages/)
```

- The pipeline reads **only** files a customer would provide. It refuses to open `INTERNAL_TEST_ONLY/`.
- Every fact in the JSON points to its customer file and location (sheet/row, record ID or PDF page). Every rule points to a
  document, section, page and quote from `docs/compliance/`.
- `pipeline/validate_against_oracle.py` compares the result with the dataset's internal test oracle **after** the
  analysis is produced and writes `pipeline/VALIDATION_REPORT.md`. It never feeds back into the analysis.

## Pages

| Page | Answers |
|---|---|
| Overview | Does Volterra qualify? How much credit? From which product? What is missing? |
| Eligibility | Each requirement, Volterra's fact, status (✓ / ⚠ / ✕), next step, sources |
| Credits | Per-product calculation: cells sold × tested kWh per cell × $35, with sources for each input |
| Products | Specs, revisions, production, sales, credit; expandable materials and suppliers by revision |
| Missing information | Open items grouped by type, with severity, why it matters and next step |
| Sourcing | Every customer file analyzed (openable) and where it was used, plus the 45X documents applied |

Any "Sources" link opens the customer evidence (with the exact location and excerpt) and the 45X rule (with the quote and a
link to the page in the PDF).

## Prerequisites

- **Node.js >= 20.9** (Node 22 LTS recommended; see `.nvmrc`) and npm
- **Python 3.9+** only if you want to regenerate the dataset or the analysis

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

`predev` / `prebuild` run `scripts/sync-demo-files.mjs`, which copies the customer-facing files (never `INTERNAL_TEST_ONLY`)
and the three cited 45X documents into `public/demo-files/` so the dashboard can open them.

### Regenerate the data and analysis

```bash
cd data/volterra_synthetic
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python generate_dataset.py      # synthetic customer files + internal test oracle
.venv/bin/python validate_dataset.py      # dataset self-check (PASS/FAIL)
cd ../..
npm run analyze                           # pipeline -> lib/analysis/dashboard_analysis.json
data/volterra_synthetic/.venv/bin/python pipeline/validate_against_oracle.py
```

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds a static export and publishes it on every push to `main`
(`https://<user>.github.io/<repo>/`). One-time setup: **Settings -> Pages -> Source: GitHub Actions**. On a free plan the
repository must be public.

Local reproduction of the Pages build: `STATIC_EXPORT=true PAGES_BASE_PATH=/marigold-demo npm run build` (writes `./out`).

## Code layout

```
app/                       one route per page (thin)
components/pages/          page components
components/sources/        "Sources" drawer (evidence + 45X rule)
components/shell/          sidebar and header
lib/analysis/              dashboard_analysis.json + typed accessors
pipeline/                  customer-data analysis, 45X rule registry, oracle validation
data/volterra_synthetic/   synthetic dataset generator, validator and generated files
scripts/                   sync of demo files into public/
```

## What the analysis does not do

- **Material-assistance (foreign-entity sourcing) test:** the repository's documents state the restriction but not the
  method, so it is shown as an open critical item for professional review rather than computed.
- **Capacity conflicts:** where the product record and test report disagree (VX-LFP50), the estimate uses the lower value
  and shows the higher one.
- Nothing is persisted; there is no LLM, backend or authentication. The analysis is pre-computed.
