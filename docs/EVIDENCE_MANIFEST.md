# Evidence Manifest

| Claim | State | Freshness | Evidence |
| --- | --- | --- | --- |
| Typed schema-change contract works | PASS | `final-head` | `npm test`; `tests/workflow.test.js` |
| Deterministic fixture demo artifacts regenerate without wall-clock drift | PASS | `final-head` | `npm run demo:generate`; `npm run demo:check`; `examples/outputs/demo-certification.json`; `public/demo-data.json` |
| Five-hop fixture impact paths are reconstructed | PASS | `final-head` | `npm run demo:generate`; fixture demo record; `tests/workflow.test.js` |
| Policy blocks the direct retail rename | PASS | `final-head` | `npm run demo:generate`; deterministic score 80 fixture run |
| Safe staged dbt artifacts are generated | PASS | `final-head` | `examples/outputs/generated/`; `artifacts.grounding`; `examples/outputs/generated/ARTIFACT_MANIFEST.json` |
| Artifact manifest hashes bind the committed generated files | PASS | `final-head` | `examples/outputs/generated/ARTIFACT_MANIFEST.json`; `tests/artifacts.test.js`; `tests/workflow.test.js` |
| Approval creates a hash-bound passport | PASS | `final-head` | `tests/workflow.test.js`; demo record |
| Replay, stale, tamper, and supersede rejection are enforced | PASS | `final-head` | `tests/workflow.test.js`; `tests/store.test.js`; `tests/server-integration.test.js` |
| MCP runtime fails closed on transport, provenance, truncation, and mutation-boundary errors | PASS | `final-head` | `tests/mcp-client.test.js`; `tests/live-pipeline.test.js`; `tests/server-integration.test.js` |
| Schema completeness is enforced for live normalization | PASS | `final-head` | `tests/live-pipeline.test.js` |
| Exact downstream path coverage is enforced for live normalization | PASS | `final-head` | `tests/live-pipeline.test.js` |
| Zero-query honesty is preserved when live query pages report zero | PASS | `final-head` | `tests/live-pipeline.test.js`; `tests/ai-contracts.test.js` |
| Raw evidence hashes and v2 passport bindings are enforced | PASS | `final-head` | `tests/live-pipeline.test.js`; `tests/workflow.test.js`; `tests/evidence-validator.test.js` |
| Credential-shaped input, output, and diagnostics are rejected safely | PASS | `final-head` | `tests/credential-scan.test.js`; `tests/server-integration.test.js`; `tests/live-pipeline.test.js`; `npm run datahub:safety:test` |
| Dashboard route and fixture API judge path run end to end | PASS | `final-head` | `npm run smoke`; `npm run validate` |
| Generated artifact bundle passes deterministic local sandbox validation | PASS | `final-head` | `npm run sandbox:generate`; `npm run sandbox:check`; `tests/sandbox-conformance.test.js`; `examples/outputs/sandbox/generated-sandbox-evidence.json` |
| AI grounding and output artifacts are committed and deterministic | PASS | `final-head` | `examples/outputs/generated/ai/contextseal-ai-input.json`; `examples/outputs/generated/ai/contextseal-ai-output.json`; `examples/outputs/generated/ai/contextseal-ai-output.md`; `npm run demo:check` |
| PR bundle artifacts are committed and deterministic | PASS | `final-head` | `examples/outputs/pr/pr-body.md`; `examples/outputs/pr/pr-payload.json`; `examples/outputs/pr/pr-checklist.md`; `npm run pr:bundle:check` |
| Node, Python, demo, sandbox, smoke, and PR bundle validation contract passes on the reconciled HEAD without rewriting committed artifacts | PASS | `final-head` | `npm run validate`; `git diff --exit-code` on a clean checkout |
| Docker image and container smoke on the exact reconciled HEAD | WARN | `pending final-head` | Workflow and smoke contract restored in `.github/workflows/*`; local Docker daemon/build proof is still unavailable in this environment |
| GitHub Actions CI on the exact reconciled HEAD | NOT_RUN | `pending final-head` | `workflow_dispatch` and `reconcile/**` triggers are restored in `.github/workflows/ci.yml`; hosted execution evidence is still pending |
| GitHub Pages deployability on the exact reconciled HEAD | NOT_RUN | `pending final-head` | `.github/workflows/pages.yml` is restored with `workflow_dispatch`; exact-head hosted execution evidence is still pending |
| DataHub MCP read path executed live against the disposable synthetic-local catalog | WARN | `historical` | `examples/outputs/live-datahub-read-evidence.json`; final-head recapture pending before `npm run evidence:check` can pass |
| Structured properties were written and read back from DataHub | WARN | `historical` | `examples/outputs/live-datahub-writeback-evidence.json`; final-head recapture pending |
| Passport description and document were saved and read back from DataHub | WARN | `historical` | `examples/outputs/live-datahub-writeback-evidence.json`; final-head recapture pending |
| Public upstream DataHub Skills contribution exists | PASS | `historical external` | `docs/DATAHUB_SKILL_CONTRIBUTION.md`; PR #35 is `OPEN / READY_FOR_REVIEW / NOT_MERGED` |
| Optional local dbt execution proof exists | NOT_RUN | `n/a` | intentionally optional and not yet captured |
| Production warehouse SQL executed | NOT_RUN | `n/a` | intentionally outside current scope |
| Customer impact measured | NOT_RUN | `n/a` | no customer deployment is claimed |

Update this table only when a named reproducible artifact exists.

The live evidence uses a disposable local DataHub instance seeded with synthetic metadata. It is not production or customer evidence.
