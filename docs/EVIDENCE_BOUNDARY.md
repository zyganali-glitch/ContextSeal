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

An LLM may explain or improve a migration proposal in future versions. It is never authoritative for these claims.

## Fixture versus live

The checked-in retail example is synthetic metadata shaped like DataHub entities and lineage. It exists so every judge gets a deterministic, privacy-safe demo. Runs against it are labeled `FIXTURE`.

A live DataHub read/write claim requires:

1. `CONTEXTSEAL_MODE=datahub`;
2. successful DataHub MCP initialization;
3. stored raw results from `get_entities`, `get_lineage`, and `get_dataset_queries`;
4. an approved passport before mutation;
5. `isError: false` individual mutation responses if write-back is claimed;
6. post-write retrieval for durable fields.

A **live normalized impact** claim additionally requires a target-derived graph contract. The committed local proof has live entity, lineage, query, and mutation evidence, but the dashboard's exact path visualization remains labeled fixture-derived. This distinction is deliberate.

## Forbidden claim upgrades

- A screenshot is not proof of API completion unless the underlying run record is included.
- Generated SQL is not executed SQL.
- A prepared mutation is not a completed mutation.
- A fixture PASS is not a live DataHub PASS.
- A hash proves integrity of captured bytes, not correctness or security.
- Passing unit tests are not a production-readiness certificate.
