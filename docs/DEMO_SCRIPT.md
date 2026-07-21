# Demo Script — 1:40 Target

## Story

A developer requests a direct rename of `customer_email` to `contact_email`. ContextSeal discovers privacy and downstream impact, blocks the destructive request, shows an honest optional AI explanation layer, creates a staged migration, records human approval, and prepares a DataHub passport write-back.

## Shot plan

### 00:00–00:08 — Problem

- On screen: Title plus the first hero line.
- Spoken beat: `A repository can see code. DataHub can see what the code will break.`
- Subtitle: `A repository can see code. DataHub can see what the code will break.`

### 00:08–00:20 — Blocked request

- On screen: Show `customer_email -> contact_email`, the blocked-risk hero, and click **Analyze the demo change**.
- Spoken beat: `This rename looks small, but ContextSeal blocks it before it reaches GitHub.`
- Subtitle: `ContextSeal blocks the risky rename before it reaches GitHub.`

### 00:20–00:34 — Blast radius

- On screen: Hold on the context trace and downstream counts.
- Spoken beat: `DataHub shows five downstream assets, and ContextSeal preserves the exact path that explains the blast radius.`
- Subtitle: `DataHub shows five downstream assets and the exact path that explains the blast radius.`

### 00:34–00:46 — Deterministic block

- On screen: Zoom the risk score and policy findings.
- Spoken beat: `The verdict is deterministic: risk eighty, blocked, with breaking lineage, sensitive data, and live query usage.`
- Subtitle: `Deterministic verdict: risk 80, BLOCKED, with breaking lineage, sensitive data, and live query usage.`

### 00:46–00:56 — AI boundary

- On screen: Show the Local AI Copilot panel.
- Spoken beat: `The AI layer comes after the verdict and stays explanation-only. If the local runtime is unavailable, ContextSeal says so instead of inventing confidence.`
- Subtitle: `AI is explanation-only and stays honest about runtime availability.`

### 00:56–01:10 — Safe package

- On screen: Show generated delivery, review files, and the PR-ready handoff area.
- Spoken beat: `Instead of a destructive rename, ContextSeal generates an expand-migrate-contract package: dbt model, tests, rollback, owner brief, and review bundle.`
- Subtitle: `ContextSeal replaces the destructive rename with a staged migration package and review bundle.`

### 01:10–01:22 — Human approval

- On screen: Show reviewer, note, and click **Approve safe plan**.
- Spoken beat: `A human approves only the safe scope, never the original destructive request.`
- Subtitle: `Human approval covers only the safe generated scope.`

### 01:22–01:36 — Passport and inheritance

- On screen: Hold on the passport ID, manifest hash, expiry, evidence states, and inheritance strip.
- Spoken beat: `Now the change is certified. The passport binds the request, evidence, artifacts, and approval, while unexecuted checks stay clearly marked not run.`
- Subtitle: `The passport binds request, evidence, artifacts, and approval. Unexecuted checks stay NOT_RUN.`

### 01:36–01:40 — Live-local close

- On screen: Cut to the prepared local DataHub tab or the documented live-local evidence surface.
- Spoken beat: `That certified decision can be written back to a disposable local DataHub so the next human and agent inherit it.`
- Subtitle: `The certified decision is written back only to disposable local DataHub synthetic metadata.`

> ContextSeal turns DataHub context into a safe decision the next human and agent can inherit.

## Recording rule

Never crop out the fixture/live badge. Never narrate a prepared operation as completed. The video must match the committed evidence manifest.
