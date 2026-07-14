# Live-local DataHub setup

This optional path reproduces the committed proof. Judges do not need it for the two-minute fixture test.

## Boundary

- Use a disposable local DataHub Core instance.
- `npm run datahub:seed` is read-only preflight; only the separately certified `datahub:seed:apply` command can create ContextSeal-owned synthetic metadata, and it emits no source rows.
- The graph uses native Dataset, DataJob, and Dashboard entities where the public SDK supports lineage.
- The proof is not production, customer, adoption, or performance evidence.
- Keep the runtime mutation gate off until read-only behavior is verified.

## Prerequisites

- Docker Desktop with the engine running
- Node.js 20 or newer
- Python 3.11 or newer
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/) and `uvx` on `PATH`
- Enough local resources for DataHub Quickstart

ContextSeal pins the proof helpers to `acryl-datahub==1.6.0.14` and the official open-source MCP launcher package to `mcp-server-datahub@0.6.0`. The committed handshake separately reports protocol `2025-03-26` and `serverInfo` name/version `datahub`/`3.4.4`; these are protocol/runtime provenance fields, not a contradiction with the package release.

## 1. Start DataHub Core

Follow the [official DataHub Quickstart](https://docs.datahub.com/). A typical clean setup is:

```powershell
python -m pip install --upgrade pip wheel setuptools
python -m pip install --upgrade acryl-datahub
datahub docker quickstart
```

Verify:

- UI: [http://localhost:9002](http://localhost:9002)
- GMS: [http://localhost:8080](http://localhost:8080)

Do not delete an existing non-disposable catalog to create the proof.

## 2. Configure ContextSeal

```powershell
Copy-Item .env.example .env
```

Create a random **ContextSeal operator token** without printing it:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$operatorToken = -join ($bytes | ForEach-Object { $_.ToString('x2') })
Set-Clipboard $operatorToken
Write-Host "A new ContextSeal operator token was copied to the clipboard."
```

Edit `.env`:

```dotenv
CONTEXTSEAL_MODE=datahub
CONTEXTSEAL_HOST=127.0.0.1
# Paste the random ContextSeal token only into your local .env.
CONTEXTSEAL_OPERATOR_TOKEN=
CONTEXTSEAL_ALLOWED_TARGET_URNS=["urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.gold.customers,PROD)"]

DATAHUB_MCP_TRANSPORT=stdio
DATAHUB_MCP_COMMAND=uvx
DATAHUB_MCP_ARGS=["mcp-server-datahub@0.6.0"]
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=
DATAHUB_MCP_MUTATIONS_ENABLED=false
```

The operator token is a separate local API credential. Never reuse a DataHub or GitHub token.

The official self-hosted MCP documentation expects `DATAHUB_GMS_TOKEN` for authenticated deployments. Some disposable local Quickstart configurations have token authentication disabled; this proof used a blank value because the local GMS accepted it. If your GMS requires authentication, use a scoped DataHub credential in `.env`. Never commit or show it.

## 3. Certify and apply the synthetic bootstrap

Both default commands are read-only. Each inspects the exact GMS endpoint and
the complete fixed scope, refuses every existing same-URN entity without both
ContextSeal ownership markers, and emits a deterministic certification-plan
hash. The seed plan binds the endpoint, all 13 possible upsert/cleanup URNs,
and the full seed/safety script bytes. The properties plan binds the endpoint,
four exact property URNs, the YAML definition, and both helper scripts. Any
contract change produces a different hash and requires a new preflight.

Run and inspect the seed preflight while the mutation gate remains off:

```powershell
npm run datahub:seed:scope
$seedPreflight = npm run --silent datahub:seed | ConvertFrom-Json
$seedPreflight | Select-Object status, mutationState, endpointBoundary, scopeUrnCount, certificationPlanSha256
if ($seedPreflight.status -ne "PASS" -or $seedPreflight.mutationState -ne "NOT_RUN") {
  throw "Seed preflight did not pass read-only. Do not apply."
}
```

Approve only that exact plan in the current shell, open the runtime mutation
gate for one bounded command, and close/clear everything in `finally`:

```powershell
$env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION = "I_UNDERSTAND_THIS_COMMAND_MUTATES_DATAHUB"
$env:CONTEXTSEAL_SEED_CONFIRMATION = "SEED_CONTEXTSEAL_SYNTHETIC_METADATA_V1"
$env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256 = $seedPreflight.certificationPlanSha256
$env:DATAHUB_MCP_MUTATIONS_ENABLED = "true"
try {
  npm run datahub:seed:apply
  if ($LASTEXITCODE -ne 0) { throw "Seed apply failed. Do not retry blindly." }
}
finally {
  $env:DATAHUB_MCP_MUTATIONS_ENABLED = "false"
  Remove-Item Env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256 -ErrorAction SilentlyContinue
  Remove-Item Env:CONTEXTSEAL_SEED_CONFIRMATION -ErrorAction SilentlyContinue
  Remove-Item Env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION -ErrorAction SilentlyContinue
}
```

Repeat the independent preflight/approval for structured-property definitions.
An exact existing definition is skipped rather than overwritten, so a fully
idempotent apply can honestly report `mutationState: NOT_RUN`:

```powershell
npm run datahub:properties:scope
$propertyPreflight = npm run --silent datahub:properties | ConvertFrom-Json
$propertyPreflight | Select-Object status, mutationState, endpointBoundary, scopeUrnCount, certificationPlanSha256
if ($propertyPreflight.status -ne "PASS" -or $propertyPreflight.mutationState -ne "NOT_RUN") {
  throw "Property preflight did not pass read-only. Do not apply."
}
$env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION = "I_UNDERSTAND_THIS_COMMAND_MUTATES_DATAHUB"
$env:CONTEXTSEAL_PROPERTIES_CONFIRMATION = "UPSERT_CONTEXTSEAL_STRUCTURED_PROPERTIES_V1"
$env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256 = $propertyPreflight.certificationPlanSha256
$env:DATAHUB_MCP_MUTATIONS_ENABLED = "true"
try {
  npm run datahub:properties:apply
  if ($LASTEXITCODE -ne 0) { throw "Property apply failed. Do not retry blindly." }
}
finally {
  $env:DATAHUB_MCP_MUTATIONS_ENABLED = "false"
  Remove-Item Env:CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256 -ErrorAction SilentlyContinue
  Remove-Item Env:CONTEXTSEAL_PROPERTIES_CONFIRMATION -ErrorAction SilentlyContinue
  Remove-Item Env:CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION -ErrorAction SilentlyContinue
}
```

This bootstrap certification is the approval boundary for provisioning the
otherwise absent synthetic test catalog. It is separate from the later schema-
change certification passport. Missing markers are a conflict, not permission
to bootstrap over an existing entity. A connection/preflight/apply failure may
be partial; inspect DataHub and rerun read-only preflight before any decision.
After a successful apply, the seed helper reads back current ownership markers
and cleanup absence; the property helper reads back every exact definition.
That bootstrap read-back is not a lineage claim. Step 4 separately verifies the
full graph through MCP before any schema-change mutation is enabled.

Expected seed summary:

- one Snowflake target Dataset;
- two DataJobs (Airflow transform and MLflow model-scoring metadata);
- two downstream Snowflake Datasets;
- Looker and Power BI Dashboards;
- six downstream lineage entities;
- `contextseal_fixture=true` and `evidence_boundary=synthetic-local` markers.

The MLflow entity in the lineage is a `DataJob` representing scoring metadata. ContextSeal does not claim that it is an `MLModel` or that inference ran.

## 4. Read-only verification

Keep `DATAHUB_MCP_MUTATIONS_ENABLED=false`, then:

```powershell
npm start
```

1. Open [http://127.0.0.1:4173](http://127.0.0.1:4173).
2. Paste the separate ContextSeal operator token into the protected live-API field. It remains only in this browser tab's memory.
3. Select **Verify DataHub and analyze**.
4. Confirm the UI changes to **DATAHUB CONTEXT · VERIFIED** only after normalized MCP evidence passes.
5. Inspect `.contextseal/runs/<run-id>.json`.
6. For the repository's fixed synthetic seed, confirm 10 MCP reads, a complete three-field schema in one page, six downstream assets split as 2 Datasets / 2 DataJobs / 2 Dashboards, six exact paths, zero query records, and a direct-request result of `70 / BLOCKED`.
7. Confirm the context boundary is `LIVE_DATAHUB_MCP_NORMALIZED`, raw evidence has a hash, and write-back claims remain `NOT_RUN`.

The live-local catalog may contain zero query records. A successful `get_dataset_queries` call with zero results remains zero and does not create `LIVE_QUERY_USAGE`.

## 5. Approved mutation proof

Stop the read-only server. Keep `.env` at its safe default:

```dotenv
DATAHUB_MCP_MUTATIONS_ENABLED=false
```

Open the gate only in this shell for the lifetime of one server process. The
`finally` block restores and removes the override when you stop it with
`Ctrl+C`:

```powershell
$env:DATAHUB_MCP_MUTATIONS_ENABLED = "true"
try {
  npm start
}
finally {
  $env:DATAHUB_MCP_MUTATIONS_ENABLED = "false"
  Remove-Item Env:DATAHUB_MCP_MUTATIONS_ENABLED -ErrorAction SilentlyContinue
}
```

While that server is running, create a **fresh** analysis:

1. Enter the operator token again; it is never persisted by the browser.
2. Analyze the allowlisted target.
3. Inspect paths, policy findings, and generated artifacts.
4. Approve the exact safe scope.
5. Select **Execute certified write-back** once.
6. Confirm three mutation receipts:
   - `add_structured_properties`
   - `update_description` in append mode
   - `save_document`
7. Confirm durable read-back is separately `PASS`.

ContextSeal never retries mutation calls. Read-only verification may retry within a bounded deadline to tolerate DataHub indexing delay. Do not press write-back again after any partial or completed attempt.

## 6. Inspect DataHub

On the synthetic target verify:

- ContextSeal Status
- ContextSeal Risk Score
- ContextSeal Passport ID
- ContextSeal Valid Until
- appended passport reference in the description
- related decision document

The document proof checks the exact URN returned by `save_document` and literal passport ID, manifest hash, and target URN bindings. It does not claim full document-body byte retrieval.

## 7. Capture repository evidence

Stop the server and confirm the persistent setting is still safe and no shell
override remains:

```powershell
Remove-Item Env:DATAHUB_MCP_MUTATIONS_ENABLED -ErrorAction SilentlyContinue
Select-String -Path .env -Pattern '^DATAHUB_MCP_MUTATIONS_ENABLED=false$'
```

Then run:

```powershell
npm run datahub:capture
npm run datahub:export
npm run evidence:check
npm run validate
```

The scripts refuse to export when:

- the mutation gate is still enabled;
- the target lacks both synthetic ownership markers;
- raw and normalized evidence do not match;
- the latest run lacks exactly three successful bounded mutation receipts;
- durable read-back is not `PASS`;
- request, target, policy, passport, artifacts, or hashes drift.

## 8. Safety reset

- Confirm `DATAHUB_MCP_MUTATIONS_ENABLED=false`.
- Clear `$operatorToken` and the clipboard:

  ```powershell
  $operatorToken = $null
  Set-Clipboard ""
  ```

- Clear every bootstrap approval and remote exception from the shell:

  ```powershell
  $env:DATAHUB_MCP_MUTATIONS_ENABLED = "false"
  $bootstrapVariables = @(
    "CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION",
    "CONTEXTSEAL_SEED_CONFIRMATION",
    "CONTEXTSEAL_PROPERTIES_CONFIRMATION",
    "CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256",
    "CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP",
    "CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS",
    "CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
    "CONTEXTSEAL_REMOTE_DATAHUB_PROPERTY_URNS"
  )
  $bootstrapVariables | ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
  ```

- Keep `.env` ignored and untracked.
- Close live browser tabs before screen sharing.

## Exceptional remote bootstrap

The reproducible proof uses loopback and that is the recommended boundary.
Read-only preflight may inspect a remote HTTPS GMS, but `--apply` additionally
requires a single exact canonical endpoint and the complete compiled URN scope.
There are no wildcards, prefixes, extra URLs, or partial scope lists:

```powershell
# Replace this placeholder with the exact HTTPS DATAHUB_GMS_URL already in your environment.
$exactRemoteGms = "https://YOUR_GMS_HOST/api/gms"
$seedScope = npm run --silent datahub:seed:scope | ConvertFrom-Json
$propertyScope = npm run --silent datahub:properties:scope | ConvertFrom-Json
$env:CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP = "I_ACCEPT_REMOTE_DATAHUB_BOOTSTRAP_RISK"
$env:CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS = ConvertTo-Json -InputObject @($exactRemoteGms) -Compress
$env:CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS = $seedScope | ConvertTo-Json -Compress
$env:CONTEXTSEAL_REMOTE_DATAHUB_PROPERTY_URNS = $propertyScope | ConvertTo-Json -Compress
```

Then repeat each read-only preflight and approve its newly emitted plan hash as
shown in step 3. A URL mismatch, remote HTTP, an extra/missing URN, a wildcard,
or any missing confirmation fails before a DataHub client is created. Use a
least-privilege service identity. This repository has not executed or verified
remote bootstrap and does not claim remote mutation proof.

## DataHub Cloud

ContextSeal also supports streamable HTTP MCP:

```dotenv
DATAHUB_MCP_TRANSPORT=http
DATAHUB_MCP_URL=https://YOUR_TENANT.acryl.io/integrations/ai/mcp/
# Set a scoped service credential only in your local environment.
DATAHUB_GMS_TOKEN=
```

Use a service account, least-privilege/default-view scope, HTTPS, and an exact target allowlist. This repository does not include or claim a DataHub Cloud proof.

Official references:

- [DataHub MCP server](https://docs.datahub.com/docs/features/feature-guides/mcp)
- [Open-source MCP server v0.6.0](https://github.com/acryldata/mcp-server-datahub/releases/tag/v0.6.0)
- [DataHub Quickstart](https://docs.datahub.com/)
