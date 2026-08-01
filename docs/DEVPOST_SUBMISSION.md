# Devpost Submission Draft

## Project name

ContextSeal

## Tagline

Every data change ships with proof, not confidence.

## Challenge category

Metadata-Aware Code Generation & Development

Secondary fit: Agents That Do Real Work.

## Inspiration

AI coding agents can generate valid SQL and dbt code while missing the organizational context that makes a change safe. A repository does not reveal that a field feeds a dashboard three hops away, carries a PII term, or belongs to another team. DataHub holds that context, but a reviewer still needs a safe action, evidence, and an auditable decision. We built ContextSeal to turn DataHub context into a pre-merge certification boundary and a durable change passport.

## What it does

In the 100-second judge demo, ContextSeal blocks a risky rename, shows its deterministic blast radius, surfaces a bounded AI explanation, generates a safe migration package, records scoped approval, and ends on the passport that the next human or agent can inherit.

ContextSeal accepts a proposed column rename, drop, or type change. Its deterministic core uses captured DataHub-shaped target, lineage, ownership, governance, quality, incident, and query context to reconstruct downstream paths and explain every risk finding. Instead of producing a destructive operation, it generates an expand-migrate-contract dbt model, schema tests, rollback, and owner briefing. The committed manifest links each generated file to the request, deterministic findings, downstream-owner context, migration rule, and passport context. A local deterministic sandbox then checks that bundle against its hashes and grounding contract; it is a conformance proof, not warehouse SQL execution.

After the deterministic verdict is fixed, an optional local Ollama layer can turn the grounded run into a non-authoritative owner alert, migration rationale, reviewer-note draft, and next-step guidance. The AI receives structured grounded input, cannot alter risk or evidence states, and records `NOT_ENABLED` or `UNAVAILABLE` when the local runtime is absent instead of fabricating confidence.

A human reviewer approves or rejects only that bounded safe scope. ContextSeal then creates a SHA-256 change passport covering the request, context, risk, generated artifacts, evidence states, approval, and expiration. The default delivery path also refreshes a reviewer-ready PR body, checklist, and payload without a GitHub token; an actual draft PR call is optional and token-gated. In approved live mode, with mutations explicitly enabled, ContextSeal writes certification properties, decision context, and the passport document back to DataHub so the next engineer or agent inherits the decision.

## How we built it

- Node.js deterministic core and local HTTP API
- Dual-transport DataHub MCP client: official local stdio server and DataHub Cloud streamable HTTP
- DataHub entity, lineage, and query tools for context
- DataHub structured-property, description, and document mutation tools for write-back
- Bounded breadth-first lineage traversal
- Versioned risk policy and typed contracts
- Optional local Ollama adapter with grounded input and bounded output contracts
- dbt artifact generator
- SHA-256 passport manifest
- Dependency-free responsive dashboard
- Docker, GitHub Actions, automated Node tests, and Apache-2.0 licensing

## DataHub use

ContextSeal treats DataHub as both the decision context and the durable memory layer. The MCP read path uses entity, lineage, and dataset-query tools; approved write-back uses structured-property, description, and document mutation tools. The public judge flow deliberately keeps its exact path visualization fixture-backed and labeled `FIXTURE`, so every judge can reproduce it safely. Separate disposable-local evidence records raw MCP reads, bounded mutations, and post-write retrieval against synthetic metadata. This closes the loop without conflating fixture analysis with live normalized impact: read context, act, prove, write back, and inherit.

## Challenges we ran into

The hardest design problem was separating a risky original request from a safe generated alternative. A direct rename can correctly receive a `BLOCKED` verdict while the staged migration remains eligible for scoped human approval. We also had to keep fixture, live, stale, and unexecuted evidence visibly distinct. During live verification, MCP correctly transported a tool-level validation failure using `isError`; treating protocol delivery as business success would have created false evidence. We changed the client to fail closed on that signal and added a regression test before accepting any PASS.

## Accomplishments

- Explainable multi-hop fixture paths rather than a flat asset count
- Deterministic findings that model text cannot overwrite
- A safe migration package that preserves the original field during consumer transition
- Human approval cryptographically bound to the exact request, context, and artifacts
- Inspectable grounded AI input/output artifacts, plus honest `NOT_ENABLED` / `UNAVAILABLE` fallback states
- A deterministic local sandbox harness that validates the generated artifact bundle against its manifest and grounding contract
- A reviewer-ready PR bundle and token-free draft-PR request validation, while live GitHub creation remains optional and token-gated
- A hardened five-tool live read contract using `get_entities`, `list_schema_fields`, `get_lineage`, `get_lineage_paths_between`, and `get_dataset_queries` before any deterministic package or mutation claim
- Fail-closed DataHub write-back gates and a completed disposable-local proof
- A typed downstream summary retrieved through live MCP: six `DATASET`, two `DATA_JOB`, and two `DASHBOARD` entities across seeded Airflow, Snowflake, Looker, MLflow, and Power BI metadata
- Four certification properties, an appended passport description, and a standalone decision document written and read back against synthetic metadata
- A reusable DataHub change-certification skill

## What we learned

Context is most valuable when it changes an action, not when it only improves an answer. DataHub makes it possible to move agent safety from prompt instructions into a repeatable workflow grounded in organizational facts. We also learned that honest `NOT_RUN`, `FIXTURE`, and local-AI availability states make an agent more credible, not less impressive.

## What's next

- Respond to maintainer feedback on the public DataHub Skills contribution, currently `OPEN / REVIEW_REQUIRED / NOT_MERGED`
- Add target-derived normalization for more DataHub entity types
- Add signed reviewer identities and replay protection
- Exercise the optional token-gated draft PR path against a real GitHub branch after explicit approval
- Add warehouse-specific sandbox executors
- Extend from column changes to dbt model and pipeline schedule changes

## Submission links

- Repository: https://github.com/zyganali-glitch/ContextSeal
- Live demo: https://zyganali-glitch.github.io/ContextSeal/
- Demo video: `ADD_PUBLIC_YOUTUBE_URL`
- DataHub skill contribution: [datahub-project/datahub-skills#35](https://github.com/datahub-project/datahub-skills/pull/35) — `OPEN / REVIEW_REQUIRED / NOT_MERGED` when verified on 2026-08-01.

## Honest limitations

ContextSeal is a hackathon prototype. It does not auto-merge, execute production warehouse SQL, guarantee security, or claim customer impact. The default judge path uses fixture-backed path reconstruction, while separate live-local artifacts prove raw MCP reads and bounded write-back on synthetic metadata. The sandbox proves generated-bundle conformance, not warehouse execution. The checked-in AI artifact is truthful about local runtime availability; a local-model-backed `PASS` capture still depends on an environment with Ollama. Only operations with named artifacts are marked `PASS`.
