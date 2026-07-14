# Security policy

## Supported version

ContextSeal is a hackathon prototype. Only the latest commit on `main` is supported.

## Reporting

Do not open a public issue containing a credential, private URN, internal query, owner identity, tenant URL, or customer name. Use GitHub private vulnerability reporting when available or contact the repository owner privately.

If a credential may have been exposed:

1. revoke it immediately;
2. replace it with a new scoped credential;
3. remove it from screenshots, videos, artifacts, and Git history;
4. report the incident privately.

## Runtime trust boundary

- Fixture mode is the default and cannot invoke DataHub mutations.
- DataHub mode defaults to loopback and requires a separate `CONTEXTSEAL_OPERATOR_TOKEN`.
- `CONTEXTSEAL_ALLOWED_TARGET_URNS` limits the live metadata proxy to exact assets.
- The DataHub credential remains backend-only and is never returned by health, run, or evidence APIs.
- ContextSeal write-back mutations require a verified live run, exact approval, a fresh passport, unchanged policy/artifacts, no replay state, and `DATAHUB_MCP_MUTATIONS_ENABLED=true`.
- Synthetic bootstrap helpers default to read-only preflight. Their separate apply commands require a hash-bound bootstrap certification approval, generic and operation-specific exact confirmations, marker-safe same-URN inspection, and the same short-lived runtime mutation gate. Remote bootstrap additionally requires one exact HTTPS GMS URL and the complete compiled URN scope.
- Mutation calls are never retried.
- Post-write verification is read-only, bounded, and reported separately.

The browser keeps the ContextSeal operator token only in JavaScript memory for the current tab. It is not local-storage/session-storage data and is cleared on reload.

## Deployment guidance

The included server is designed for local judging and a single process. Keep DataHub mode on loopback unless it is placed behind an authenticated TLS reverse proxy with least-privilege network and credential controls. Do not expose the Node port directly to an untrusted network.

The default Docker/Compose path is fixture-only. The container is unprivileged, capability-dropped, and read-only apart from its run volume.

## Data handling

ContextSeal reads metadata, not source rows. Metadata can still be sensitive. Live URNs, owners, descriptions, governance terms, and query text should be handled as private data. Never commit a live evidence export unless it is an approved synthetic proof.

## Known limitations

ContextSeal is not an identity provider, operating-system sandbox, secret manager, multi-instance distributed lock service, production warehouse executor, or formal security certification system. See [the threat model](docs/THREAT_MODEL.md).
