# Live DataHub Setup

This path is intentionally separate from the fixture judge demo. It should be completed and recorded before the Devpost submission claims live DataHub evidence. Successful raw MCP reads and write-back do not turn the fixture dashboard path into live normalized impact.

## Prerequisites

- Docker Desktop with the engine running
- Python 3.10+
- Node.js 20+
- A local DataHub instance or authorized DataHub Cloud tenant
- For DataHub Cloud or token-protected tenants, a DataHub token stored outside Git. Disposable local quickstart can instead use `datahub init --host http://localhost:8080 --username datahub --password datahub --force`.
- DataHub MCP server v0.5.0+ with mutation tools available

## Local DataHub

Follow the current official Quickstart. A typical local path begins with:

```powershell
python -m pip install --upgrade pip wheel setuptools
python -m pip install --upgrade acryl-datahub
datahub docker quickstart
```

Before running ContextSeal's structured-property or write-back commands against the disposable local instance, initialize the DataHub CLI against the local GMS using the default quickstart credentials:

```powershell
datahub init --host http://localhost:8080 --username datahub --password datahub --force
```

Confirm the DataHub UI loads before continuing. Load an organizer-provided datapack when available:

```powershell
datahub datapack load showcase-ecommerce
```

On Windows, if the upstream datapack loader misreads a drive-letter path, use ContextSeal's reproducible synthetic seed instead:

```powershell
npm run datahub:seed
```

## Windows Docker capacity recovery for W-23

Use this path only when local DataHub recovery is blocked by `C:` exhaustion or when `docker info` stops returning in a non-admin shell. Preserve named Docker volumes. Do not use WSL sparse mode with `--allow-unsafe` without explicit approval.

On `2026-08-01`, this machine recovered from the original blocker state (`IS_ADMIN=False`, `C_FREE_GB=6.59`, `docker_data.vhdx ~= 15.18 GB`, and a non-returning `docker info`) by compacting the Docker VHDX, restarting Docker Desktop, initializing the local DataHub CLI, and refreshing both live evidence artifacts. While the local stack is running, `C:` free space can still fall below `8 GB`, so reclaim headroom before the next cold restore if capacity becomes tight.

1. Quit Docker Desktop and close shells that are still holding `docker` commands open.
2. Open an elevated PowerShell window.
3. Shut down WSL before touching the VHDX:

```powershell
wsl --shutdown
```

4. Record the current Docker disk allocation:

```powershell
Get-Item "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx" |
	Select-Object FullName,@{Name="SizeGB";Expression={[math]::Round($_.Length / 1GB, 2)}}
```

5. Prefer offline Hyper-V compaction when the cmdlet is available:

```powershell
Optimize-VHD -Path "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx" -Mode Full
```

6. If `Optimize-VHD` is unavailable, use elevated `diskpart` instead:

```text
diskpart
select vdisk file="C:\Users\<YOUR_USER>\AppData\Local\Docker\wsl\disk\docker_data.vhdx"
compact vdisk
exit
```

7. Restart Docker Desktop and do not continue until `docker info` returns successfully.
8. Confirm `C:` has safe restore headroom before re-pulling DataHub images. Treat anything materially below `15 GB` free as unsafe for this repo's local DataHub proof path.
9. Resume the live-proof flow in order:

```powershell
datahub docker quickstart
datahub init --host http://localhost:8080 --username datahub --password datahub --force
datahub properties upsert -f config/contextseal-structured-properties.yml
npm run datahub:seed
npm run datahub:capture
```

10. Only after the read-only capture passes, follow the mutation verification steps below and export the approved run record.

If you want to exercise the server contract manually instead of using the UI, wrap the request object before sending it:

```powershell
$request = Get-Content examples/retail-change-request.json -Raw | ConvertFrom-Json
$body = @{ request = $request } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4173/api/analyze -ContentType application/json -Body $body
```

If you want ContextSeal to handle the recovery sequence for you on Windows, use the helper below. It self-elevates when needed, performs safe VHDX compaction, restarts Docker Desktop through the official Docker Desktop CLI when available, initializes local DataHub CLI access, waits for DataHub, refreshes the read-only artifact, and can also refresh the approved write-back artifact:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/recover-w23.ps1
```

Useful variants:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/recover-w23.ps1 -PlanOnly
powershell -ExecutionPolicy Bypass -File scripts/recover-w23.ps1 -ReadOnly
```

The full helper uses `npm run datahub:prove` to drive a non-UI live proof run after the Docker/DataHub prerequisites are healthy again.

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

For the disposable local quickstart path, `DATAHUB_GMS_TOKEN` may remain unset when `datahub init --host http://localhost:8080 --username datahub --password datahub --force` succeeds with the default local `datahub/datahub` credentials. Cloud or token-protected tenants still require a token.

Load the property definitions:

```powershell
datahub init --host http://localhost:8080 --username datahub --password datahub --force
datahub properties upsert -f config/contextseal-structured-properties.yml
```

## Read-only verification

1. Start ContextSeal.
2. Analyze a target that exists in the local catalog. In datahub mode, ContextSeal captures `get_entities`, `list_schema_fields`, `get_lineage`, `get_lineage_paths_between`, and `get_dataset_queries` before generating the deterministic package.
3. Inspect the run's `liveEvidence.captureStage`; it must be `PRE_ANALYSIS` for the normal datahub-mode analyze path.
4. Inspect `.contextseal/runs/<run-id>.json`.
5. Confirm the raw MCP evidence includes the five read-only tool types and one exact lineage-path response per discovered downstream endpoint.
6. Keep all mutation evidence `NOT_RUN`.

This read-only check proves raw MCP access. It does not, by itself, upgrade the dashboard's fixture-derived path visualization to live-normalized impact or prove non-zero live query usage.

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

A disposable local DataHub run was refreshed successfully on `2026-08-01` with synthetic metadata:

- six seeded catalog assets and a typed downstream summary with six `DATASET`, two `DATA_JOB`, and two `DASHBOARD` entities across seeded platforms,
- the five bounded read-only MCP tool types, including complete schema reads and exact lineage-path reads; the saved query example currently returns zero observed dataset queries for the target,
- a `lineageSummary` block that preserves typed downstream counts and representative downstream entities in the exported read and write-back artifacts,
- a fail-closed pre-evidence mutation gate,
- four structured properties written and read back,
- a passport description appended and read back,
- a standalone decision document created,
- all successful MCP tool results checked for `isError: false`.

See `examples/outputs/live-datahub-read-evidence.json` and `examples/outputs/live-datahub-writeback-evidence.json`. This does not claim production or customer impact.

The live-local artifacts substantiate raw MCP read and bounded write-back claims only. The default judge flow, generated-artifact sandbox, and reviewer-ready PR packet remain independently reproducible fixture and local-conformance surfaces.
