# Claim Audit

Updated: 2026-07-21 UTC

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
| Entity-type realism in live proof | `downgrade` | The seeded live-local proof spans multiple platforms, but the committed downstream results are exported as dataset-shaped assets. |
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
| `docs/DEVPOST_SUBMISSION.md` | Challenge category drift and entity-type overstatement risk | `downgrade` | Primary category realigned to Metadata-Aware Code Generation; live proof wording narrowed to seeded platform metadata. |
| `docs/JUDGE_TEST_PATH.md` | Judge flow could be read as live-normalized impact | `downgrade` | Explicitly labels the default path view as fixture analysis. |
| `docs/JUDGING_MAP.md` | Live proof could be read as fully typed cross-entity lineage | `downgrade` | Clarified dataset-shaped seeded proof and separate live/fixture surfaces. |
| `docs/EVIDENCE_BOUNDARY.md` | Query and entity-type boundary was under-specified | `downgrade` | Added explicit rules for zero-result query reads and dataset-shaped downstream results. |
| `docs/LIVE_DATAHUB_SETUP.md` | Verified status wording risked overstating entity types and live query usage | `downgrade` | Narrowed the verified-local wording to match the committed artifacts. |
| `skills/contextseal-change-certification/SKILL.md` | `table- and column-level impact` overstated the current workflow | `downgrade` | Reworded to downstream impact with a no-overclaim rule for field precision. |
| `examples/outputs/live-datahub-read-evidence.json` | None in the wrapper; the artifact already proves a zero-result query read honestly | `keep` | Left unchanged. |
| `examples/outputs/live-datahub-writeback-evidence.json` | Historical embedded run still contains the old claim label | `keep_as_historical_raw_export` | Not rewritten. The export is preserved as historical raw evidence until a fresh live run is captured under the new wording. |

## Deferred implementation note

Field-aware path filtering remains intentionally deferred. If it ships later, it must be grounded by a target-derived graph contract and replace the downgraded wording everywhere in one request.