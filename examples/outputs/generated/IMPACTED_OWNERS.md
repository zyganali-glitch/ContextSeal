# Impacted owner briefing

ContextSeal run: `csr_e46cd53f1c61e8701ee8d32cda2e5126`
Policy: `2026-07-14` / `eadf377cceb74742db8523466ec4fd700574e55e4786bbc993c7985053d31a82`
Dialect contract: `snowflake` / `snowflake`
Deprecation window: Retain the source field until every known downstream consumer migrates and a later scoped approval authorizes removal.

Risk verdict: **BLOCKED** (80/100)
Migration strategy: **EXPAND_MIGRATE_CONTRACT**

- build_segments (DATA_JOB) — owners: urn:li:corpgroup:growth-data
- customer_segments (DATASET) — owners: urn:li:corpgroup:growth-data
- Executive Customer Health (DASHBOARD) — owners: urn:li:corpgroup:customer-success
- churn_prediction (ML_MODEL) — owners: urn:li:corpgroup:ml-platform
- Retention Campaign (DASHBOARD) — owners: urn:li:corpgroup:marketing-analytics