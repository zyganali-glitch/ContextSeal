# ContextSeal Contributor Contract

ContextSeal is a clean-room project created during the Build with DataHub Agent Hackathon submission window.

## Non-negotiable rules

1. Never claim a fixture, mock, screenshot, or planned integration is a live verified result.
2. Preserve the evidence states `PASS`, `WARN`, `FAIL`, `NOT_RUN`, `STALE`, and `FIXTURE` exactly.
3. DataHub mutations require both an approved certification run and explicit runtime mutation enablement.
4. Never log, persist, display, or commit DataHub tokens, GitHub tokens, credentials, or source data rows.
5. Deterministic validation is authoritative. Model output may explain or propose; it may not overwrite evidence.
6. Keep the three-minute judge path working after every product change.
7. Any reused third-party code must be license-compatible and attributed. Do not copy code from pre-existing personal projects.

## Required checks

Run `npm run validate` before claiming a change is complete.
