# Fresh PC Restore Guide

This document explains how to set up ContextSeal from scratch on a new machine. There are three restore paths. Start with Path A. You only need Path B or C if you want to reproduce the live DataHub proof or optional AI explanation layer.

## Path A — Minimal / Normal ContextSeal Restore

This is the default judge demo path. It uses committed synthetic fixtures and does not require Ollama, Docker, DataHub, or any external service.

### Prerequisites

- Git
- Node.js 20 or newer

### Steps

```bash
git clone https://github.com/zyganali-glitch/ContextSeal.git
cd ContextSeal
npm install
npm test
npm run demo
npm start
```

Open `http://127.0.0.1:4173` in a browser.

### What this gives you

- The full deterministic certification flow against synthetic fixtures.
- Blocked change request, downstream blast radius, risk findings, generated safe dbt artifacts, human approval, SHA-256 change passport, and write-back preparation.
- All committed evidence replays (DataHub read/write-back, Ollama AI proof) are visible in the dashboard as recorded-proof panels.

### What this does NOT require

- Ollama is not required. The AI panel shows recorded proof from committed artifacts.
- Docker is not required.
- DataHub is not required. The fixture mode uses committed synthetic metadata.
- No `.env` file is needed for fixture mode (the defaults work).
- No paid APIs, external accounts, or cloud services are needed.

### Validation

```bash
npm run validate
```

This runs the full pre-submission validation pipeline: plan integrity, repository checks, AI proof verification, dbt proof, Node tests, demo generation, sandbox verification, smoke test, PR bundle, and dry-run PR draft.

---

## Path B — Full Live DataHub Restore

This path reproduces the live local DataHub read and bounded write-back evidence. Use it only when you need to re-run the live proof against a disposable local DataHub instance.

### Prerequisites

- Everything from Path A
- Docker Desktop (engine running)
- Python 3.10 or newer
- `uv` (the Python package manager): install from <https://docs.astral.sh/uv/getting-started/installation/>

### Step 1 — Start local DataHub

```powershell
python -m pip install --upgrade pip wheel setuptools
python -m pip install --upgrade acryl-datahub
datahub docker quickstart
```

Wait for the DataHub UI to load at `http://localhost:9002` before continuing.

### Step 2 — Initialize local DataHub CLI access

```powershell
datahub init --host http://localhost:8080 --username datahub --password datahub --force
```

### Step 3 — Configure ContextSeal

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set:

```dotenv
CONTEXTSEAL_MODE=datahub
DATAHUB_MCP_TRANSPORT=stdio
DATAHUB_MCP_COMMAND=uvx
DATAHUB_MCP_ARGS=["mcp-server-datahub@0.6.0"]
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=
DATAHUB_MCP_MUTATIONS_ENABLED=false
CONTEXTSEAL_OPERATOR_TOKEN=<generate-a-random-token>
CONTEXTSEAL_ALLOWED_TARGET_URNS=["urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.gold.customers,PROD)"]
```

For disposable local quickstart, `DATAHUB_GMS_TOKEN` can remain empty when the `datahub init` command above succeeds with default credentials.

### Step 4 — Install ContextSeal structured properties and seed data

```powershell
datahub properties upsert -f config/contextseal-structured-properties.yml
npm run datahub:seed
```

### Step 5 — Run read-only verification first

```powershell
npm start
```

Analyze a target and verify that the run record in `.contextseal/runs/` contains successful MCP reads across the five bounded tool types. Keep mutations `NOT_RUN` at this stage.

### Step 6 — Run bounded mutation verification (optional)

Only after read-only verification passes:

1. Set `DATAHUB_MCP_MUTATIONS_ENABLED=true` in `.env`.
2. Re-analyze with fresh context.
3. Approve the staged scope.
4. Execute write-back.
5. Verify structured properties, description, and decision document in the DataHub UI.

### MCP launcher

ContextSeal uses the official open-source MCP server launched locally with `uvx`:

```
uvx mcp-server-datahub@0.6.0
```

This uses stdio transport. For DataHub Cloud tenants, set `DATAHUB_MCP_TRANSPORT=http` and provide the tenant MCP URL instead.

### Required `.env` variables for live mode

| Variable | Required | Description |
|---|---|---|
| `CONTEXTSEAL_MODE` | Yes | Set to `datahub` |
| `DATAHUB_MCP_TRANSPORT` | Yes | `stdio` for local, `http` for Cloud |
| `DATAHUB_MCP_COMMAND` | Yes (stdio) | `uvx` |
| `DATAHUB_MCP_ARGS` | Yes (stdio) | `["mcp-server-datahub@0.6.0"]` |
| `DATAHUB_GMS_URL` | Yes | `http://localhost:8080` for local |
| `DATAHUB_GMS_TOKEN` | Cloud/token-protected only | Your DataHub access token |
| `DATAHUB_MCP_MUTATIONS_ENABLED` | Yes | `false` initially, `true` only for approved write-back |
| `CONTEXTSEAL_OPERATOR_TOKEN` | Yes | Random token for API authorization |
| `CONTEXTSEAL_ALLOWED_TARGET_URNS` | Yes | JSON array of approved target URNs |

See `.env.example` for the complete list including mutation confirmations, seed confirmations, and remote bootstrap settings.

### Disk space warning

A local DataHub instance with Docker uses significant disk space. On the original development machine, the Docker VHDX grew to 15+ GB. Ensure at least 15 GB free before starting `datahub docker quickstart`.

See `docs/LIVE_DATAHUB_SETUP.md` for the full verification path, Windows Docker capacity recovery procedure, and detailed troubleshooting.

---

## Path C — Optional Local AI Restore

The AI explanation layer is optional. Deterministic ContextSeal behavior (risk scoring, impact trace, artifact generation, passport, write-back) does not depend on Ollama or any AI model.

### Prerequisites

- Everything from Path A
- Ollama: install from <https://ollama.com>

### Steps

1. Install Ollama and pull the default model:

```bash
ollama pull qwen2.5:7b
```

2. Verify Ollama is running and the model is available:

```bash
npm run ai:probe
```

Expected endpoint: `http://127.0.0.1:11434`

3. Set AI environment variables in `.env`:

```dotenv
CONTEXTSEAL_AI_ENABLED=true
CONTEXTSEAL_AI_RUNTIME=ollama
CONTEXTSEAL_AI_MODEL=qwen2.5:7b
CONTEXTSEAL_AI_BASE_URL=http://127.0.0.1:11434
CONTEXTSEAL_AI_TIMEOUT_MS=12000
```

4. On slower or CPU-only machines, increase the timeout:

```dotenv
CONTEXTSEAL_AI_TIMEOUT_MS=600000
```

5. Generate and verify the AI proof:

```bash
npm run demo
npm run ai:proof
```

### What this gives you

- A model-backed bounded explanation artifact with four structured outputs: `ownerAlert`, `migrationRationale`, `reviewerNoteDraft`, and `nextStepGuidance`.
- A visible Local AI Copilot panel in the dashboard.
- A durable `PASS` proof recorded in `examples/outputs/proofs/ollama-ai-proof.json`.

### If AI is unavailable

If Ollama is not installed or the model is not present, ContextSeal records `NOT_ENABLED` or `UNAVAILABLE` and continues normally. The deterministic verdict, evidence, artifacts, and passport are unaffected.

See `docs/AI_RUNTIME_DECISION.md` for the full runtime decision rationale and fallback contract.
