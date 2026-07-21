# ContextSeal Architecture and Patterns

This file preserves the product's architectural soul while the hackathon roadmap evolves.

## Core architecture

1. Deterministic authority lives in `src/core/`.
2. External context collection and write-back live in `src/datahub/`.
3. The browser UI is a thin presentation layer over API results; it must not invent success states.
4. Evidence states are first-class domain values and must remain exact: `PASS`, `WARN`, `FAIL`, `NOT_RUN`, `STALE`, `FIXTURE`.
5. Safe migration artifacts are generated instead of direct destructive operations.

## Growth rules

1. Prefer additive adapters over rewriting the deterministic core.
2. If an agentic feature is added, isolate it behind a narrow adapter and an explicit fallback path.
3. Product truth beats visual flair. UI improvements may dramatize results, but not distort state.
4. Submission documents are part of the product surface; changes to claims or flows must update docs in the same request.
5. Keep the two-minute judge path and `npm run validate` healthy after every substantial change.