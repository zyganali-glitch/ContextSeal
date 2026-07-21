# PR Review Packet Contract

Updated: 2026-07-21 UTC

## Purpose

ContextSeal does not auto-open or auto-merge GitHub pull requests by default. This contract locks the reviewer-ready handoff shape for an approved run and keeps the offline packet authoritative even when optional PR automation is used.

The default path must stay free, local, and token-free. Optional draft PR creation is an additive path for a later step and must never redefine the packet shape described here.

## Scope boundary

- Only `APPROVED_FOR_WRITEBACK` runs may produce a PR packet.
- The packet may describe only the safe generated compatibility change, never the original blocked destructive request as the change to merge.
- The packet must reference named evidence artifacts that already exist in the repository.
- The packet must not contain credentials, tokens, raw secrets, or fabricated execution claims.
- The packet must not imply auto-merge, live deployment, or warehouse execution.

## Required inputs

| Input surface | Why it is required |
| --- | --- |
| `examples/outputs/demo-certification.json` or an equivalent approved run record | Source of `runId`, request details, deterministic risk, approval, and passport context |
| `examples/outputs/generated/ARTIFACT_MANIFEST.json` | Proves which generated files belong to the run and how they map to grounding refs |
| `examples/outputs/sandbox/generated-sandbox-evidence.json` | Proves the committed generated bundle passed deterministic local conformance checks |
| `examples/outputs/generated/models/*.sql` | Reviewable generated dbt model payload |
| `examples/outputs/generated/models/*.yml` | Reviewable generated schema-test payload |
| `examples/outputs/generated/rollback/*.sql` | Reviewable rollback payload |
| `examples/outputs/generated/IMPACTED_OWNERS.md` | Reviewable owner communication payload |
| `examples/outputs/generated/ai/contextseal-ai-output.md` when present | Optional non-authoritative reviewer-note draft for the PR body |

## Output contract

`W-15A` and `W-15C` must produce these repository artifacts:

- `examples/outputs/pr/pr-body.md`
- `examples/outputs/pr/pr-payload.json`
- `examples/outputs/pr/pr-checklist.md`

These files are the offline default review handoff. They must be usable without a GitHub token.

## Branch and title rules

The bundle generator must derive a deterministic branch name from the approved run:

`contextseal/<change-type>/<entity-name>-<run-id>`

Examples:

- `contextseal/rename-column/gold-customers-csr_29d34a4cea700f26`
- `contextseal/type-change/gold-customers-csr_29d34a4cea700f26`
- `contextseal/drop-column/gold-customers-csr_29d34a4cea700f26`

The PR title must reflect the safe generated change, not the blocked destructive request:

- Rename: `ContextSeal: staged rename for <entityName>.<sourceField> -> <destinationField>`
- Type change: `ContextSeal: staged type migration for <entityName>.<sourceField>`
- Drop: `ContextSeal: staged deprecation for <entityName>.<sourceField>`

## PR body contract

`pr-body.md` must contain these sections in order:

1. `Summary`
2. `Blocked original request`
3. `Safe generated plan`
4. `Grounding from DataHub`
5. `Changed files`
6. `Validation evidence`
7. `Reviewer decision boundary`
8. `Manual follow-up after merge`

Each section has required content:

### Summary

- `runId`
- `passportId`
- target entity name and change type
- one-sentence explanation of the safe staged strategy

### Blocked original request

- original requested operation
- deterministic verdict
- risk score
- finding codes

### Safe generated plan

- migration rule id
- migration strategy
- note that the generated change preserves compatibility until consumers migrate

### Grounding from DataHub

- impacted asset count
- high-criticality asset count
- downstream owner list
- at least one representative path from the manifest grounding

### Changed files

- exact repo-relative file list that will be proposed for review
- every entry must come from `ARTIFACT_MANIFEST.json`

### Validation evidence

- link or path to the approved run record
- link or path to the artifact manifest
- link or path to the sandbox evidence artifact
- optional link or path to the AI reviewer note artifact when present

### Reviewer decision boundary

- explicit statement that approval covers only the safe generated compatibility change
- explicit statement that deterministic evidence remains authoritative over AI text
- explicit statement that write-back and merge remain separate human-governed actions

### Manual follow-up after merge

- downstream consumer migration
- eventual source-field deprecation or removal outside this PR
- rerun of validation in the target repository

## Checklist contract

`pr-checklist.md` must contain these reviewer checks:

- Confirm the PR describes the safe generated change rather than the blocked destructive request.
- Confirm the generated file list matches `ARTIFACT_MANIFEST.json`.
- Confirm the sandbox evidence artifact is `PASS` and references the same run and passport context.
- Confirm the owner brief matches the impacted downstream owners.
- Confirm no token, credential, or source data row appears in the packet.
- Confirm merge does not imply immediate source-field removal.
- Confirm any write-back or deployment step remains outside the PR packet.

## Payload contract

`pr-payload.json` must be machine-readable and include at least these keys:

- `runId`
- `passportId`
- `baseBranch`
- `branchName`
- `title`
- `bodyPath`
- `checklistPath`
- `changeType`
- `entityName`
- `sourceField`
- `destinationField`
- `generatedFiles`
- `evidenceFiles`
- `draftPrSupported`
- `requiresTokenForDraftCreation`
- `manualReviewerActions`

`generatedFiles` must be populated exclusively from the manifest artifact list. `evidenceFiles` must include the approved run record, manifest, and sandbox evidence artifact.

## Token boundary

The default offline packet generator must require no GitHub credentials.

Optional draft PR creation in `W-15B` may require:

- `GITHUB_TOKEN`
- target repository owner/name
- base branch

That token-backed path must remain optional, explicit, and separate from artifact generation. No token value may be written into repository artifacts, logs, or committed examples.

## Current fixture-backed example mapping

The current committed fixture run implies this reviewable generated file set:

- `generated/models/gold_customers_contextseal.sql`
- `generated/models/gold_customers_contextseal.yml`
- `generated/rollback/gold_customers.sql`
- `generated/IMPACTED_OWNERS.md`

The current committed evidence set that the packet must cite is:

- `examples/outputs/demo-certification.json`
- `examples/outputs/generated/ARTIFACT_MANIFEST.json`
- `examples/outputs/sandbox/generated-sandbox-evidence.json`
- `examples/outputs/generated/ai/contextseal-ai-output.md`

## Validation rule for later phases

Before a PR packet is claimed complete, the repo must pass this sequence:

```bash
npm run demo
npm run sandbox
node scripts/build-pr-bundle.js
npm run pr:draft -- --dry-run
npm run validate
```

This document is the authoritative contract for `scripts/build-pr-bundle.js` and `scripts/create-draft-pr.js`. Shipped automation may not diverge from it without updating the plan first.