# Competition Requirement Matrix

Updated: 2026-08-09 UTC

Selected primary track: `Metadata-Aware Code Generation & Development`

Supporting fit: `Agents That Do Real Work`

This matrix keeps the chosen challenge wording attached to real product and release evidence.

| Requirement | Current repo proof | Status | Gap that still matters | Planned closure |
| --- | --- | --- | --- | --- |
| Working application that uses DataHub | `npm run validate`, local web app, DataHub MCP client, restored live/server safety tests, historical disposable-local artifacts, exact-release CI run `31312985748` PASS, and exact-release Deploy Judge Demo run `31312985736` PASS on `a25e741c623dfb59aa830e0f9cb49c96768c748b` | `SHIPPED` | No release-closure gap remains. Hosted proof remains distinct from synthetic-local DataHub proof and does not claim production or customer evidence. | None required |
| Read DataHub before generating or deciding | DataHub MCP read tools are implemented, the AI grounding bundle captures deterministic read-side facts, live normalization enforces schema completeness and query honesty, and historical disposable-local read proof validates under `npm run evidence:check` | `SHIPPED` | Historical disposable-local evidence remains valid; no final-SHA recapture is required for release closure. | None required |
| Generate data code from schemas, lineage, and rules | Deterministic generator emits a canonical dbt model, schema-constraint-derived tests, rename parity data test, rollback SQL, and owner brief; real `dbt-core 1.10.5` + `dbt-duckdb 1.10.0` proof exists; the manifest ties each file hash back to grounding and passport context | `SHIPPED` | None; production warehouse execution remains `NOT_RUN` by design. | None required |
| Show committed generated artifacts in the repo | Generated outputs, manifest, AI artifacts, PR artifacts, and sandbox evidence are committed and can be checked without rewriting | `SHIPPED` | Historical disposable-local evidence remains valid under `npm run evidence:check`. | None required |
| Attach the generated result to a PR and make it reviewer-ready | The PR review packet contract, offline PR bundle generator, deterministic PR bundle check, and optional token-gated draft PR path are shipped | `SHIPPED` | Exact-head live draft PR execution remains optional and approval-gated. | None required |
| Give judges confidence the output works the first time | Unit tests, deterministic demo generation, corrected conformance validation, smoke checks, real dbt execution proof, exact-release CI run `31312985748` PASS, exact-release Pages run `31312985736` PASS, and read-only validation exist | `SHIPPED` | No release-closure gap remains; production warehouse execution remains `NOT_RUN` by design. | None required |
| Use DataHub MCP or Skills explicitly | MCP client, live evidence scripts, canonical skill package, and public upstream PR #35 (`OPEN / NOT MERGED / AWAITING MAINTAINER REVIEW`) are already in the repo | `SHIPPED` | Historical disposable-local capture remains valid; no new recapture is required while `npm run evidence:check` passes. | None required |
| Present an unmistakably agentic workflow | Visible Local AI Copilot panel, bounded adapter, committed AI input/output artifacts, deterministic fallback, adapter tests, and the recorded local Ollama `PASS` proof (`examples/outputs/proofs/ollama-ai-proof.json`) are shipped; GitHub Pages replays this recorded proof and does not perform hosted live inference | `SHIPPED` | None; recorded local Ollama proof exists and validates. | None required |

## Current decision

The primary category remains valid. The official immutable submission release is `a25e741c623dfb59aa830e0f9cb49c96768c748b`, tagged `datahub-hackathon-submission-v1` and published at <https://github.com/zyganali-glitch/ContextSeal/releases/tag/datahub-hackathon-submission-v1>. Exact-release CI run `31312985748` and Pages run `31312985736` passed. The public final demo video (<https://www.youtube.com/watch?v=ckhx5X1QQwo>, approximately 2:05) and the public Devpost submission (<https://devpost.com/software/contextseal>) exist. There is no remaining release-closure gap; production and customer boundaries remain intact.
