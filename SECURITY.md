# Security Policy

## Supported version

ContextSeal is a hackathon prototype. The latest commit on `main` is the only supported version.

## Trust boundary

- ContextSeal reads metadata, not source data rows.
- DataHub credentials belong only in `.env` or the process environment.
- Fixture mode is the default and cannot mutate a catalog.
- Live mutations require an approved run, `CONTEXTSEAL_MODE=datahub`, and `DATAHUB_MCP_MUTATIONS_ENABLED=true`.
- Deterministic evidence states cannot be replaced by model-generated text.
- Generated SQL is an artifact for review and sandbox execution; it is never executed against production by this application.

## Reporting

Do not open a public issue containing a credential, private URN, internal query, or customer name. Use GitHub's private vulnerability reporting feature when enabled, or contact the repository owner privately.
