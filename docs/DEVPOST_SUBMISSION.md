# Devpost Submission

Status: **submitted** at <https://devpost.com/software/contextseal>. This document is the repository-side canonical submission reference. The public Devpost page is authoritative for the exact rendered submitted entry.

## Project name

ContextSeal

## Tagline

Every data change ships with proof, not confidence.

## Challenge category

Metadata-Aware Code Generation & Development

Secondary fit: Agents That Do Real Work.

## 30-second judge summary

ContextSeal stops a breaking schema change before merge by turning DataHub context into a deterministic decision and an inspectable safe migration package. It shows the blocked request, exact fixture-backed downstream paths, five generated review files (dbt model, schema tests, rename parity data test, rollback SQL, and impacted-owner brief), and a SHA-256 passport after scoped human approval. A bounded local AI layer explains the fixed verdict without changing it, while a separate recorded disposable-local DataHub proof demonstrates gated write-back and durable read-back on synthetic metadata.

## Inspiration

AI coding agents can generate valid SQL and dbt code while missing the organizational context that makes a change safe. A repository does not reveal that a field feeds a dashboard three hops away, carries a PII term, or belongs to another team. DataHub holds that context, but a reviewer still needs a safe action, evidence, and an auditable decision. We built ContextSeal to turn DataHub context into a pre-merge certification boundary and a durable change passport.

## What it does

In the final judge demo video (approximately 2:05), ContextSeal blocks a risky rename, shows its deterministic blast radius and 12-step agent trace, inspects a bounded AI explanation and generated artifact viewer, records scoped approval, and ends on the passport plus a separately labeled recorded live-local proof.

ContextSeal accepts a proposed column rename, drop, or type change. Its deterministic core uses captured DataHub-shaped target, lineage, ownership, governance, quality, incident, and query context to reconstruct downstream paths and explain every risk finding. Instead of producing a destructive operation, it generates five review files: an expand-migrate-contract dbt model, schema tests, a rename parity data test, rollback SQL, and an impacted-owner briefing. The committed manifest links each generated file to the request, deterministic findings, downstream-owner context, migration rule, and passport context. A local deterministic sandbox then checks that bundle against its hashes and grounding contract; it is a conformance proof, not warehouse SQL execution.

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

ContextSeal treats DataHub as both the decision context and the durable memory layer. The MCP read path uses entity, lineage, and dataset-query tools; approved write-back uses structured-property, description, and document mutation tools. The public judge flow deliberately keeps its exact path visualization fixture-backed and labeled `FIXTURE`, so every judge can reproduce it safely. A recorded disposable-local `PASS` bundle captures raw MCP reads, three bounded mutations, a same-passport retry that skips those three operations, and post-write retrieval against synthetic metadata. This keeps fixture analysis separate from any live normalized impact claim.

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
- Fail-closed DataHub write-back gates and a recorded disposable-local `PASS` proof with provenance-bound receipt and read-back validation
- A recorded live MCP summary with ten reads, six downstream assets, and two each of `DATASET`, `DATA_JOB`, and `DASHBOARD`
- A synthetic-local record of four certification properties, one appended passport description, one standalone decision document, three `APPLIED` operations, and three `SKIPPED` idempotent retry operations
- A reusable DataHub change-certification skill

## What we learned

Context is most valuable when it changes an action, not when it only improves an answer. DataHub makes it possible to move agent safety from prompt instructions into a repeatable workflow grounded in organizational facts. We also learned that honest `NOT_RUN`, `FIXTURE`, and local-AI availability states make an agent more credible, not less impressive.

## What's next

- Respond to maintainer feedback on the public DataHub Skills contribution, currently `OPEN / NOT MERGED / AWAITING MAINTAINER REVIEW`
- Add target-derived normalization for more DataHub entity types
- Add signed reviewer identities and replay protection
- Exercise the optional token-gated draft PR path against a real GitHub branch after explicit approval
- Add warehouse-specific sandbox executors
- Extend from column changes to dbt model and pipeline schedule changes

## Submission links

- Repository: https://github.com/zyganali-glitch/ContextSeal
- Live demo: https://zyganali-glitch.github.io/ContextSeal/
- Demo video: https://www.youtube.com/watch?v=ckhx5X1QQwo
  - Actual final edited runtime: approximately 2:05.
- Devpost submission: https://devpost.com/software/contextseal — submitted.
- DataHub skill contribution: [datahub-project/datahub-skills#35](https://github.com/datahub-project/datahub-skills/pull/35) — `OPEN / NOT MERGED / AWAITING MAINTAINER REVIEW`, verified from the public GitHub API on 2026-08-09.

## Submission gallery

The four final gallery images are committed under `docs/assets/devpost/`:

1. **Breaking Change Blocked Before Merge** — `docs/assets/devpost/01-breaking-change-blocked-before-merge.png`

   ContextSeal blocks a risky rename with a deterministic score of 80 after exposing five downstream assets from fixture-backed DataHub context.

2. **Five Evidence-Grounded Review Artifacts** — `docs/assets/devpost/02-five-evidence-grounded-review-artifacts.png`

   ContextSeal generates five reviewable migration files: a dbt model, schema tests, a rename parity test, rollback SQL, and an impacted-owner brief, all tied to grounding evidence.

3. **Human-Approved SHA-256 Change Passport** — `docs/assets/devpost/03-human-approved-sha256-change-passport.png`

   Scoped human approval issues a SHA-256 passport binding the request, deterministic evidence, generated artifacts, approval scope, and validity window.

4. **Recorded DataHub Write-Back and Read-Back** — `docs/assets/devpost/04-recorded-datahub-writeback-readback.png`

   Recorded disposable-local DataHub proof shows three bounded writes applied once, the same three skipped on retry, and durable read-back on synthetic metadata.

## Honest limitations

ContextSeal is a hackathon prototype. It does not auto-merge, execute production warehouse SQL, guarantee security, or claim customer impact; production warehouse execution and customer impact measurement both remain `NOT_RUN`. The default judge path uses fixture-backed path reconstruction, while the separate recorded live-local write-back bundle is limited to synthetic metadata and remains distinct from final-head hosted proof. The conformance sandbox proves generated-bundle integrity, and the separate real dbt proof artifact covers isolated local execution rather than production warehouses. GitHub Pages replays a recorded local Ollama `PASS` artifact; it does not perform hosted live inference. Only operations with current named artifacts are marked `PASS`.
