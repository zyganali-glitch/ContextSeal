# Judge in two minutes

The primary judge path is free, local, deterministic, and does not require DataHub or a credential.

## Run

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/zyganali-glitch/ContextSeal.git
cd ContextSeal
npm install
npm run validate
npm start
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Click path

1. Select **Run local certification**.
2. Confirm the **direct requested rename** is `BLOCKED` with risk `80`.
3. Inspect five downstream fixture assets and their full paths; the deepest path is four hops.
4. Confirm the fixture's two synthetic query signals, privacy signal, and breaking-lineage finding.
5. Preview the four generated files: dbt model, schema tests, rollback, and impacted-owner brief.
6. Select **Approve safe plan**. This approves only the non-destructive expand–migrate–contract manifest.
7. Confirm a `csp_...` passport, manifest hash, context hash, and validity time appear.
8. Select **Prepare protected operations**.
9. Confirm three bounded DataHub operations are displayed as `NOT_RUN` and the UI says no catalog was modified.

Stop the server with `Ctrl+C`.

## What this proves

- The real ContextSeal API and state machine execute end to end.
- Typed contracts, graph traversal, deterministic policy, and artifact generation work.
- The destructive request and safe generated alternative remain distinct.
- Human approval is bound to an exact passport manifest.
- Fixture mode cannot upgrade prepared payloads into a live mutation claim.

## What this does not prove

- Live DataHub connectivity
- Production/customer metadata or query usage
- Warehouse SQL execution
- Automatic merge or deployment
- Production readiness or security certification

## No-install review

[Open the GitHub Pages walkthrough](https://zyganali-glitch.github.io/ContextSeal/). It replays the committed generated fixture snapshot; it has no backend and makes no live claim.

## Optional live-local proof

The repository also contains internally validated evidence from a disposable local DataHub seeded only with ContextSeal synthetic metadata. The current record contains 10 MCP reads, a complete three-field schema in one page, six downstream assets (2 Datasets / 2 DataJobs / 2 Dashboards), six exact paths, zero query records, a `70 / BLOCKED` direct request, three `PASS` mutation receipts, and a separate durable read-back `PASS`. Judges do not need to run it. See:

- [Live DataHub setup and reproduction](LIVE_DATAHUB_SETUP.md)
- [Evidence manifest](EVIDENCE_MANIFEST.md)
- `examples/outputs/live-datahub-read-evidence.json`
- `examples/outputs/live-datahub-writeback-evidence.json`
