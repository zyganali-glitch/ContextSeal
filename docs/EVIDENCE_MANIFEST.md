# Evidence Manifest

| Claim | State | Freshness | Evidence |
| --- | --- | --- | --- |
| Typed schema-change contract works | PASS | `final-head` | `npm test`; `tests/workflow.test.js` |
| Five-hop fixture impact paths are reconstructed | PASS | `final-head` | `npm run demo`; fixture demo record; `tests/workflow.test.js` |
| Policy blocks the direct retail rename | PASS | `final-head` | `npm run demo`; deterministic score 80 fixture run |
| Safe staged dbt artifacts are generated | PASS | `final-head` | `examples/outputs/generated/` after `npm run demo`; `artifacts.grounding`; `examples/outputs/generated/ARTIFACT_MANIFEST.json` |
| Approval creates a hash-bound passport | PASS | `final-head` | `tests/workflow.test.js`; demo record |
| MCP runtime fails closed on transport, provenance, truncation, tamper, replay, and mutation-boundary errors | PASS | `final-head` | `tests/mcp-client.test.js`; `tests/live-pipeline.test.js`; `tests/server-integration.test.js`; `tests/store.test.js` |
| Dashboard route and fixture API judge path run end to end | PASS | `final-head` | `npm run smoke`; `npm run validate` |
| Generated artifact bundle passes deterministic local sandbox validation | PASS | `final-head` | `npm run sandbox`; `tests/sandbox-conformance.test.js` |
| Node, Python, demo, sandbox, smoke, and PR bundle validation contract passes on the reconciled HEAD | PASS | `final-head` | `npm run validate` |
| Docker image and container smoke on the exact reconciled HEAD | WARN | `pending final-head` | Workflow and smoke contract restored in `.github/workflows/*`; local Docker daemon/build proof was not available in this session |
| DataHub MCP read path executed live against the disposable synthetic-local catalog | WARN | `historical` | `examples/outputs/live-datahub-read-evidence.json`; final-head recapture pending before `npm run evidence:check` can pass |
| Structured properties were written and read back from DataHub | WARN | `historical` | `examples/outputs/live-datahub-writeback-evidence.json`; final-head recapture pending |
| Passport description and document were saved and read back from DataHub | WARN | `historical` | `examples/outputs/live-datahub-writeback-evidence.json`; final-head recapture pending |
| Public upstream DataHub Skills contribution exists | PASS | `historical external` | `docs/DATAHUB_SKILL_CONTRIBUTION.md`; PR #35 is `OPEN / READY_FOR_REVIEW / NOT_MERGED` |
| Production warehouse SQL executed | NOT_RUN | `n/a` | intentionally outside current scope |
| Customer impact measured | NOT_RUN | `n/a` | no customer deployment is claimed |

Update this table only when a named reproducible artifact exists.

The live evidence uses a disposable local DataHub instance seeded with synthetic metadata. It is not production or customer evidence.
