# Evidence manifest

This is the claim ledger for the repository. `PASS` means the named claim has a reproducible artifact; it never upgrades the boundary of that artifact.

| Claim | State | Evidence artifact | Reproduction | Boundary / notes |
| --- | --- | --- | --- | --- |
| Typed rename/drop/type-change contract | `PASS` | `tests/workflow.test.js`, `tests/live-pipeline.test.js` | `npm test` | Rejects missing/unsafe/same-field and live destination-collision inputs |
| Multi-hop fixture impact trace | `PASS` | `examples/retail-context-graph.json`, generated demo, workflow tests | `npm run demo:check` | Five synthetic downstream assets; deepest fixture path four hops |
| Exact live-local path coverage | `PASS` | `examples/outputs/live-datahub-writeback-evidence.json` | `npm run evidence:check` | Disposable synthetic-local DataHub; every discovered target has an exact path |
| Deterministic policy blocks direct fixture rename | `PASS` | `config/policy.json`, workflow tests, generated demo | `npm test` | Fixture score 80; model text cannot change it |
| Safe staged dbt artifacts | `PASS` | `examples/outputs/generated/`, `tests/artifacts.test.js` | `npm run demo:check` | Generated, hash-bound, and reviewable; not executed SQL |
| Human scoped approval | `PASS` | workflow tests and approved fixture record | `npm test` | Approves the generated safe manifest, not the direct destructive request |
| Passport v2 binds all decision inputs | `PASS` | `src/core/passport.js`, adversarial tamper tests | `npm test` | Request, policy, raw/normalized evidence, impact, risk, artifacts, approval, expiry |
| Unapproved, stale, tampered, replayed, or superseded write-back rejected | `PASS` | live pipeline and server integration tests | `npm test` | Application control; not a formal authorization system |
| MCP protocol/tool failures fail closed | `PASS` | `tests/mcp-client.test.js` | `npm test` | Includes timeout, correlation, tool `isError`, stderr redaction |
| Incomplete schema/lineage/query evidence cannot silently lower risk | `PASS` | `tests/live-pipeline.test.js` | `npm test` | Authoritative schema pages, counts, truncation, inspectability, targets, exact paths, endpoint equality, and hop bounds |
| Local fixture judge flow works end to end | `PASS` | `scripts/smoke-server.js` | `npm run smoke` | Real local API and engine; synthetic context; write-back `NOT_RUN` |
| Hosted walkthrough is generated and internally consistent | `PASS` | `public/demo-data.json` | `npm run demo:check` | Historical generated `FIXTURE` snapshot; no backend |
| Docker fixture image builds and serves the API | `PASS` | `Dockerfile`, `compose.yaml`, CI container smoke | `docker compose up --build` | Fixture runtime only in the default Compose path |
| Live-local DataHub MCP read path executed | `PASS` | `examples/outputs/live-datahub-read-evidence.json` | `npm run evidence:check` | 10 captured MCP calls; complete 3-field schema in 1 page; 6 native downstream assets; 6 exact paths; synthetic local metadata |
| Live-local deterministic decision | `PASS` | `examples/outputs/live-datahub-writeback-evidence.json` | `npm run evidence:check` | Direct request score 70 / `BLOCKED`; only the generated safe scope was approved |
| MCP provenance captured without conflating versions | `PASS` | committed read evidence `mcp` object, pinned runtime args | `npm run evidence:check` | Launcher package v0.6.0; protocol `2025-03-26`; handshake `serverInfo` `datahub`/`3.4.4` |
| Live-local query tool result preserved honestly | `PASS` | committed read/write evidence | `npm run evidence:check` | `get_dataset_queries` executed; zero local records remain zero; no live usage finding claimed |
| Three bounded DataHub mutations completed | `PASS` | `examples/outputs/live-datahub-writeback-evidence.json` | `npm run evidence:check` | Exact synthetic target; individual successful receipts required |
| Structured properties and description reference read back | `PASS` | write-back evidence read-back section | `npm run evidence:check` | Post-write entity comparison; mutation and read-back states remain separate |
| Exact returned decision-document bindings verified | `PASS` | write-back evidence read-back section | `npm run evidence:check` | Exact document URN/title plus passport, manifest, and target literal matches; not full-body byte retrieval |
| Repository links, required surfaces, and credential signatures checked | `PASS` | `scripts/check-repository.js` | `npm run check` | Heuristic scan supplements, not replaces, GitHub secret scanning |
| Production warehouse SQL executed | `NOT_RUN` | None by design | Not applicable | Outside the product boundary |
| Automatic merge or deployment | `NOT_RUN` | None by design | Not applicable | Generated artifacts require existing review/deployment controls |
| Production/customer impact measured | `NOT_RUN` | None | Not applicable | No production deployment or customer study claimed |
| Formal security certification | `NOT_RUN` | None | Not applicable | Threat model and tests are engineering evidence, not certification |
| Public upstream DataHub Skills pull request | `PASS` | PR #35 is `OPEN / READY_FOR_REVIEW / NOT_MERGED` | [datahub-project/datahub-skills#35](https://github.com/datahub-project/datahub-skills/pull/35) | PR creation and ready-for-review state are verified; review, acceptance, and merge are not claimed |

## One-command verification

```bash
npm run validate
```

This runs repository integrity, committed-evidence structure, the Node test suite, deterministic demo idempotence, and a real fixture server smoke flow. CI repeats validation on Node 20 and 24 and separately builds/runs the container.

## Live-proof scope

The committed DataHub evidence is from a disposable local instance seeded with native Dataset, DataJob, and Dashboard entities owned by ContextSeal's synthetic markers. It contains metadata only, no source rows. The files are historical proof artifacts and may contain synthetic URNs, owners, descriptions, and query-tool payloads.

The physical files under `examples/outputs/generated/` belong to the deterministic fixture run. The live-local run's four generated artifact contents and hashes are embedded in `live-datahub-writeback-evidence.json`; the two surfaces are independently bound and their risk scores, query counts, and entity types must not be mixed.
