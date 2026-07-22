# Competition Requirement Matrix

Updated: 2026-07-22 UTC

Selected primary track: `Metadata-Aware Code Generation & Development`

Supporting fit: `Agents That Do Real Work`

This matrix is the repo-level check that the chosen challenge wording stays attached to real product surfaces.

| Requirement | Current repo proof | Status at phase start | Gap that still matters | Planned closure |
| --- | --- | --- | --- | --- |
| Working application that uses DataHub | `npm run validate`, local web app, DataHub MCP client, restored live/server safety tests, and historical disposable-local live artifacts | `SHIPPED` | Final-head live recapture plus exact-head CI, Pages, and Docker proof remain open | `W-17J`, `W-17K`, `W-17L` |
| Read DataHub before generating or deciding | DataHub MCP read tools are implemented, the AI grounding bundle explicitly captures deterministic read-side facts, and live normalization now enforces schema completeness, exact paths, and query honesty | `PARTIAL` | Fresh final-head live proof is still missing | `W-17D`, `W-17E`, `W-17J` |
| Generate data code from schemas, lineage, and rules | Deterministic generator emits dbt model, tests, rollback, and owner brief; run records name the grounding inputs; the manifest ties each file hash back to grounding and passport context; sandbox validation is committed and deterministic | `SHIPPED` | Optional local dbt execution proof remains open | `W-14A`, `W-14B`, `W-14C` |
| Show committed generated artifacts in the repo | Generated outputs, manifest, AI artifacts, PR artifacts, and sandbox evidence are committed and can now be checked without rewriting | `SHIPPED` | Final-head live evidence freshness remains open | `W-17G-R`, `W-17J` |
| Attach the generated result to a PR and make it reviewer-ready | The PR review packet contract, offline PR bundle generator, deterministic PR bundle check, and optional token-gated draft PR path are shipped | `SHIPPED` | Exact-head live draft PR execution remains optional and approval-gated | `W-15A`, `W-15B`, `W-15C` |
| Give judges confidence the output works the first time | Unit tests, deterministic demo generation, deterministic sandbox validation, smoke checks, and read-only validation now exist | `PARTIAL` | Final-head Docker, CI, Pages, and fresh live evidence remain open | `W-17G-R`, `W-17J`, `W-17K` |
| Use DataHub MCP or Skills explicitly | MCP client, live evidence scripts, canonical skill package, and public upstream PR #35 are already in the repo | `SHIPPED` | Fresh final-head live capture remains open | `W-17H`, `W-17J` |
| Present an unmistakably agentic workflow | Visible Local AI Copilot panel, bounded adapter, committed AI input/output artifacts, deterministic fallback, and adapter tests are shipped | `PARTIAL` | A real local-model-backed `PASS` artifact is still missing on this machine | `W-17I`, `W-17J` |

## Current decision

The primary category remains valid. The reconciled repo now ships the visible agentic workflow, deterministic generated-code proof, offline PR packet generation, optional token-gated draft PR creation, and canonical Skills packaging. The remaining core gaps are fresh final-head live evidence, exact-head CI/Pages/Docker proof, and a local-model-backed AI `PASS` capture on a machine with Ollama.