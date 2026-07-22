# Claim Audit

Updated: 2026-07-22 UTC

This audit closes the first truth-reset pass for Phase 1. Each risky claim is marked as one of:

- `keep`: technically supported by the current product and evidence.
- `keep_after_fix`: supported after the named correction and its regression coverage landed.
- `keep_as_historical_raw_export`: retained unchanged as labeled historical evidence rather than rewritten as final-head proof.
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
| Generated dbt rollback/model identity | `keep_after_fix` | SQL, YAML, rollback, and manifest now share the canonical `<entity>_contextseal` model identity; real dbt execution remains a separate mandatory gate. |
| Generated `not_null` tests | `keep_after_fix` | The generator now emits `not_null` only from an explicit captured `nullable: false` source-field constraint. |
| Approval sequencing in the UI | `keep_after_fix` | Approved fixture data is no longer rendered before the user approves the safe scope. |
| Hardened live read contract | `keep_after_fix` | Evidence Boundary, Judging Map, Devpost, and live setup now share the exact five-tool contract: `get_entities`, paginated `list_schema_fields`, `get_lineage`, per-target `get_lineage_paths_between`, and `get_dataset_queries`. |

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
| `docs/LIVE_DATAHUB_SETUP.md` | The PowerShell example sent an unwrapped live request body | `keep_after_fix` | Wrapped the change contract under the required top-level `request` property. |
| `public/index.html`, `public/app.js` | Static approved data could surface `CERTIFIED` before approval | `keep_after_fix` | Initial state is pending; analyzed state never receives approved fixture data; only the approval action can render a passport. |
| `src/core/artifacts.js`, sandbox tests | Rollback referenced non-existent `_compat`/`_typed` models and every output invented `not_null` | `keep_after_fix` | Canonicalized model identity and grounded test selection on explicit source-field nullability. |
| `skills/contextseal-change-certification/SKILL.md` | `table- and column-level impact` overstated the current workflow | `downgrade` | Reworded to downstream impact with a no-overclaim rule for field precision. |
| `examples/outputs/live-datahub-read-evidence.json` | None in the wrapper; the artifact already proves a zero-result query read honestly | `keep` | Left unchanged. |
| `examples/outputs/live-datahub-writeback-evidence.json` | Historical embedded run still contains the old claim label | `keep_as_historical_raw_export` | Not rewritten. The export is preserved as historical raw evidence until a fresh live run is captured under the new wording. |

## Deferred implementation note

Field-aware path filtering remains intentionally deferred. If it ships later, it must be grounded by a target-derived graph contract and replace the downgraded wording everywhere in one request.
