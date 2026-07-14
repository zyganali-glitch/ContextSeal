# Demo Script — 2:45 Target

## Story

A developer requests a direct rename of `customer_email` to `contact_email`. ContextSeal discovers privacy and downstream impact, blocks the destructive request, creates a staged migration, records human approval, and prepares a DataHub passport write-back.

## Shot plan

### 00:00–00:15 — Problem

Show the title and one sentence:

> A repository can see code. DataHub can see what the code will break.

### 00:15–00:30 — Request

Show `customer_email → contact_email`. Click **Analyze the demo change**.

### 00:30–00:58 — DataHub context

Point to five downstream assets, including the Airflow job, Snowflake dataset, dashboards, and ML model. State that every node includes its lineage path.

### 00:58–01:18 — Explainable block

Show risk 80 and `BLOCKED`. Highlight `BREAKING_LINEAGE`, `SENSITIVE_DATA`, and `LIVE_QUERY_USAGE`.

### 01:18–01:42 — Real work

Show the generated dbt model, schema tests, rollback, and owner briefing. Explain that ContextSeal refused the direct rename and generated an expand–migrate–contract alternative.

### 01:42–02:02 — Human decision

Show the exact reviewer and note. Click **Approve safe plan**.

### 02:02–02:22 — Passport

Show the passport ID, manifest hash, expiry, and locked evidence states. Emphasize that unexecuted checks remain `NOT_RUN`.

### 02:22–02:38 — DataHub write-back

Cut to the already prepared local DataHub tab. Show the target asset's ContextSeal Status, Risk Score, Passport ID, Valid Until field, appended description, and saved decision document. State clearly that this is a live local DataHub instance containing synthetic metadata, not production data.

### 02:38–02:45 — Close

> ContextSeal turns DataHub context into a safe decision the next human and agent can inherit.

## Recording rule

Never crop out the fixture/live badge. Never narrate a prepared operation as completed. The video must match the committed evidence manifest.
