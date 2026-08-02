# Judging Map

## Challenge fit

- Primary category: Metadata-Aware Code Generation & Development
- Secondary support claim: Agents That Do Real Work is now supported by the visible Local AI Copilot panel, bounded fallback, and structured operator outputs; a local-model-backed `PASS` artifact remains environment-dependent
- Primary-track proof chain: captured DataHub-shaped context and deterministic policy findings ground generated dbt, test, rollback, and owner-brief artifacts; manifest hashes, local sandbox conformance, and a reviewer-ready PR bundle make that generated result inspectable before merge.

## Use of DataHub

- MCP reads entity context, authoritative schema fields, downstream lineage, exact lineage paths, and observed queries through `get_entities`, `list_schema_fields`, `get_lineage`, `get_lineage_paths_between`, and `get_dataset_queries`.
- Risk decisions use ownership, governance signals, quality, incidents, and lineage.
- Approved outcomes write structured properties, description context, and a passport document back to DataHub.
- The write-back makes the next agent inherit the decision rather than starting from an empty chat.
- The first viewport now surfaces the read -> block -> package -> certify flow, and the next strip explicitly shows how write-back and inheritance fit without overstating fixture-mode behavior.
- The judge-facing path view is fixture-backed unless a target-derived graph contract is exported separately.
- The recorded live-local proof preserves the five bounded read-only MCP tool types across ten reads and six downstream assets: two each of `DATASET`, `DATA_JOB`, and `DASHBOARD`. Its provenance-bound write-back export passed `npm run evidence:check` with three `APPLIED` operations, three `SKIPPED` verify-then-skip retries, and durable exact-one checks on synthetic metadata.
- Live-local MCP evidence does not upgrade the fixture dashboard path into live normalized impact or prove non-zero live query usage.

## Technical execution

- Typed contracts reject incomplete changes and approvals.
- Impact paths are reconstructed deterministically across bounded hops.
- Risk findings are versioned and test-covered.
- Optional local Ollama output can only run after deterministic verdict generation and must satisfy a bounded four-output schema.
- Destructive requests produce non-destructive migration artifacts.
- Generated artifacts are manifest-linked to request, lineage, policy, downstream-owner, and migration-rule grounding inputs; `npm run sandbox` checks the committed bundle's hashes and conformance contract without claiming warehouse execution.
- `npm run pr:bundle` creates the committed reviewer packet without a token; `npm run pr:draft -- --dry-run` validates the draft-PR request, while a live GitHub call remains explicit and token-gated.
- `npm run validate` is the read-only confidence gate for the committed repo surfaces and dry-run delivery request.
- Passport hashes bind request, context, artifacts, evidence, and approval.
- MCP failures and disabled mutations fail closed.
- CI runs integrity checks, tests, demo generation, and container build.

## Originality

ContextSeal is not a catalog chatbot, text-to-SQL assistant, generic on-call agent, or metadata enrichment utility. It creates a pre-merge certification boundary between AI-generated data code and an organization's real context graph.

## Real-world usefulness

The target user is a data platform or analytics engineering team reviewing schema changes that cross repositories, platforms, dashboards, pipelines, and ML consumers. The first product scope focuses on three frequent breaking changes and produces artifacts a team can actually review.

## Submission quality

- One-button fixture demo
- First-viewport blocked-risk hero plus visible inheritance loop
- Visible AI panel with honest unavailable fallback
- Clear fixture/live labels
- Manifest-linked generated bundle, local sandbox evidence, and token-free reviewer packet
- Under-three-minute shot plan
- No-install architecture overview
- Committed AI input/output artifacts
- Apache-2.0 license
- Exact judge test path
- Turkish beginner operator manuals and English judge materials

## Open-source bonus

The repository includes a reusable DataHub change-certification skill. The intended bonus contribution is an upstream pull request to the DataHub Skills registry after live MCP verification.
