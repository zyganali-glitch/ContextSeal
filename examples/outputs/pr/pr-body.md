## Summary

- Run ID: csr_4ab7ef5169bd2e0dcbfd64669646933a
- Passport ID: csp_60ce7207989fff37fdf8
- Target entity: gold_customers
- Change type: rename-column
- PR title: ContextSeal: staged rename for gold_customers.customer_email -> contact_email
- Branch name: contextseal/rename-column/gold-customers-csr_4ab7ef5169bd2e0dcbfd64669646933a
- Safe staged strategy: Add contact_email, backfill from customer_email, migrate consumers, then deprecate customer_email.

## Blocked original request

- Requested operation: rename_column on gold_customers.customer_email -> contact_email
- Deterministic verdict: BLOCKED
- Risk score: 80
- Finding codes: BREAKING_LINEAGE, SENSITIVE_DATA, LIVE_QUERY_USAGE

## Safe generated plan

- Migration rule ID: RENAME_COLUMN_REQUIRES_COMPATIBILITY_FIELD
- Migration strategy: EXPAND_MIGRATE_CONTRACT
- Strategy summary: Add contact_email, backfill from customer_email, migrate consumers, then deprecate customer_email.
- Compatibility boundary: The generated change preserves compatibility until downstream consumers migrate.

## Grounding from DataHub

- Approved run record: examples/outputs/demo-certification.json (fixture mode)
- Impacted asset count: 5
- High-criticality assets: 4
- Downstream owners: urn:li:corpgroup:growth-data, urn:li:corpgroup:customer-success, urn:li:corpgroup:ml-platform, urn:li:corpgroup:marketing-analytics
- Representative grounded paths:
  - build_segments: gold_customers -> build_segments
  - customer_segments: gold_customers -> build_segments -> customer_segments
  - Executive Customer Health: gold_customers -> build_segments -> customer_segments -> Executive Customer Health

## Changed files

The generated compatibility bundle proposes these exact manifest-backed files for review:

- generated/models/gold_customers_contextseal.sql
- generated/models/gold_customers_contextseal.yml
- generated/rollback/gold_customers.sql
- generated/IMPACTED_OWNERS.md

## Validation evidence

- examples/outputs/demo-certification.json
- examples/outputs/generated/ARTIFACT_MANIFEST.json
- examples/outputs/sandbox/generated-sandbox-evidence.json
- examples/outputs/generated/ai/contextseal-ai-output.md
- Sandbox status: PASS
- AI reviewer note artifact is included as optional non-authoritative context only.

## Reviewer decision boundary

- Approval covers only the safe generated compatibility change, not the blocked destructive request.
- Deterministic evidence remains authoritative over any AI-generated explanation text.
- Write-back and merge remain separate human-governed actions outside this packet.

## Manual follow-up after merge

- Migrate downstream consumers from the source field to the staged compatibility field.
- Deprecate and remove the source field in a later separately approved change after consumer migration completes.
- Rerun validation in the target repository before any deployment or write-back step.
