# ContextSeal Environment and API Memory

## Runtime and validation

- Required read-only validation command: `npm run validate`
- Explicit artifact generation commands: `npm run demo:generate`, `npm run sandbox:generate`, `npm run pr:bundle`
- Local server command: `npm start`
- Default local app URL: `http://127.0.0.1:4173`
- Default mode without `.env`: `fixture`

## DataHub boundaries

- Live mode is enabled with `CONTEXTSEAL_MODE=datahub`
- Live API startup also requires `CONTEXTSEAL_HOST`, `CONTEXTSEAL_OPERATOR_TOKEN`, and a non-empty JSON `CONTEXTSEAL_ALLOWED_TARGET_URNS` allowlist
- Every live `POST` request must send `Authorization: Bearer <CONTEXTSEAL_OPERATOR_TOKEN>` and target an allowed URN
- MCP read/write boundaries are controlled by `DATAHUB_MCP_TRANSPORT`, `DATAHUB_MCP_COMMAND`, `DATAHUB_MCP_ARGS`, `DATAHUB_GMS_URL`, `DATAHUB_GMS_TOKEN`, and `DATAHUB_MCP_MUTATIONS_ENABLED`
- The tested stdio launcher pin is `uvx mcp-server-datahub@0.6.0`; do not use `@latest` in setup instructions
- Seed/property helpers stay on the pinned free path `uv run --with acryl-datahub==1.6.0.14`
- Remote bootstrap is opt-in only and uses `CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP`, `CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS`, `CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS`, and `CONTEXTSEAL_REMOTE_DATAHUB_PROPERTY_URNS`
- Credentials, tokens, and source rows must never be logged, committed, or copied into docs

## Optional GitHub PR path

- Offline packet refresh command: `npm run pr:bundle`
- Offline packet verification command: `npm run pr:bundle:check`
- Token-free request validation command: `npm run pr:draft -- --dry-run`
- Live draft PR creation requires `GITHUB_TOKEN`
- `GITHUB_REPOSITORY` is optional; when absent, `scripts/create-draft-pr.js` infers `owner/name` from `origin`
- `GITHUB_REPO` remains a legacy alias accepted by `scripts/create-draft-pr.js`
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
- Durable recorded-proof capture command: `npm run ai:capture`
- Current machine proof: the official Ollama 0.32.5 installation completed after approved cache cleanup, and `qwen2.5:7b` is installed locally. `npm run ai:probe`, `npm run demo`, and `npm run ai:proof` passed on 2026-08-01.
- GPU-backed inference is incompatible with the installed CUDA toolchain, so Ollama runs with the user-level `OLLAMA_LLM_LIBRARY=cpu` setting. The direct model check returned `CONTEXTSEAL_LOCAL_MODEL_OK`; the `.env` timeout is `600000` milliseconds for CPU inference.

## Current local DataHub capacity

- Fresh disposable-local DataHub proof completed on `2026-08-01` after elevated non-destructive VHDX compaction recovered enough host capacity to restore the quickstart stack.
- `scripts/recover-w23.ps1` is now the verified Windows recovery path: it can skip compaction when appropriate, prefers `docker desktop start --detach`, retries `docker info` safely, initializes local DataHub CLI access with `datahub init --host http://localhost:8080 --username datahub --password datahub --force`, and then runs the seed/capture/prove chain.
- The latest successful local sequence was: `datahub properties upsert -f config/contextseal-structured-properties.yml`, `npm run datahub:seed`, `npm run datahub:capture`, and `npm run datahub:prove`.
- `.env` still had `DATAHUB_GMS_TOKEN` unset during the successful disposable-local proof. This local path worked because the quickstart accepted default `datahub/datahub` CLI initialization and the MCP path allowed local access without a token.
- With the local DataHub quickstart stack still running, `C:` free space can fall to about `7.79 GB` and `docker_data.vhdx` to about `15.67 GB`. Reclaim headroom before the next cold restore or image repull.
- A non-destructive VHDX compact operation still requires an elevated terminal. Prefer offline `Optimize-VHD` or elevated `diskpart` against `docker_data.vhdx`. Do not use WSL sparse mode with `--allow-unsafe` without explicit user approval because WSL warns about possible data corruption.
- Required fallback behavior: deterministic-only analysis remains fully usable when the runtime or model is absent
- The repo ships an optional AI adapter and visible Local AI Copilot panel; this machine currently produces a local-model-backed `PASS` artifact
- Current environment variables: `CONTEXTSEAL_AI_ENABLED`, `CONTEXTSEAL_AI_RUNTIME`, `CONTEXTSEAL_AI_MODEL`, `CONTEXTSEAL_AI_BASE_URL`, `CONTEXTSEAL_AI_TIMEOUT_MS`