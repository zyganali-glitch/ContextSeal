# Devpost Submission Draft

## Project name

ContextSeal

## Tagline

Every data change ships with proof, not confidence.

## Challenge category

Agents That Do Real Work

Secondary fit: Metadata-Aware Code Generation & Development.

## Inspiration

AI coding agents can generate valid SQL and dbt code while missing the organizational context that makes a change safe. A repository does not reveal that one field feeds a dashboard three hops away, powers a model, carries a PII term, or is owned by another team. DataHub already knows those relationships. We built ContextSeal to turn that knowledge into a pre-merge certification boundary.

## What it does

ContextSeal accepts a proposed column rename, drop, or type change. It reads DataHub entity context, lineage, ownership, governance signals, quality evidence, incidents, and observed queries. A deterministic policy engine reconstructs downstream paths and explains every risk finding. Instead of producing a destructive operation, ContextSeal generates an expand–migrate–contract dbt model, schema tests, rollback, and owner briefing.

A human reviewer approves or rejects only that bounded safe scope. ContextSeal then creates a SHA-256 change passport covering the request, DataHub context, risk, generated artifacts, evidence states, approval, and expiration. In live mode it writes certification properties, decision context, and the passport document back to DataHub so the next engineer or agent inherits the decision.

## How we built it

- Node.js deterministic core and local HTTP API
- Dual-transport DataHub MCP client: official local stdio server and DataHub Cloud streamable HTTP
- DataHub entity, lineage, and query tools for context
- DataHub structured-property, description, and document mutation tools for write-back
- Bounded breadth-first lineage traversal
- Versioned risk policy and typed contracts
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
- Fail-closed DataHub write-back gates
- A reproducible judge fixture and a completed disposable-local DataHub proof
- Five downstream assets retrieved through live MCP across Airflow, Snowflake, Looker, MLflow, and Power BI metadata
- Four certification properties, an appended passport description, and a standalone decision document written and read back
- A reusable DataHub change-certification skill

## What we learned

Context is most valuable when it changes an action, not when it only improves an answer. DataHub makes it possible to move agent safety from prompt instructions into a repeatable workflow grounded in organizational facts. We also learned that honest `NOT_RUN` and `FIXTURE` states make an agent more credible, not less impressive.

## What's next

- Verify and contribute the ContextSeal skill upstream to DataHub Skills
- Add target-derived normalization for more DataHub entity types
- Add signed reviewer identities and replay protection
- Add GitHub pull-request delivery after explicit approval
- Add warehouse-specific sandbox executors
- Extend from column changes to dbt model and pipeline schedule changes

## Submission links

- Repository: https://github.com/zyganali-glitch/ContextSeal
- Live demo: https://zyganali-glitch.github.io/ContextSeal/
- Demo video: `ADD_PUBLIC_YOUTUBE_URL`
- DataHub skill contribution: Not submitted upstream yet; the review-ready skill source is included in the repository.

## Honest limitations

ContextSeal is a hackathon prototype. It does not auto-merge, execute production warehouse SQL, guarantee security, or claim customer impact. Fixture execution and live DataHub execution are labeled separately. Only operations with named artifacts are marked PASS.
