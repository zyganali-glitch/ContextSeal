# Evidence Manifest

| Claim | State | Evidence |
| --- | --- | --- |
| Typed schema-change contract works | PASS | `tests/workflow.test.js` |
| Five-hop impact paths are reconstructed | PASS | fixture test and generated demo record |
| Policy blocks the direct retail rename | PASS | score 80 fixture test |
| Safe staged dbt artifacts are generated | PASS | `examples/outputs/generated/` after `npm run demo`, `artifacts.grounding` in the demo run record, and `examples/outputs/generated/ARTIFACT_MANIFEST.json` |
| Approval creates a hash-bound passport | PASS | workflow test and demo record |
| Unapproved write-back is rejected | PASS | workflow test |
| MCP session/error behavior is fail-closed | PASS | `tests/mcp-client.test.js` |
| Dashboard loads and the product API completes the judge flow | PASS | local render check plus containerized analyze/approve/write-back smoke test |
| Docker image and Compose service build and run unprivileged | PASS | local build, health check, fixture load, and full API smoke test |
| Generated artifact bundle passes deterministic local sandbox validation | PASS | `npm run sandbox` plus `tests/sandbox-conformance.test.js` |
| DataHub MCP read path executed live | PASS | `examples/outputs/live-datahub-read-evidence.json`: entity, five downstream assets, and query-history response |
| Structured properties written and read back from DataHub | PASS | live read evidence contains status, score, passport ID, and validity date |
| Passport description and document saved in DataHub | PASS | `examples/outputs/live-datahub-writeback-evidence.json` plus post-write read evidence |
| Production warehouse SQL executed | NOT_RUN | intentionally outside current scope |
| Customer impact measured | NOT_RUN | no customer deployment is claimed |

Update this table only when a named reproducible artifact exists.

The live evidence uses a disposable local DataHub instance seeded with synthetic metadata. It is not production or customer evidence.
