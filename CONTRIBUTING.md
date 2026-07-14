# Contributing

Thank you for improving ContextSeal.

## Development workflow

1. Create a focused branch.
2. Install with `npm ci --ignore-scripts`.
3. Keep fixture, hosted, live-local, and production claims visibly separate.
4. Add a regression test for any contract, policy, MCP shape, passport, artifact, or state-machine change.
5. Regenerate outputs only with `npm run demo:generate`.
6. Run `npm run validate` and confirm `git diff --check` is clean.
7. Explain every new DataHub read or mutation tool and its failure behavior in the pull request.

## Evidence rules

- Preserve `PASS`, `WARN`, `FAIL`, `NOT_RUN`, `STALE`, and `FIXTURE` exactly.
- Never promote a fixture, screenshot, planned integration, prepared payload, or generated SQL into a live/executed claim.
- Deterministic policy and validation are authoritative.
- A mutation receipt and durable read-back are separate claims.
- Update `docs/EVIDENCE_MANIFEST.md` only when a named reproducible artifact exists.

## Security rules

- Never commit `.env`, tokens, credentials, private tenant URLs, source rows, or proprietary metadata.
- Keep fixture mode the default.
- Live mutations require operator auth, exact target allowlisting, a fresh approved passport, and explicit runtime enablement.
- Do not add mutation retries.
- Treat exported live metadata as private unless it has been reviewed and sanitized.

## Generated and third-party work

Do not hand-edit committed demo output; change the generator and regenerate. Reused third-party code must be license-compatible and attributed. Contributions are accepted under Apache License 2.0.
