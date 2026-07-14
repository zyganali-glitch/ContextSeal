# Judging map

The [official rules](https://datahub.devpost.com/rules) list six equally weighted criteria. ContextSeal is designed so each criterion points to something a judge can inspect.

## 1. Use of DataHub

**Product role:** DataHub is both the decision context and durable memory layer.

- `get_entities` grounds the exact target and its governance metadata.
- `list_schema_fields` exhausts the authoritative target schema so a truncated entity response cannot hide a missing source or destination collision.
- `get_lineage` discovers downstream impact.
- `get_lineage_paths_between` supplies a real path for every discovered asset.
- `get_dataset_queries` adds usage only when inspectable records exist.
- `add_structured_properties` records certification status, risk, passport ID, and validity.
- `update_description` appends a compact passport reference.
- `save_document` stores the decision record.
- Post-write `get_entities` and `grep_documents` verify durable fields and exact document bindings.

The strongest loop is: **read graph → change the allowed action → generate safe work → human decision → write the decision back → verify it**.

## 2. Technical execution

- Deterministic typed contracts and versioned policy
- Raw-to-normalized MCP evidence recomputation
- Complete schema pagination plus exact path, endpoint-set, hop-bound, truncation, and count failure handling
- Safe dbt model, tests, non-colliding rollback, and owner briefing
- Passport v2 binding every decision input
- Operator bearer auth, exact target allowlist, explicit mutation gate, and replay protection
- Canonically bound three-operation write-back
- Separate mutation receipts and bounded-retry read-back
- Node 20/24 CI, idempotent generated outputs, structural evidence validation, server smoke, and container smoke

Primary evidence: `npm run validate`, `tests/`, `examples/outputs/`, and [Architecture](ARCHITECTURE.md).

## 3. Originality

ContextSeal is not a catalog chatbot, a generic metadata summary, or a text-to-SQL wrapper. Its unit of work is a risky change decision. It converts DataHub context into an enforceable, expiring passport for one safe migration scope.

The original contribution is the combination of:

- graph-derived blast-radius paths;
- deterministic safety authority;
- generated reversible delivery artifacts;
- human scope binding;
- durable DataHub memory for the next human or agent.

## 4. Real-world usefulness

The target user is a data-platform or analytics-engineering team reviewing schema changes that cross repositories, pipelines, datasets, dashboards, and model-scoring workflows. ContextSeal addresses a common failure mode: code that is locally correct but organizationally unsafe.

The prototype covers rename, drop, and type change. It deliberately stops before warehouse execution or automatic merge so teams retain their existing deployment controls.

## 5. Submission quality

- Two-minute local judge path
- No-install generated fixture walkthrough
- Sub-three-minute exact narration and shot list
- Sample dbt, rollback, owner, passport, and MCP evidence artifacts
- Clear fixture/live-local/production boundaries
- English submission package and Turkish operator guides
- Apache-2.0 license and public repository instructions

## 6. Open-source contribution bonus

The repository contains a generic, executable DataHub schema-change certification skill and a prepared upstream contribution package. Its status is `NOT_SUBMITTED` until a real public pull request exists.

See [DataHub skill contribution](DATAHUB_SKILL_CONTRIBUTION.md). Do not award or claim the bonus based only on the local package.

## Tie-break posture

The rules use criteria order for ties, making **Use of DataHub** the first tie-breaker. ContextSeal prioritizes meaningful read/write/read-back integration and honest evidence over a wider but shallower feature list.
