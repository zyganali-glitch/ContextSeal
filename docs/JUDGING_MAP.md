# Judging Map

## Use of DataHub

- MCP reads entity context, downstream lineage, and observed queries.
- Risk decisions use ownership, governance signals, quality, incidents, and lineage.
- Approved outcomes write structured properties, description context, and a passport document back to DataHub.
- The write-back makes the next agent inherit the decision rather than starting from an empty chat.
- Committed live-local evidence proves three reads, five downstream assets, three bounded mutations, and post-write verification on synthetic metadata.

## Technical execution

- Typed contracts reject incomplete changes and approvals.
- Impact paths are reconstructed deterministically across bounded hops.
- Risk findings are versioned and test-covered.
- Destructive requests produce non-destructive migration artifacts.
- Passport hashes bind request, context, artifacts, evidence, and approval.
- MCP failures and disabled mutations fail closed.
- CI runs integrity checks, tests, demo generation, and container build.

## Originality

ContextSeal is not a catalog chatbot, text-to-SQL assistant, generic on-call agent, or metadata enrichment utility. It creates a pre-merge certification boundary between AI-generated data code and an organization's real context graph.

## Real-world usefulness

The target user is a data platform or analytics engineering team reviewing schema changes that cross repositories, platforms, dashboards, pipelines, and ML consumers. The first product scope focuses on three frequent breaking changes and produces artifacts a team can actually review.

## Submission quality

- One-button fixture demo
- Clear fixture/live labels
- Under-three-minute shot plan
- No-install architecture overview
- Apache-2.0 license
- Exact judge test path
- Turkish beginner operator manuals and English judge materials

## Open-source bonus

The repository includes a reusable DataHub change-certification skill. The intended bonus contribution is an upstream pull request to the DataHub Skills registry after live MCP verification.
