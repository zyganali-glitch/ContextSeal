# Devpost Submission Draft

## Project name

ContextSeal

## Tagline

Every data change ships with proof, not confidence.

## Challenge category

Metadata-Aware Code Generation & Development

Secondary fit: Agents That Do Real Work.

## Inspiration

AI coding agents can generate valid SQL and dbt code while missing the organizational context that makes a change safe. A repository does not reveal that one field feeds a dashboard three hops away, powers a model, carries a PII term, or is owned by another team. DataHub already knows those relationships. We built ContextSeal to turn that knowledge into a pre-merge certification boundary.

## What it does

In the judge demo, ContextSeal spends about 100 seconds doing six things in order: block the risky rename, show the downstream blast radius, surface a bounded AI explanation, generate a safe migration package, record scoped approval, and end on the passport the next human or agent can inherit.

ContextSeal accepts a proposed column rename, drop, or type change. It reads DataHub entity context, lineage, ownership, governance signals, quality evidence, incidents, and observed queries. A deterministic policy engine reconstructs downstream paths and explains every risk finding. Instead of producing a destructive operation, ContextSeal generates an expand–migrate–contract dbt model, schema tests, rollback, and owner briefing.

After the deterministic verdict is fixed, an optional local Ollama layer can turn that grounded run into a non-authoritative owner alert, migration rationale, reviewer-note draft, and next-step guidance. If the runtime is unavailable, ContextSeal records `NOT_ENABLED` or `UNAVAILABLE` instead of fabricating confidence.

A human reviewer approves or rejects only that bounded safe scope. ContextSeal then creates a SHA-256 change passport covering the request, DataHub context, risk, generated artifacts, evidence states, approval, and expiration. In live mode it writes certification properties, decision context, and the passport document back to DataHub so the next engineer or agent inherits the decision.

## How we built it

- Node.js deterministic core and local HTTP API
- Dual-transport DataHub MCP client: official local stdio server and DataHub Cloud streamable HTTP
- Five-tool live read contract: `get_entities`, paginated `list_schema_fields`, `get_lineage`, per-target `get_lineage_paths_between`, and `get_dataset_queries`
- DataHub structured-property, description, and document mutation tools for write-back
- Bounded breadth-first lineage traversal
- Versioned risk policy and typed contracts
- Optional local Ollama adapter with grounded input and bounded output contracts
- dbt artifact generator
- SHA-256 passport manifest
- Dependency-free responsive dashboard
- Docker, GitHub Actions, automated Node tests, and Apache-2.0 licensing

## DataHub use

ContextSeal treats DataHub as both the decision context and the durable memory layer. It reads schema, ownership, governance, quality, query, and multi-hop lineage evidence. Approved outcomes are contributed back as structured properties, appended descriptions, and passport documents. This closes the loop: read context, act, prove, and enrich the graph.

## Challenges we ran into

The hardest design problem was separating a risky original request from a safe generated alternative. A direct rename can correctly receive a `BLOCKED` verdict while the staged migration remains eligible for scoped human approval. We also had to keep fixture, live, stale, and unexecuted evidence visibly distinct. During live verification, MCP correctly transported a tool-level validation failure using `isError`; treating protocol delivery as business success would have created false evidence. We changed the client to fail closed on that signal and added a regression test before accepting any PASS.

## Accomplishments

- Explainable multi-hop impact paths rather than a flat asset count
- Deterministic findings that model text cannot overwrite
- A safe migration package that preserves the original field during consumer transition
- Human approval cryptographically bound to the exact request, context, and artifacts
- Optional local AI companion with honest `NOT_ENABLED` / `UNAVAILABLE` fallback states
- Fail-closed DataHub write-back gates
- A reproducible judge fixture and a preserved historical disposable-local DataHub proof, kept separate from final-head claims until recaptured
- A deterministic local conformance harness that validates canonical model identity, schema-grounded tests, file hashes, and the bundle grounding contract
- A reviewer-ready PR bundle plus an optional token-gated draft PR path that keep GitHub delivery separate from deterministic evidence authority
- Five downstream dataset-shaped results retrieved through live MCP across seeded Airflow, Snowflake, Looker, MLflow, and Power BI platform metadata
- Four certification properties, an appended passport description, and a standalone decision document written and read back
- A canonical `datahub-schema-change-certification` skill package plus a public upstream PR #35 that is `OPEN / READY_FOR_REVIEW / NOT_MERGED`

## What we learned

Context is most valuable when it changes an action, not when it only improves an answer. DataHub makes it possible to move agent safety from prompt instructions into a repeatable workflow grounded in organizational facts. We also learned that honest `NOT_RUN` and `FIXTURE` states make an agent more credible, not less impressive.

## What's next

- Recapture disposable-local live DataHub proof from the reconciled final HEAD and re-run `npm run evidence:check`
- Add committed `dbt-core` + `dbt-duckdb` parse, compile, run, and test evidence for rename, type-change, and drop bundles
- Keep the upstream `datahub-schema-change-certification` contribution truthful until PR #35 is reviewed or merged
- Add target-derived normalization for more DataHub entity types
- Add signed reviewer identities and stronger reviewer-auth provenance
- Exercise the optional token-gated draft PR path against a real GitHub branch after explicit approval
- Add further warehouse-specific executors only after the mandatory DuckDB/dbt proof is green
- Extend from column changes to dbt model and pipeline schedule changes

## Submission links

- Repository: https://github.com/zyganali-glitch/ContextSeal
- Live demo: https://zyganali-glitch.github.io/ContextSeal/
- Demo video: `ADD_PUBLIC_YOUTUBE_URL`
- DataHub skill contribution: Public upstream PR #35 exists and is `OPEN / READY_FOR_REVIEW / NOT_MERGED`; the canonical package is included in the repository at `skills/datahub-schema-change-certification/`.

## Honest limitations

ContextSeal is a hackathon prototype. It does not auto-merge, execute production warehouse SQL, guarantee security, or claim customer impact. The default judge path uses fixture-backed path reconstruction, while separate live-local artifacts prove raw MCP reads and bounded write-back on synthetic metadata. The checked-in live artifacts are historical until recaptured from the reconciled final HEAD. Only operations with named artifacts are marked PASS.
