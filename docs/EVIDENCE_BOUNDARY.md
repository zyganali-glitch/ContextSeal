# Evidence Boundary

## Authoritative sources

| Claim | Authority |
| --- | --- |
| Request validity | Change-contract validator |
| Impact count and paths | Bounded graph traversal over the captured context |
| Risk score and findings | Versioned deterministic policy |
| Generated file content | Artifact generator and file hashes |
| Test execution | Named command output / CI result |
| Human decision | Stored approval contract |
| DataHub mutation | `isError: false` MCP tool responses plus post-write read-back |
| Passport integrity | SHA-256 manifest |

The optional local AI layer may explain or improve a migration proposal, but it is never authoritative for these claims. Its own bounded status (`PASS`, `FAIL`, `UNAVAILABLE`, `NOT_ENABLED`) describes only the explanation layer and never upgrades deterministic evidence.

## Code-generation grounding contract

Generated dbt, rollback, and owner-brief artifacts are currently grounded on these deterministic inputs:

1. the validated request identity: target URN, entity name, change type, source field, destination field, and requested destination type when present;
2. the captured target asset identity from the DataHub-shaped context;
3. deterministic lineage results: impacted asset count, impacted asset types, downstream owners, and representative downstream paths;
4. deterministic policy results: verdict, score, and named finding codes;
5. the fixed ContextSeal migration rule selected for the request class.

That grounding contract is persisted at `run.artifacts.grounding` in the analyzed and approved run records.

Current non-claims for generated code:

- The generator does not yet ingest a full DataHub field-schema snapshot beyond the requested field names and target model identity.
- Warehouse execution status does not rewrite generated artifact content.
- AI output does not author or rewrite the generated dbt, rollback, or owner-brief artifacts.

## Review-delivery boundary

`npm run pr:bundle` produces a reviewer-ready body, checklist, and payload from the approved run, generated-artifact manifest, and sandbox evidence. `npm run pr:draft -- --dry-run` validates the corresponding GitHub request without a token. A live draft-PR request requires an existing branch and `GITHUB_TOKEN`; it remains an explicit, optional operation.

The PR packet proves that the generated result is prepared for review. It does not prove that a GitHub pull request was created, reviewed, merged, or accepted by a third party.

## Fixture versus live

The checked-in retail example is synthetic metadata shaped like DataHub entities and lineage. It exists so every judge gets a deterministic, privacy-safe demo. Runs against it are labeled `FIXTURE`.

A current live DataHub read/write claim requires:

1. `CONTEXTSEAL_MODE=datahub`;
2. successful DataHub MCP initialization;
3. stored raw results from `get_entities`, `list_schema_fields`, `get_lineage`, `get_lineage_paths_between`, and `get_dataset_queries`;
4. an approved passport before mutation;
5. `isError: false` individual mutation responses if write-back is claimed;
6. post-write retrieval for durable fields, including exactly one passport description block;
7. a provenance-bound export whose verify-then-skip receipt outcomes match durable read-back.

In `CONTEXTSEAL_MODE=datahub`, `/api/analyze` validates the request, captures the five bounded read-only MCP tool types, closes the MCP client, then generates the deterministic package. This makes the read -> act ordering operational while retaining the public graph and impact paths as `FIXTURE` until a target-derived graph contract exists.

A **live normalized impact** claim additionally requires a target-derived graph contract. The recorded local read artifact has live entity, lineage, and query evidence, while the historical write-back export is `STALE` until it is recaptured under the current provenance and idempotency contract. The dashboard's exact path visualization remains labeled fixture-derived. This distinction is deliberate.

The public fixture demo may still show field-reference findings because its synthetic query text is bundled directly into the fixture context. The committed live read artifact currently proves that `get_dataset_queries` executed for the target, not that the target returned non-zero observed queries.

The recorded seeded local read artifact preserves a typed downstream summary plus representative `DATASET`, `DATA_JOB`, and `DASHBOARD` entities across multiple platforms. That is stronger live read evidence than the earlier single-shape export, but it is still not the same thing as a target-derived normalized graph contract or a fully typed cross-entity path guarantee for the fixture dashboard.

## Forbidden claim upgrades

- A screenshot is not proof of API completion unless the underlying run record is included.
- Generated SQL is not executed SQL.
- A prepared mutation is not a completed mutation.
- A fixture PASS is not a live DataHub PASS.
- A successful `get_dataset_queries` call with `total: 0` is not proof of live field usage.
- A historical write-back export that lacks current provenance, idempotency, or exactly-one-marker evidence is `STALE`, not a current mutation `PASS`.
- A typed seeded downstream summary is not, by itself, proof of a target-derived fully typed cross-entity lineage contract.
- A hash proves integrity of captured bytes, not correctness or security.
- Passing unit tests are not a production-readiness certificate.
- A prepared or dry-run PR request is not a created, reviewed, merged, or externally accepted PR.
