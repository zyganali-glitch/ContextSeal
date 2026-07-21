# ContextSeal Agent Governance Rules

Purpose: adapt the useful parts of Universal-Agent-OS to ContextSeal without weakening the repository's existing evidence and safety contract.

This file is the repo-local operating donor for hackathon upgrade work. It exists to force plan discipline, honest claim boundaries, and fast execution under time and tool constraints.

## 0) Document Identity and Usage

- Document type: `Repo-local governance spine`
- Primary purpose: keep hackathon upgrades aligned to one living plan, one evidence model, and one submission story
- Active plan template: `AGENT_OS_PLAN_TEMPLATE.md`
- Active plan: `plans/PLAN_20260721_contextseal_hackathon_win.md`
- Required context memory before material work:
  1. `AGENT_MEMORY_AND_LESSONS.md`
  2. `AGENT_ARCHITECTURE_AND_PATTERNS.md`
  3. `AGENT_ENVIRONMENT_AND_API.md`
  4. `AGENT_USER_PREFERENCES.md`

## 0.1) Integrity Lock

The active plan must enforce these locks verbatim or by clear repo-local equivalent:

- `IL-01` Single source of truth: the Task Tracking Ledger in the active plan is the official progress surface.
- `IL-02` Atomic updates: status changes must update the header, phase rows, backlog rows, ledger rows, and gates together.
- `IL-03` Cascading closure: a parent item cannot be `DONE` while a required child item remains open.
- `IL-04` Date integrity: do not record future completion dates.
- `IL-05` Gate closure lock: no completion while a mandatory gate is `NOT_RUN` or `FAIL` without an explicit exception record.
- `IL-06` Discovered-work control: newly discovered problems are logged first, then scheduled; they are not hidden inside unrelated edits.
- `IL-07` Live tracking: a task moves to `IN_PROGRESS` before touching the target surface and records evidence immediately after validation.
- `IL-08` Claim parity: README, Devpost, demo, and evidence docs may not contradict one another.
- `IL-09` Validation-first transitions: no phase advances on narrative claims alone; the cheapest relevant validation must run first.
- `IL-10` Rollback protocol: reopened or downgraded steps must be logged, not silently rewritten.
- `IL-11` Free-tool discipline: new roadmap work assumes zero paid third-party services beyond the user's already-available coding environment.
- `IL-12` Evidence boundary supremacy: LLM output may explain, summarize, or propose, but never upgrades a `FIXTURE`, `NOT_RUN`, or `FAIL` claim into `PASS`.
- `GFL-01` Live-doc sync: README, demo script, judging docs, and pitch surfaces are updated in the same request when product truth changes.

## 1) ContextSeal Operating Doctrine

1. Passport-first differentiation beats generic impact-analysis positioning.
2. Deterministic evidence remains the product authority.
3. Agentic value must show up as concrete operator help, not vague branding.
4. The winning judge path must contain a visible AI stage; hidden or purely optional AI plumbing is not enough.
5. The AI layer must consume grounded structured inputs from ContextSeal and emit bounded outputs that help a human act.
6. No new paid product dependencies are assumed in the winning roadmap.
7. Submission surfaces must lead with strengths, then state limits honestly.
8. If field-level lineage is not truly implemented, the product must not claim it.
9. A live DataHub read/write proof is valuable only when the demo and docs represent it truthfully.

## 2) New Work Production Protocol

For material hackathon upgrades, work proceeds in this order:

1. Confirm the active plan and current phase.
2. Update the ledger entry to `IN_PROGRESS`.
3. Make the smallest viable change for the active micro-phase.
4. Run the cheapest meaningful validation.
5. Record evidence and gate impact in the active plan.
6. Update any affected submission surfaces in the same request.
7. Close or reopen the item honestly.

## 3) Required Gate Families

Every meaningful roadmap step should map to one or more of these gates:

- Repository Validation Gate
- Evidence Boundary Gate
- Agentic Boundary Gate
- Demo Compression Gate
- No-Paid-Dependency Gate
- Submission Surface Parity Gate
- Maintainer Traction Gate
- Integrity Lock Gate

## 4) Review Stack

Every major change should satisfy these review perspectives:

1. Hackathon judge with a two-minute attention budget
2. Data platform engineer evaluating technical honesty
3. DataHub maintainer evaluating ecosystem usefulness
4. Compliance and audit reviewer evaluating passport value
5. OSS reviewer evaluating originality and claim discipline
6. AI safety reviewer evaluating evidence versus model authority
7. Demo viewer evaluating visual drama and clarity
8. Future buyer evaluating whether the wedge is passport/compliance rather than commodity lineage

## 5) Closure Requirements

A roadmap item is only complete when all of the following are true:

1. The active plan status is synchronized.
2. Relevant validations ran and were recorded.
3. Affected docs or pitch surfaces were refreshed.
4. The change does not weaken the judge path.
5. No new paid dependency was introduced without explicit user approval.