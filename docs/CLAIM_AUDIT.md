# Claim Audit

Updated: 2026-08-02 UTC

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
| DataHub write-back inheritance | `keep` | The recorded synthetic-local export now binds current provenance, `VERIFY_THEN_SKIP` receipts, and exactly-one-marker durable read-back checks; it remains separate from fixture impact and final-head hosted proof. |
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
| `docs/DEVPOST_SUBMISSION.md` | Challenge category drift and entity-type overstatement risk | `downgrade` | Primary category remains aligned to Metadata-Aware Code Generation; the recorded proof states its synthetic-local boundary, exact MCP evidence, and two-run write-back contract. |
| `docs/JUDGE_TEST_PATH.md` | Judge flow could be read as live-normalized impact | `downgrade` | Explicitly labels the default path view as fixture analysis. |
| `docs/JUDGING_MAP.md` | Live proof could be read as fully typed cross-entity lineage or live normalized impact | `downgrade` | Preserves the recorded two-run write-back proof while retaining the separate live/fixture boundary and no-overclaim rule for normalized impact. |
| `docs/EVIDENCE_BOUNDARY.md` | Query, entity-type, and current write-back boundary was under-specified | `downgrade` | Requires provenance-bound verify-then-skip receipts and exactly-one-marker durable read-back before a current write-back claim. |
| `docs/LIVE_DATAHUB_SETUP.md` | Verified status wording risked overstating entity types and live query usage | `keep` | Verified-local wording now cites the refreshed typed downstream summary and retains the no-overclaim boundary. |
| `skills/contextseal-change-certification/SKILL.md` | `table- and column-level impact` overstated the current workflow | `downgrade` | Reworded to downstream impact with a no-overclaim rule for field precision. |
| `examples/outputs/live-datahub-read-evidence.json` | None in the wrapper; the artifact already proves a zero-result query read honestly | `keep` | Refreshed to include `lineageSummary` with typed downstream counts and representative entities. |
| `examples/outputs/live-datahub-writeback-evidence.json` | Recorded mutation proof must remain provenance-bound and idempotent | `keep` | Fresh synthetic-local capture, second idempotent rerun, export, and `npm run evidence:check` now pass with the required receipt and durable read-back shape. |

## Deferred implementation note

Field-aware path filtering remains intentionally deferred. If it ships later, it must be grounded by a target-derived graph contract and replace the downgraded wording everywhere in one request.