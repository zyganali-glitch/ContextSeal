# ContextSeal Contributor Contract

ContextSeal is a clean-room project created during the Build with DataHub Agent Hackathon submission window.

This repository also carries an adapted Universal-Agent-OS governance spine for active hackathon upgrade work:

- Operating rules: `AGENT_OS_RULES.md`
- Global plan template: `AGENT_OS_PLAN_TEMPLATE.md`
- Active living plan: `plans/PLAN_20260721_contextseal_hackathon_win.md`
- Shared memory surfaces: `AGENT_MEMORY_AND_LESSONS.md`, `AGENT_ARCHITECTURE_AND_PATTERNS.md`, `AGENT_ENVIRONMENT_AND_API.md`, `AGENT_USER_PREFERENCES.md`

## Non-negotiable rules

1. Never claim a fixture, mock, screenshot, or planned integration is a live verified result.
2. Preserve the evidence states `PASS`, `WARN`, `FAIL`, `NOT_RUN`, `STALE`, and `FIXTURE` exactly.
3. DataHub mutations require both an approved certification run and explicit runtime mutation enablement.
4. Never log, persist, display, or commit DataHub tokens, GitHub tokens, credentials, or source data rows.
5. Deterministic validation is authoritative. Model output may explain or propose; it may not overwrite evidence.
6. Keep the three-minute judge path working after every product change.
7. Any reused third-party code must be license-compatible and attributed. Do not copy code from pre-existing personal projects.

## Required checks

Run `npm run validate` before claiming a change is complete.

## Working protocol for roadmap execution

1. The active plan ledger is the single source of truth for hackathon upgrade work.
2. README, Devpost draft, demo script, and evidence docs must stay synchronized whenever product claims or judge flow change.
3. New upgrade work must prefer free, open-source, or local tooling unless the user explicitly approves an exception.
4. Any LLM or agentic layer added to ContextSeal remains explanatory or proposal-oriented; it may not overwrite deterministic evidence or policy authority.
