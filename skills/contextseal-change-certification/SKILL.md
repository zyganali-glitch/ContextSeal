---
name: contextseal-change-certification
description: Compatibility alias for the canonical datahub-schema-change-certification skill package. Use this only when an existing local workflow still calls the legacy name.
---

# ContextSeal Change Certification

This is the legacy local alias for the canonical skill package in `skills/datahub-schema-change-certification/`.

Use it only when an existing prompt, saved workflow, or local automation still calls `contextseal-change-certification` by name.

## Canonical source

- Canonical package: `skills/datahub-schema-change-certification/`
- Canonical skill file: `skills/datahub-schema-change-certification/SKILL.md`
- Canonical package README: `skills/datahub-schema-change-certification/README.md`

Follow the canonical package instructions without forking or weakening them. In particular:

- Keep live and fixture evidence separate.
- Require exact schema pagination, bounded lineage paths, and query evidence before live `PASS` claims.
- Treat the initial request as non-approval and require a scope-bound human decision.
- Keep DataHub mutations bounded, optional, and fail-closed until durable read-back passes.

## Compatibility rule

If the canonical package changes, update this alias to point at it; do not duplicate the workflow here.
