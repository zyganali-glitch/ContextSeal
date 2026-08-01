# Claim Audit

Updated: 2026-08-01 UTC

This audit closes the first truth-reset pass for Phase 1. Each risky claim is marked as one of:

- `keep`: technically supported by the current product and evidence.
- `downgrade`: wording must be narrowed to match the current implementation.
- `implement_later`: useful, but not safe to claim before new work lands.

## Summary decisions

| Claim area | Decision | Why |
| --- | --- | --- |
| Downstream impact precision | `downgrade` | The current impact engine traverses asset-to-asset paths. It does not compute field-precise lineage across the full graph. |
| Live versus fixture path view | `downgrade` | The default judge flow uses fixture-backed path reconstruction. Live MCP proof is captured separately and must stay labeled separately. |
| Query-usage proof | `downgrade` | Fixture query findings are based on synthetic query text. The committed live read artifact currently proves the query tool ran, but its saved example returns zero observed dataset queries for the target. |
| Entity-type realism in live proof | `keep` | The refreshed live-local proof now preserves a typed downstream summary plus representative `DATASET`, `DATA_JOB`, and `DASHBOARD` entities in the exported artifacts, while the fixture dashboard remains separately labeled. |
| DataHub write-back inheritance | `keep` | The bounded mutation path and post-write verification are real in the committed local proof, as long as they stay scoped to synthetic local metadata. |
| Deterministic authority over AI/model output | `keep` | The core verdict and evidence state logic remain deterministic and test-covered. |
| Field-aware filtering as a product enhancement | `implement_later` | It may still be valuable, but it is not required for an honest winning path and should not be claimed today. |

## Audited surfaces

| Surface | Risky wording found | Decision | Action taken |
| --- | --- | --- | --- |
| `src/core/workflow.js` | `Column-level impact traced` | `downgrade` | Renamed to `Downstream impact paths traced`. |
| `public/demo-data.json` | Fixture demo inherited the old column-level claim | `downgrade` | Regenerated from the updated deterministic workflow. |
| `examples/outputs/demo-certification.json` | Fixture export inherited the old column-level claim | `downgrade` | Regenerated from the updated deterministic workflow. |
| `README.md` | Demo text implied a DataHub-compatible path view without enough fixture emphasis | `downgrade` | Reworded to call the default path view fixture-backed and clarified the seeded live-local proof scope. |
| `README.tr.md` | `gerçek sorgular` implied stronger query proof than the current evidence boundary supports | `downgrade` | Reworded to `gözlemlenen sorgu kanıtları` and clarified the safe demo boundary. |
| `docs/DEVPOST_SUBMISSION.md` | Challenge category drift and entity-type overstatement risk | `keep` | Primary category remains aligned to Metadata-Aware Code Generation; live proof wording now cites the typed downstream summary from the refreshed local artifact. |
| `docs/JUDGE_TEST_PATH.md` | Judge flow could be read as live-normalized impact | `downgrade` | Explicitly labels the default path view as fixture analysis. |
| `docs/JUDGING_MAP.md` | Live proof could be read as fully typed cross-entity lineage | `keep` | Clarified the typed seeded proof while preserving the separate live/fixture boundary. |
| `docs/EVIDENCE_BOUNDARY.md` | Query and entity-type boundary was under-specified | `keep` | Added explicit rules for zero-result query reads and typed downstream summary claims without upgrading them into a target-derived normalized graph contract. |
| `docs/LIVE_DATAHUB_SETUP.md` | Verified status wording risked overstating entity types and live query usage | `keep` | Verified-local wording now cites the refreshed typed downstream summary and retains the no-overclaim boundary. |
| `skills/contextseal-change-certification/SKILL.md` | `table- and column-level impact` overstated the current workflow | `downgrade` | Reworded to downstream impact with a no-overclaim rule for field precision. |
| `examples/outputs/live-datahub-read-evidence.json` | None in the wrapper; the artifact already proves a zero-result query read honestly | `keep` | Refreshed to include `lineageSummary` with typed downstream counts and representative entities. |
| `examples/outputs/live-datahub-writeback-evidence.json` | Historical embedded run still contains the old claim label | `keep` | Refreshed under the current wording; the embedded live evidence now carries the same typed downstream summary. |

## Deferred implementation note

Field-aware path filtering remains intentionally deferred. If it ships later, it must be grounded by a target-derived graph contract and replace the downgraded wording everywhere in one request.