# Evidence boundary

ContextSeal treats evidence as a product surface, not a success-themed label. Every claim has a named authority, provenance, and one of six states.

## Evidence states

| State | Exact meaning |
| --- | --- |
| `PASS` | The named check or operation ran and its success condition was verified. |
| `WARN` | Evidence was collected, but it is incomplete or needs human attention. |
| `FAIL` | The named check ran and its success condition was not met. |
| `NOT_RUN` | The check or operation did not run. Prepared payloads remain `NOT_RUN`. |
| `STALE` | The evidence or certification is older than the active policy permits. |
| `FIXTURE` | The result came from ContextSeal's deterministic synthetic fixture. |

These states are never collapsed. In particular, a mutation receipt `PASS` and durable read-back `FAIL` are two different facts.

## Three product surfaces

| Surface | What runs | What it proves | Boundary |
| --- | --- | --- | --- |
| GitHub Pages | Replays committed `public/demo-data.json` | Reviewable product story and deterministic fixture output | Generated historical `FIXTURE` walkthrough; no backend |
| Local fixture | Runs the real API, policy, graph traversal, artifact generation, approval, and passport code | End-to-end application behavior without DataHub | Synthetic context; catalog write-back `NOT_RUN` |
| DataHub mode | Calls the official DataHub MCP server, normalizes raw responses, runs the same deterministic engine, and optionally writes an approved passport | Live-local MCP integration and bounded metadata mutation | Disposable local DataHub containing synthetic metadata |

None of these surfaces is described as production or customer evidence.

## Authorities

| Claim | Authority |
| --- | --- |
| Request validity | Typed change-contract validator |
| Target metadata and governance | Exact `get_entities` target response |
| Source existence and destination absence | Complete unfiltered `list_schema_fields` pages with continuous offsets and consistent counts |
| Downstream set and paths | Bounded `get_lineage` plus one `get_lineage_paths_between` result per discovered target; every path and reconstructed impact stay within the same `maxHops` |
| Query usage | Inspectable records returned by `get_dataset_queries`; a zero result stays zero |
| Risk score and findings | Versioned deterministic policy |
| Generated file content | Artifact generator plus per-file SHA-256 hashes |
| Human decision | Stored reviewer, note, scope, decision, and timestamp |
| Passport integrity | Recomputed manifest binding request, policy, normalized context, raw evidence, impact, risk, artifacts, approval, and validity |
| Mutation completion | Individual successful MCP mutation receipts |
| Durable structured metadata | Post-write `get_entities` comparison |
| Decision-document bindings | Exact receipt document URN/title plus literal passport, manifest, and target matches from `grep_documents` |

The local DataHub version used for the proof did not expose a full document-body retrieval through `get_entities`. ContextSeal therefore claims exact binding verification, not byte-for-byte retrieval of the entire saved document.

## Live evidence chain

A DataHub run can be called verified live context only when all of the following hold:

1. `CONTEXTSEAL_MODE=datahub`.
2. The operator bearer token is valid and the target appears in `CONTEXTSEAL_ALLOWED_TARGET_URNS`.
3. MCP initialization succeeds.
4. Raw tool responses are stored and SHA-256 bound.
5. Unfiltered `list_schema_fields` pages begin at zero, advance without gaps, preserve a stable total, and end with `remainingCount=0`.
6. The target URN and source field match that complete schema; generated rename/type destinations are absent from it.
7. Every discovered downstream target has an exact endpoint-bound path no longer than the requested policy `maxHops`.
8. The discovered endpoint set equals the bounded `traceImpact` set; counts alone cannot produce a live `PASS`.
9. The normalized context is recomputed from the raw responses and matches the run.
10. Impact, risk, and artifacts are recomputed from the normalized context and active policy.

A DataHub mutation additionally requires a fresh `CERTIFIED` passport, exact scoped approval, unchanged artifacts and policy, explicit `DATAHUB_MCP_MUTATIONS_ENABLED=true`, and no prior or in-progress write-back for that certification.

## What committed evidence validation proves

`npm run evidence:check` works offline. It verifies internal structure, hashes, synthetic ownership markers, target continuity, passport binding, successful mutation receipts, and durable read-back fields in the committed evidence files.

It does not contact DataHub, re-run historical MCP calls, or prove that an external system is still in the captured state. The evidence files remain a time-bounded record of a disposable local proof.

## Forbidden claim upgrades

- A screenshot is not an API receipt.
- A committed snapshot is not a live service.
- Generated SQL is not executed warehouse SQL.
- Prepared mutation payloads are not completed mutations.
- A fixture query example is not an observed production query.
- A hash proves integrity of captured bytes, not business correctness or formal security.
- Passing tests are not a production-readiness or security certification.
- A local synthetic DataHub run is not customer adoption or production impact.

## Privacy

Tokens are environment-only and are never placed in runs or evidence bundles. Live metadata can still contain private URNs, owners, descriptions, and query text; exported live bundles must be handled as private metadata unless an operator has reviewed and sanitized them.
