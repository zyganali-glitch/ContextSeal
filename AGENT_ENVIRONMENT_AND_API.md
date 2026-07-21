# ContextSeal Environment and API Memory

## Runtime and validation

- Required validation command: `npm run validate`
- Local server command: `npm start`
- Default local app URL: `http://127.0.0.1:4173`
- Default mode without `.env`: `fixture`

## DataHub boundaries

- Live mode is enabled with `CONTEXTSEAL_MODE=datahub`
- MCP read/write boundaries are controlled by `DATAHUB_MCP_TRANSPORT`, `DATAHUB_MCP_COMMAND`, `DATAHUB_MCP_ARGS`, `DATAHUB_GMS_URL`, `DATAHUB_GMS_TOKEN`, and `DATAHUB_MCP_MUTATIONS_ENABLED`
- Credentials, tokens, and source rows must never be logged, committed, or copied into docs

## Optional GitHub PR path

- Offline packet refresh command: `npm run pr:bundle`
- Token-free request validation command: `npm run pr:draft -- --dry-run`
- Live draft PR creation requires `GITHUB_TOKEN`
- `GITHUB_REPO` is optional; when absent, `scripts/create-draft-pr.js` infers `owner/name` from `origin`
- The source branch named in `examples/outputs/pr/pr-payload.json` must already exist on GitHub before a non-dry-run draft PR call
- The draft PR path must remain additive; no token value may be written to repository artifacts or logs

## Current product constraints

- The repo contains a deterministic fixture demo and separate disposable-local live proof artifacts
- Paid SaaS dependencies are out of scope for the current upgrade roadmap
- Any new local model path should prefer OSS/local execution, such as Ollama-hosted models, with graceful fallback when unavailable

## Local AI runtime contract

- Locked runtime choice: local Ollama
- Locked default model: `qwen2.5:7b`
- Probe command: `npm run ai:probe`
- Current machine probe on 2026-07-21: `Get-Command ollama` failed, so AI must be treated as unavailable by default here
- Required fallback behavior: deterministic-only analysis remains fully usable when the runtime or model is absent
- The repo now ships an optional AI adapter and visible Local AI Copilot panel; on this machine the checked-in demo truthfully shows `NOT_ENABLED` until Ollama is installed and enabled
- Current environment variables: `CONTEXTSEAL_AI_ENABLED`, `CONTEXTSEAL_AI_RUNTIME`, `CONTEXTSEAL_AI_MODEL`, `CONTEXTSEAL_AI_BASE_URL`, `CONTEXTSEAL_AI_TIMEOUT_MS`