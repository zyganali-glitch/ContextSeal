# Live DataHub Setup

This path is intentionally separate from the fixture judge demo. It should be completed and recorded before the Devpost submission claims live DataHub evidence.

## Prerequisites

- Docker Desktop with the engine running
- Python 3.10+
- Node.js 20+
- A local DataHub instance or authorized DataHub Cloud tenant
- A DataHub token stored outside Git
- DataHub MCP server v0.5.0+ with mutation tools available

## Local DataHub

Follow the current official Quickstart. A typical local path begins with:

```powershell
python -m pip install --upgrade pip wheel setuptools
python -m pip install --upgrade acryl-datahub
datahub docker quickstart
```

Confirm the DataHub UI loads before continuing. Load an organizer-provided datapack when available:

```powershell
datahub datapack load showcase-ecommerce
```

On Windows, if the upstream datapack loader misreads a drive-letter path, use ContextSeal's reproducible synthetic seed instead:

```powershell
npm run datahub:seed
```

## MCP server

Install `uv`. ContextSeal starts the official open-source MCP server as a child process using the exact package invocation below. Mutation tools remain disabled for the first connectivity test.

Local transport:

```text
uvx mcp-server-datahub@latest
```

`http://localhost:8080` is the GMS URL, not a local MCP HTTP endpoint. Streamable HTTP is supported for DataHub Cloud tenants through their `/integrations/ai/mcp/` URL.

## ContextSeal configuration

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```dotenv
CONTEXTSEAL_MODE=datahub
DATAHUB_MCP_TRANSPORT=stdio
DATAHUB_MCP_COMMAND=uvx
DATAHUB_MCP_ARGS=["mcp-server-datahub@latest"]
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=LOCAL_TOKEN_ONLY
DATAHUB_MCP_MUTATIONS_ENABLED=false
```

Load the property definitions:

```powershell
datahub properties upsert -f config/contextseal-structured-properties.yml
```

## Read-only verification

1. Start ContextSeal.
2. Analyze a target that exists in the local catalog.
3. Invoke the run's live-evidence endpoint or documented UI path.
4. Inspect `.contextseal/runs/<run-id>.json`.
5. Confirm three raw MCP evidence entries exist.
6. Keep all mutation evidence `NOT_RUN`.

This read-only check proves raw MCP access. It does not, by itself, upgrade the dashboard's path visualization to live-normalized impact.

## Mutation verification

Only after read-only verification:

1. Use a disposable local catalog asset.
2. Enable official MCP mutation tools.
3. Set `DATAHUB_MCP_MUTATIONS_ENABLED=true`.
4. Re-analyze with fresh context.
5. Approve the exact staged scope.
6. Execute write-back.
7. Verify structured properties and appended description in DataHub UI.
8. Verify the saved passport document.
9. Export the local run record without credentials.
10. Set evidence to PASS only for the operations with successful tool responses.

## Verified local status

A disposable local DataHub run has completed successfully with synthetic metadata:

- six seeded catalog assets and five downstream dataset-shaped lineage results across seeded platforms,
- three read-only MCP calls, including a saved query read whose exported example currently returns zero observed dataset queries for the target,
- a fail-closed pre-evidence mutation gate,
- four structured properties written and read back,
- a passport description appended and read back,
- a standalone decision document created,
- all successful MCP tool results checked for `isError: false`.

See `examples/outputs/live-datahub-read-evidence.json` and `examples/outputs/live-datahub-writeback-evidence.json`. This does not claim production or customer impact.
