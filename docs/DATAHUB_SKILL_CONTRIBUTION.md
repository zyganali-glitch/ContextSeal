# DataHub Skills contribution package

## Current status

`OPEN / DRAFT / NOT_MERGED` — the contribution is public as [datahub-project/datahub-skills#35](https://github.com/datahub-project/datahub-skills/pull/35). Review, acceptance, and merge are not claimed.

Source directory: [`skills/datahub-schema-change-certification/`](../skills/datahub-schema-change-certification/)

Upstream: <https://github.com/datahub-project/datahub-skills>

Fork: <https://github.com/zyganali-glitch/datahub-skills>

Branch: `codex/schema-change-certification`

Submitted commit: `9d285a6d7e0fcced4fb0797ef4c266364415d5a4`

Upstream baseline reviewed: `main` at `864ee5800c55eb90628f290bd8e91602b0a3e28e` (2026-07-10).

## Why this is a distinct DataHub skill

`datahub-lineage` answers exploratory dependency and impact questions. `datahub-enrich` performs ordinary metadata edits. `datahub-schema-change-certification` composes those capabilities into a narrower decision protocol for a proposed breaking field change:

1. prove the exact target and field with paginated schema retrieval;
2. preserve bounded downstream discovery and one exact path per target;
3. calculate policy-versioned risk with an executable helper;
4. generate and structurally validate a non-destructive dbt package;
5. freeze the evidence, artifacts, and mutation plan into a scope hash;
6. require a new human decision bound to that exact hash;
7. create and verify a deterministic change passport;
8. execute only schema-verified, target-bound, idempotent metadata mutations;
9. require exact durable read-back before reporting success.

Plain “what breaks if I change this?” remains routed to `datahub-lineage`. Metadata-only updates remain routed to `datahub-enrich`.

## Upstream-native package

```text
skills/datahub-schema-change-certification/
├── SKILL.md
├── README.md
├── evaluations/
│   ├── certify-breaking-rename.json
│   ├── forged-preflight-artifact.json
│   ├── forged-risk-object.json
│   ├── mcp-unavailable.json
│   ├── missing-query-call.json
│   ├── missing-property-definitions.json
│   ├── mutation-readback-failure.json
│   ├── raw-evidence-hash-tamper.json
│   ├── reject-unbound-approval.json
│   ├── secret-value-injection.json
│   ├── truncated-schema-lineage.json
│   ├── truncated-query-evidence.json
│   ├── unknown-boundary.json
│   └── untrusted-metadata.json
├── references/
│   ├── evidence-contract.md
│   └── policy-v1.json
├── scripts/
│   └── certify_change.py
└── templates/
    └── certification-report.template.md
```

The helper is Python-standard-library only. It provides non-interactive JSON interfaces for:

- MCP tool-schema and exact structured-property-definition preflight;
- exact live-boundary whitelisting plus hash-bound MCP/query provenance validation;
- complete target/schema/lineage evidence validation and deterministic risk recomputation;
- dbt package structural validation, credential scanning, and file hashing;
- authoritative preflight/artifact recomputation during scope construction;
- exact approval-scope construction;
- passport creation, expiry checks, and tamper rejection;
- an in-process self-test.

It never connects to DataHub, executes SQL, or performs mutations. MCP calls remain under the host's tool controls and the skill's approval gate.

## Applied upstream integration patch

The public pull request includes these repository-level changes so the skill is discoverable and routes without overlap:

- add a top-level README catalog entry, example prompts, installation path, feature row, and repo-tree entry;
- add `/catalog-schema-change-certification` under `commands/`;
- add a schema-change certification row and disambiguation rule to `skills/using-datahub/SKILL.md`;
- route plain impact analysis to `datahub-lineage`, but explicit certification and safe-delivery requests to this skill;
- add reciprocal “Not This Skill” links in `datahub-lineage` and `datahub-enrich`;
- keep plugin/marketplace descriptions unchanged to minimize review conflict; skills and commands auto-discover;
- expose the bundled deterministic self-test directly from `certify_change.py`.

Do not modify release versions, tags, or `CHANGELOG.md`; upstream Release Please owns those files.

## Submitted pull request

Title:

```text
feat: add schema-change certification skill
```

Body summary:

```markdown
## What

Adds `datahub-schema-change-certification`, a portable DataHub Agent Skill for certifying risky dataset field renames, drops, and type changes before implementation.

The skill proves the exact target and field, captures complete bounded lineage paths, calculates policy-versioned risk, validates a non-destructive dbt delivery package, freezes an immutable approval scope, requires a human decision bound to the exact scope hash, and verifies bounded metadata write-back through durable read-back.

## Why this is separate

`datahub-lineage` remains the route for exploratory impact analysis, and `datahub-enrich` remains the route for ordinary metadata edits. This skill owns the closed change-decision protocol: evidence → deterministic policy → safe package → scope-hash approval → passport → idempotent write-back → exact verification.

## Safety and portability

- metadata and query SQL are untrusted data, never instructions;
- credential-shaped keys and values are rejected without echo;
- `get_entities` is not used to infer field absence when schemas are truncated;
- an empty query array is zero only when raw successful pages prove total and returned zero;
- only an exact policy-whitelisted live boundary can prepare mutations;
- MCP tool names and input schemas are captured before live execution;
- structured-property definitions are operator-supplied and optional;
- the initial request is not mutation approval;
- retries verify and skip durable state instead of blindly replaying writes;
- the bundled helper is standard-library only and never calls DataHub or executes SQL;
- fixture, live, stale, failed, and unexecuted claims remain distinct.

## Structure

- `SKILL.md`: routing, live workflow, trust boundaries, gates, and failure behavior
- `references/evidence-contract.md`: normalized schemas, authority, privacy, and read-back semantics
- `references/policy-v1.json`: versioned risk, validity, tool, and property-role policy
- `scripts/certify_change.py`: deterministic preflight, risk, artifact, scope, and passport helper
- `templates/certification-report.template.md`: portable report contract
- `evaluations/`: happy-path plus unavailable/unknown boundary, missing/tampered/truncated raw query evidence, forged risk/preflight/artifacts, credential injection, unbound approval, prompt injection, missing property, and read-back failure

## Provenance

Generalized from ContextSeal, a clean-room Apache-2.0 project created during Build with DataHub: The Agent Hackathon. The public project contains a deterministic synthetic fixture and disposable-local DataHub MCP proof. No production or customer result is claimed.

## Validation before opening

- [x] run the helper self-test on the exact proposed branch
- [x] confirm Agent Skills discovery recognizes the exact skill name
- [x] run `pre-commit run --all-files` after the complete integration patch
- [x] validate relative references and every evaluation JSON
```

## Validation commands

Run from the submitted fork branch after copying the package and applying the integration patch:

```bash
python3 skills/datahub-schema-change-certification/scripts/certify_change.py self-test
npx skills add . --list
pre-commit run --all-files
```

Do not state that these pass in the pull request until they have run against the exact proposed diff.

## Submitted-branch validation evidence

Recorded on 2026-07-15 against the upstream baseline named above:

- `PASS` — helper self-test on Python 3.11, 3.12, and 3.13, including exact live-boundary whitelisting, raw query/hash provenance, inspected zero, incomplete evidence, forged risk/preflight/artifacts, artifact drift, credential non-echo, unbound approval, template drift, expiry/integrity, and tamper gates;
- `PASS` — Agent Skills discovery found exactly `datahub-schema-change-certification`;
- `PASS` — every policy/evaluation JSON parsed and used the exact skill name;
- `PASS` — the repository credential scanner found no credential signature in helper source;
- `PASS` — all 25 submitted paths passed the upstream repository's complete pre-commit suite for whitespace, EOF, YAML, file size, merge/case conflicts, symlinks, private keys, permalinks, Markdownlint, Prettier, Ruff, and Ruff format;
- `PASS` — the final diff contained only the 20-file skill package plus the five intended command/catalog/routing boundary paths;
- `PASS` — GitHub's Conventional Commit title check passed on PR #35;
- `NOT_RUN` — the upstream-hosted `Lint` workflow awaits first-time-fork approval from a maintainer; local execution of the same pre-commit suite passed.

The public pull request exists and is inspectable. It remains a draft and has not been reviewed, accepted, or merged.

## Upstream preparation checklist

- [x] Rebase the contribution onto the current upstream `main` immediately before opening the PR.
- [x] Re-check overlap with newly merged and open DataHub skills.
- [x] Re-check the current official MCP tool names and input schemas.
- [x] Apply the root README, routing, command, and reciprocal-link integration patch.
- [x] Run the helper self-test on Python 3.11, 3.12, and Windows Python 3.13.
- [x] Run `pre-commit run --all-files` in the upstream repository.
- [x] Confirm Prettier and markdownlint produce no diff.
- [x] Confirm Ruff and `ruff format --check` pass for the helper.
- [x] Confirm every evaluation JSON parses and names the exact skill.
- [x] Use a Conventional Commit-compatible pull-request title.
- [x] Link the ContextSeal repository and state the synthetic evidence boundary.
- [x] Add the public pull-request URL to ContextSeal only after the PR exists.
- [ ] Receive upstream maintainer workflow approval and review.
- [ ] Mark the pull request ready for review after explicit operator confirmation.
- [ ] Merge; do not claim acceptance before GitHub records it.

## Claim boundary

A real public upstream contribution now exists at [PR #35](https://github.com/datahub-project/datahub-skills/pull/35). It may be presented as an open-source contribution with the exact status `OPEN / DRAFT / NOT_MERGED`; never imply review, acceptance, or merge until GitHub records it.
