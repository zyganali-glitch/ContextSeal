# Live DataHub Setup

This path is intentionally separate from the fixture judge demo. It should be completed and recorded before the Devpost submission claims live DataHub evidence.

## Prerequisites

- Docker Desktop with the engine running
- Python 3.11+
- Node.js 20+
- `uv` or `uvx` available on `PATH`
- A local DataHub instance or authorized DataHub Cloud tenant
- A DataHub token stored outside Git
- DataHub MCP server `mcp-server-datahub@0.6.0` with mutation tools available

## Local DataHub

Follow the current official Quickstart. A typical local path begins with:

```powershell
python -m pip install --upgrade pip wheel setuptools
python -m pip install --upgrade "acryl-datahub==1.6.0.14" uv
datahub docker quickstart
```

Confirm the DataHub UI loads before continuing. Load an organizer-provided datapack when available:

```powershell
datahub datapack load showcase-ecommerce
```

On Windows, or whenever you want the exact ContextSeal-owned synthetic scope, use the fail-closed seed helper instead of hand-editing catalog metadata:

```powershell
npm run datahub:seed
```

This default command is read-only preflight. It prints the exact mutation scope and a `certificationPlanSha256`. Apply the seed only after exporting the exact confirmations in the current shell:

```powershell
$env:DATAHUB_MCP_MUTATIONS_ENABLED="true"
$env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION="I_UNDERSTAND_THIS_COMMAND_MUTATES_DATAHUB"
$env:CONTEXTSEAL_SEED_CONFIRMATION="SEED_CONTEXTSEAL_SYNTHETIC_METADATA_V1"
$env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256="<paste the preflight plan hash>"
npm run datahub:seed:apply
```

## MCP server

Install `uv`. ContextSeal starts the official open-source MCP server as a child process using the exact pinned package invocation below. Mutation tools remain disabled for the first connectivity test.

Local transport:

```text
uvx mcp-server-datahub@0.6.0
```

`http://localhost:8080` is the GMS URL, not a local MCP HTTP endpoint. Streamable HTTP is supported for DataHub Cloud tenants through their `/integrations/ai/mcp/` URL.

## ContextSeal configuration

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```dotenv
CONTEXTSEAL_MODE=datahub
CONTEXTSEAL_HOST=127.0.0.1
DATAHUB_MCP_TRANSPORT=stdio
DATAHUB_MCP_COMMAND=uvx
DATAHUB_MCP_ARGS=["mcp-server-datahub@0.6.0"]
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=LOCAL_TOKEN_ONLY
DATAHUB_MCP_MUTATIONS_ENABLED=false
CONTEXTSEAL_OPERATOR_TOKEN=
CONTEXTSEAL_ALLOWED_TARGET_URNS=["urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.gold.customers,PROD)"]
```

Before starting the live server, set `CONTEXTSEAL_OPERATOR_TOKEN` in `.env` to a long random local bearer value. The server will not start in live mode until that setting is non-empty and `CONTEXTSEAL_ALLOWED_TARGET_URNS` is a non-empty JSON array. Every live API request must send `Authorization: Bearer <CONTEXTSEAL_OPERATOR_TOKEN>`.

Preflight the property-definition bootstrap:

```powershell
npm run datahub:properties
```

Apply those definitions only after the preflight hash and exact confirmations are exported in the same shell:

```powershell
$env:DATAHUB_MCP_MUTATIONS_ENABLED="true"
$env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION="I_UNDERSTAND_THIS_COMMAND_MUTATES_DATAHUB"
$env:CONTEXTSEAL_PROPERTIES_CONFIRMATION="UPSERT_CONTEXTSEAL_STRUCTURED_PROPERTIES_V1"
$env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256="<paste the preflight plan hash>"
npm run datahub:properties:apply
```

## Read-only verification

1. Start ContextSeal with `npm start`.
2. Submit an allowed target through the API with the operator bearer token.

```powershell
$headers = @{ Authorization = "Bearer $env:CONTEXTSEAL_OPERATOR_TOKEN"; "Content-Type" = "application/json" }
$request = Get-Content examples/retail-change-request.json -Raw | ConvertFrom-Json
$body = @{ request = $request } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4173/api/analyze -Headers $headers -Body $body
```

The wrapper is required in live mode: `/api/analyze` accepts the change contract under the top-level `request` property and fails closed on an unwrapped body.

3. Inspect the created run or invoke the live-evidence refresh endpoint for an undecided run.
4. Inspect `.contextseal/runs/<run-id>.json`.
5. Confirm the raw MCP evidence includes `get_entities`, one or more unfiltered `list_schema_fields` pages, `get_lineage`, one `get_lineage_paths_between` call per discovered downstream target, and `get_dataset_queries`.
6. Confirm `run.context.evidenceBoundary` is `LIVE_DATAHUB_MCP_NORMALIZED` and that `run.liveEvidence.rawEvidenceHash` binds the captured call array.
7. Keep all mutation evidence `NOT_RUN`.

This read-only check proves hash-bound MCP access plus deterministic live normalization. It still does not upgrade the dashboard's public path visualization beyond its explicit fixture/live labels.

## Mutation verification

Only after read-only verification:

1. Use a disposable local catalog asset.
2. Enable official MCP mutation tools.
3. Set `DATAHUB_MCP_MUTATIONS_ENABLED=true`.
4. Re-analyze with fresh context.
5. Approve the exact staged scope.
6. Execute write-back.
7. Verify structured properties and appended description in DataHub UI or through the read-back envelope.
8. Verify the saved passport document.
9. Export the local run record without credentials with `node scripts/export-live-run.js`.
10. Run `npm run evidence:check` to validate the read/write/readback bundle.
11. Set evidence to PASS only for the operations and read-back checks with named artifacts.

## Checked-in live proof status

The committed `examples/outputs/live-datahub-read-evidence.json` and `examples/outputs/live-datahub-writeback-evidence.json` files are preserved as historical synthetic-local artifacts from before the reconciled final HEAD.

They remain useful for reviewing the disposable-local proof shape, but they are not current final-head `PASS` artifacts. A new final-head live claim requires rerunning seed/property preflight and apply, capturing fresh read evidence, completing bounded write-back plus durable read-back, exporting the run, and passing `npm run evidence:check`.

This path does not claim production or customer impact.
