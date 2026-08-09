# Competition Requirement Matrix

Updated: 2026-08-09 UTC

Selected primary track: `Metadata-Aware Code Generation & Development`

Supporting fit: `Agents That Do Real Work`

This matrix is the repo-level check that the chosen challenge wording stays attached to real product surfaces.

| Requirement | Current repo proof | Status | Gap that still matters | Planned closure |
| --- | --- | --- | --- | --- |
| Working application that uses DataHub | `npm run validate`, local web app, DataHub MCP client, restored live/server safety tests, historical disposable-local live artifacts, hosted CI run `31246557467` PASS, and Deploy Judge Demo run `31246557473` PASS on the pre-video main candidate `7f24388059e8a12872f48c214ebd2cac82811a7d` | `SHIPPED` | The public final video (`https://www.youtube.com/watch?v=ckhx5X1QQwo`, approximately 2:05) and the public Devpost submission (`https://devpost.com/software/contextseal`) exist; only the immutable tag/release against the post-docs-merge release SHA remains open | Final docs merge, tag, release |
| Read DataHub before generating or deciding | DataHub MCP read tools are implemented, the AI grounding bundle explicitly captures deterministic read-side facts, live normalization enforces schema completeness, exact paths, and query honesty, and the historical disposable-local read proof validates under `npm run evidence:check` | `SHIPPED` | Historical disposable-local evidence remains valid; no new final-SHA recapture is required while `npm run evidence:check` passes | None required before freeze |
| Generate data code from schemas, lineage, and rules | Deterministic generator emits a canonical dbt model, schema-constraint-derived tests, rename parity data test, rollback SQL, and owner brief; real `dbt-core 1.10.5` + `dbt-duckdb 1.10.0` parse, compile, run, and test proof exists (`npm run dbt:proof`, dbt-proof CI job PASS); the manifest ties each file hash back to grounding and passport context | `SHIPPED` | None; production warehouse execution stays `NOT_RUN` by design | None required before freeze |
| Show committed generated artifacts in the repo | Generated outputs, manifest, AI artifacts, PR artifacts, and sandbox evidence are committed and can be checked without rewriting | `SHIPPED` | Historical disposable-local evidence remains valid under `npm run evidence:check` | None required before freeze |
| Attach the generated result to a PR and make it reviewer-ready | The PR review packet contract, offline PR bundle generator, deterministic PR bundle check, and optional token-gated draft PR path are shipped | `SHIPPED` | Exact-head live draft PR execution remains optional and approval-gated | None required before freeze |
| Give judges confidence the output works the first time | Unit tests, deterministic demo generation, corrected conformance validation, smoke checks, real dbt execution proof, hosted CI (run `31246557467`), hosted Pages (run `31246557473`), and read-only validation exist | `SHIPPED` | The public final video exists; only the final-head same-SHA tag/release after the docs merge remains open | Final docs merge, tag, release |
| Use DataHub MCP or Skills explicitly | MCP client, live evidence scripts, canonical skill package, and public upstream PR #35 (`OPEN / NOT MERGED / AWAITING MAINTAINER REVIEW`) are already in the repo | `SHIPPED` | Historical disposable-local capture remains valid; no new recapture required while `npm run evidence:check` passes | None required before freeze |
| Present an unmistakably agentic workflow | Visible Local AI Copilot panel, bounded adapter, committed AI input/output artifacts, deterministic fallback, adapter tests, and the recorded local Ollama `PASS` proof (`examples/outputs/proofs/ollama-ai-proof.json`) are shipped; GitHub Pages replays this recorded proof and does not perform hosted live inference | `SHIPPED` | None; recorded local Ollama proof exists and validates | None required before freeze |

## Current decision

The primary category remains valid. Real dbt execution evidence, hosted CI, hosted Pages proof, the recorded local Ollama `PASS` proof, and the historical disposable-local DataHub read/write-back proof all exist and validate on the verified pre-video main candidate `7f24388059e8a12872f48c214ebd2cac82811a7d`. The public final demo video (`https://www.youtube.com/watch?v=ckhx5X1QQwo`, approximately 2:05) and the public Devpost submission (`https://devpost.com/software/contextseal`) now exist. The only remaining open items are the immutable tag and GitHub Release on the post-docs-merge SHA — still pending and not claimed.
