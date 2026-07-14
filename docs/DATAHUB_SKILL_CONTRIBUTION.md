# DataHub Skills contribution package

## Current status

`NOT_SUBMITTED` — the upstream-ready source is maintained here, but no DataHub Skills pull request is claimed until a public URL exists.

Source directory: [`skills/datahub-schema-change-certification/`](../skills/datahub-schema-change-certification/)

Intended upstream: <https://github.com/datahub-project/datahub-skills>

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

## Required upstream integration patch

The pull request should include these small repository-level changes so the skill is discoverable and routes without overlap:

- add a top-level README catalog entry, example prompts, installation path, feature row, and repo-tree entry;
- add `/catalog-schema-change-certification` under `commands/`;
- add a schema-change certification row and disambiguation rule to `skills/using-datahub/SKILL.md`;
- route plain impact analysis to `datahub-lineage`, but explicit certification and safe-delivery requests to this skill;
- add reciprocal “Not This Skill” links in `datahub-lineage` and `datahub-enrich`;
- update plugin/marketplace descriptions if the maintainer wants the enumerated catalog list kept exhaustive;
- register any accepted behavioral test with `tests/run-tests.sh`.

Do not modify release versions, tags, or `CHANGELOG.md`; upstream Release Please owns those files.

## Proposed pull request

Title:

```text
feat: add DataHub schema-change certification skill
```

Body:

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

- [ ] run the helper self-test on the exact proposed branch
- [ ] confirm Agent Skills discovery recognizes the exact skill name
- [ ] run `pre-commit run --all-files` after the complete integration patch
- [ ] validate relative references and every evaluation JSON
```

## Validation commands

Run from a fresh fork of the current upstream `main` after copying the package and applying the integration patch:

```bash
python3 skills/datahub-schema-change-certification/scripts/certify_change.py self-test
npx skills add . --list
pre-commit run --all-files
```

Do not state that these pass in the pull request until they have run against the exact proposed diff.

## Local package validation evidence

Recorded on 2026-07-15 against the upstream baseline named above:

- `PASS` — helper self-test, including exact live-boundary whitelisting, raw query/hash provenance, inspected zero, incomplete evidence, forged risk/preflight/artifacts, artifact drift, credential non-echo, unbound approval, template drift, expiry/integrity, and tamper gates;
- `PASS` — Agent Skills discovery found exactly `datahub-schema-change-certification`;
- `PASS` — every policy/evaluation JSON parsed and used the exact skill name;
- `PASS` — the repository credential scanner found no credential signature in helper source;
- `PASS` — all 20 source package files passed upstream pre-commit hooks for whitespace, EOF, large files, merge/case conflicts, private keys, permalinks, Markdownlint, Prettier, Ruff, and Ruff format;
- `PASS` — post-hook package hashes matched this repository's package byte-for-byte.

That was a package-only overlay on clean upstream `main`. The repository-level routing/command/catalog integration patch and `pre-commit run --all-files` on the final pull-request branch remain `NOT_RUN`. This section is not evidence that an upstream pull request exists.

## Upstream preparation checklist

- [ ] Rebase the contribution onto the current upstream `main` immediately before opening the PR.
- [ ] Re-check overlap with newly merged and open DataHub skills.
- [ ] Re-capture the current official MCP tool names and input schemas.
- [ ] Apply the root README, routing, command, reciprocal-link, and test integration patch.
- [ ] Run the helper self-test on Linux and Windows-compatible Python.
- [ ] Run `pre-commit run --all-files` in the upstream repository.
- [ ] Confirm Prettier and markdownlint produce no diff.
- [ ] Confirm Ruff and `ruff format --check` pass for the helper.
- [ ] Confirm every evaluation JSON parses and names the exact skill.
- [ ] Use a Conventional Commit-compatible pull-request title.
- [ ] Link the ContextSeal repository and state the synthetic evidence boundary.
- [ ] Add the public pull-request URL to ContextSeal only after the PR exists.

## Claim boundary

Preparing this package is not an upstream contribution by itself. Claim the Devpost open-source bonus only with a real public issue or pull-request URL. Never imply review, merge, or acceptance until it occurs.
