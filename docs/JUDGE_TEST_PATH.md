# Judge Test Path

## Fast path: under two minutes

```bash
npm install
npm run validate
npm start
```

Open <http://127.0.0.1:4173>.

1. Click **Analyze the demo change**.
2. Confirm the direct rename is `BLOCKED` with score 80.
3. Confirm the Local AI Copilot panel appears and honestly reports `NOT ENABLED` in the default fixture flow unless the local AI runtime was explicitly enabled.
4. Confirm five downstream assets and their paths are visible in the fixture analysis.
5. Confirm PII, breaking lineage, and fixture query-evidence findings.
6. Confirm four generated delivery artifacts.
7. Click **Approve safe plan**.
8. Confirm a `csp_...` passport and manifest hash appear.
9. Click **Prepare DataHub write-back**.
10. Confirm fixture mode reports that operations were prepared but no catalog was modified.

## What this proves

- End-to-end application behavior
- Visible non-authoritative AI layer with honest fallback
- Deterministic policy and fixture-backed graph traversal
- Safe alternative generation
- Approval/passport boundary
- Mutation gating and honest fixture labeling
- Executable local conformance proof for the generated artifact bundle via `npm run sandbox`

## What it does not prove

- Live DataHub connectivity
- A local-model-backed `PASS` explanation unless Ollama is installed and enabled
- Live metadata mutation
- Warehouse execution
- Production readiness

The separate live path is documented in [LIVE_DATAHUB_SETUP.md](LIVE_DATAHUB_SETUP.md).

## Pre-recorded local DataHub proof

- `examples/outputs/live-datahub-read-evidence.json` preserves a historical synthetic-local read artifact from before the reconciled final HEAD.
- `examples/outputs/live-datahub-writeback-evidence.json` preserves the matching historical approved run and bounded mutation artifact.
- Both artifacts remain explicitly synthetic-local, never production evidence, and neither should be presented as final-head live proof until they are recaptured and revalidated.
