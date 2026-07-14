# Threat Model

## Protected assets

- DataHub access tokens
- Private asset names, URNs, owners, and query text
- Catalog integrity
- Human approval intent
- Evidence-state integrity
- Generated migration artifacts

## Main threats and controls

| Threat | Control | Residual risk |
| --- | --- | --- |
| Credential leak | Environment-only secrets, `.env` ignored, no token logging | Operator can still paste a secret into an issue or screenshot |
| Unapproved catalog mutation | Fixture default, mode gate, live-evidence gate, mutation gate, approved-run gate | A privileged operator can deliberately bypass local controls |
| Hallucinated completion | Locked evidence vocabulary, MCP `isError` fail-closed handling, named artifacts, and post-write reads | External systems can still report incorrect state |
| Stale graph context | 24-hour freshness policy and hashed snapshot | A change can occur immediately after capture |
| Path explosion | Bounded hop count and visited set | Very large graphs still need pagination strategy |
| SQL injection | Strict identifier allowlist; no production execution | Generated SQL still requires warehouse-specific review |
| Approval replay | Passport binds approval to request/context/artifact hashes and expiry | Prototype has no external identity signature |
| Fixture confused with live | UI badge, `FIXTURE` state, separate live mode | Screenshots can be cropped misleadingly |

## Out of scope

ContextSeal is not an operating-system sandbox, identity provider, secrets manager, warehouse execution service, or formal security certification system.
