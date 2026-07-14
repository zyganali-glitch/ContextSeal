# Threat model

ContextSeal is a hackathon prototype that can hold privileged metadata credentials in DataHub mode. Its controls reduce accidental and agent-driven misuse; they are not a formal security certification.

## Protected assets

- DataHub credentials and the separate ContextSeal operator token
- Private URNs, ownership, descriptions, query text, and governance metadata
- Catalog integrity
- Human approval intent
- Evidence-state and passport integrity
- Generated migration artifacts
- Local run and event records

## Trust boundaries

1. **Browser to ContextSeal API** — live POST requests require a bearer token kept only in tab memory.
2. **ContextSeal to DataHub MCP** — the backend holds the DataHub credential and validates protocol/tool responses.
3. **Raw MCP evidence to deterministic decision** — normalization and all downstream outputs are recomputed before mutation.
4. **Human decision to external side effect** — approval binds one exact manifest and expires.
5. **Mutation receipt to durable claim** — write receipts and read-back evidence remain separate.

## Threats and controls

| Threat | Control | Residual risk |
| --- | --- | --- |
| Credential disclosure | Environment-only secrets, ignored `.env`, generic MCP process errors, credential scan, no token fields in runs | Operators can still expose a token in a screenshot, terminal, issue, or manually exported file |
| Unauthorized API proxy | Loopback default, required operator bearer token, JSON-only POSTs, explicit target allowlist | A compromised local user/process can access operator memory or environment |
| Arbitrary catalog mutation | Runtime write-back uses operator auth, target allowlist, fresh live evidence, scoped approval, and the mutation gate. Bootstrap defaults to read-only and binds exact endpoint/scope/script bytes to a separately approved plan; existing entities require exact markers and remote apply adds exact HTTPS endpoint/URN allowlists. | A privileged operator can deliberately alter code or environment; DataHub does not provide a cross-client create-only transaction for bootstrap races |
| Approval replay | Passport binds all decision inputs and expiry; prior/in-progress/superseded runs are rejected | Multi-host locking is outside this prototype unless a shared store is added |
| Tampered normalized context | Raw evidence hash is recomputed; normalized context, impact, risk, and artifacts are reconstructed | DataHub itself or an authorized MCP server can return incorrect metadata |
| Incomplete schema/lineage/query evidence | Unfiltered schema pagination, stable counts, progress, inspectability, endpoint equality, hop bounds, and exact-path coverage checks fail closed | A source system may omit metadata that DataHub never ingested |
| Hallucinated success | Locked evidence vocabulary, tool-level `isError` handling, per-operation receipts, durable read-back | External systems can acknowledge a write that later changes |
| Eventual consistency | Bounded retry on read-only verification; mutations are never retried | Verification can still time out and remain `WARN`/`FAIL` after a successful mutation |
| Stale graph context | Policy freshness window and passport expiry | Metadata can change immediately after capture |
| SQL injection / duplicate columns | Identifier allowlist, type grammar, live schema collision checks, no warehouse executor | Generated SQL still needs adapter-specific review |
| Path explosion / denial of service | Body cap, MCP timeout, maximum hops/results, truncation rejection | Very large graphs may require a paginated future design |
| Prompt or metadata injection | Deterministic policy treats external text as data; no model output can authorize or overwrite evidence | A future explanatory model integration will need additional isolation |
| Fixture confused with live | Separate runtime modes, immutable `FIXTURE` state, hosted historical-record copy | A malicious third party can crop or relabel screenshots |
| Live evidence oversharing | Backend-only raw records, explicit export privacy warning, no source rows | URNs, owners, and query text can still be sensitive metadata |

## Operational rules

- Use a disposable synthetic target for the committed proof.
- Start with `DATAHUB_MCP_MUTATIONS_ENABLED=false`.
- Treat `datahub:seed` and `datahub:properties` as read-only preflight; use the named apply commands only with the latest exact plan hash and immediately clear their shell approvals.
- Never reuse the DataHub credential as `CONTEXTSEAL_OPERATOR_TOKEN`.
- Set `CONTEXTSEAL_ALLOWED_TARGET_URNS` to the minimum exact set.
- Restore the mutation gate to `false` immediately after proof capture.
- Treat any exported live bundle as private until reviewed.

## Out of scope

ContextSeal is not an operating-system sandbox, identity provider, secret manager, production warehouse executor, multi-region coordinator, or formal security/compliance certification system.
