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
3. Confirm five downstream assets and their paths are visible.
4. Confirm PII, breaking lineage, and observed-query findings.
5. Confirm four generated delivery artifacts.
6. Click **Approve safe plan**.
7. Confirm a `csp_...` passport and manifest hash appear.
8. Click **Prepare DataHub write-back**.
9. Confirm fixture mode reports that operations were prepared but no catalog was modified.

## What this proves

- End-to-end application behavior
- Deterministic policy and graph traversal
- Safe alternative generation
- Approval/passport boundary
- Mutation gating and honest fixture labeling

## What it does not prove

- Live DataHub connectivity
- Live metadata mutation
- Warehouse execution
- Production readiness

The separate live path is documented in [LIVE_DATAHUB_SETUP.md](LIVE_DATAHUB_SETUP.md).

## Pre-recorded local DataHub proof

- `examples/outputs/live-datahub-read-evidence.json` preserves post-write MCP reads.
- `examples/outputs/live-datahub-writeback-evidence.json` preserves the approved run and three successful bounded mutations.
- Both artifacts are explicitly synthetic-local, never production evidence.
