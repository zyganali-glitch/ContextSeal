---
name: contextseal-change-certification
description: Certify a proposed schema change by gathering DataHub context, tracing downstream impact, producing a safe migration, recording human approval, and writing a bounded passport back to DataHub.
---

# ContextSeal Change Certification

Use this skill when a user proposes renaming, dropping, or changing the type of a dataset column.

## Safety contract

- Never treat a chat message as approval for a catalog mutation.
- Never claim a generated query ran unless a named execution artifact exists.
- Keep `PASS`, `WARN`, `FAIL`, `NOT_RUN`, `STALE`, and `FIXTURE` distinct.
- Do not retrieve or expose source data rows. Metadata context is sufficient.
- A direct destructive change with downstream consumers must be converted into a staged migration.

## Workflow

1. Convert the request into the ContextSeal change contract.
2. Use DataHub MCP `get_entities` for schema, ownership, tags, terms, quality, and incidents.
3. Use `get_lineage` for downstream table- and column-level impact up to five hops.
4. Use `get_dataset_queries` to find observed references to the changing field.
5. Calculate deterministic findings before asking a model to explain them.
6. Generate an expand–migrate–contract dbt model, tests, rollback, and owner briefing.
7. Present the exact scope, forbidden direct operation, findings, and missing evidence.
8. Require an explicit reviewer decision.
9. After approval, create a hash manifest and prepare these mutation tools:
   - `add_structured_properties`
   - `update_description`
   - `save_document`
10. Invoke mutations only when runtime mutation enablement is true.
11. Return the passport ID, manifest hash, write-back result, and any `NOT_RUN` claims.

## Completion standard

A run is complete only when its final state and every evidence claim can be traced to a named artifact. If write-back is disabled, report `NOT_RUN`; do not call the run fully complete.
