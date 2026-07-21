# ContextSeal Global Plan Template

This file is an adapted, repo-local version of the Universal-Agent-OS global plan template.
It is intentionally narrower than the donor template and optimized for ContextSeal's hackathon, demo, and submission workflow.

---

## 0) Document Identity

- Plan filename: `{{PLAN_FILENAME}}`
- Active plan directory: `plans/{{PLAN_FILENAME}}`
- Archive directory: `plans/completed/{{PLAN_FILENAME}}`
- Plan ID: `{{PLAN_ID}}`
- Project Target Platform: `{{DATA | API | WEB_DEMO | SUBMISSION_ASSETS}}`
- Last updated: `{{YYYY-MM-DD HH:mm TZ}}`
- Plan owner: `{{OWNER_AGENT_OR_TEAM}}`
- Active status: `{{PLANNING|IN_PROGRESS|HARDENING|CLOSURE|DONE|BLOCKED}}`
- Required context load:
  1. `AGENT_MEMORY_AND_LESSONS.md`
  2. `AGENT_ARCHITECTURE_AND_PATTERNS.md`
  3. `AGENT_ENVIRONMENT_AND_API.md`
  4. `AGENT_USER_PREFERENCES.md`

### 0.1) Integrity Lock

The active plan must preserve:

- `IL-01` single-source ledger discipline
- `IL-02` atomic plan updates
- `IL-03` cascading closure
- `IL-04` date fidelity
- `IL-05` mandatory validation gates
- `IL-06` discovered-work tracking
- `IL-07` live task-state tracking
- `IL-08` cross-surface claim parity
- `IL-09` validation-first transitions
- `IL-10` rollback logging
- `IL-11` free-tool discipline
- `IL-12` deterministic evidence supremacy
- `GFL-01` live-doc sync

---

## 1) Universal Consensus Variables

- Tone & Persona: `{{evidence-first / mentor / concise}}`
- Ultimate target: `{{judge-ready repo / live local demo / Devpost / video}}`
- Architectural strategy: `{{deterministic core + optional explanatory LLM + DataHub MCP}}`
- QA rigor: `{{high}}`
- Track strategy: `{{primary + fallback}}`
- Tool policy: `{{free/open-source/local-first}}`
- Commercial wedge: `{{passport / compliance / proof trail}}`

---

## 2) Scope Lock, Allowlist, Denylist

### 2.1 Scope lock
- Included: `{{surfaces included in this plan}}`
- Excluded: `{{boundaries not to cross}}`

### 2.2 Allowlist
- `{{file or surface}}`

### 2.3 Denylist
- `{{forbidden claim, dependency, or scope}}`

---

## 3) Objective Stack and Cut Lines

| Objective ID | Objective | Success signal | Priority wave | Status |
|---|---|---|---|---|
| `{{O-01}}` | `{{objective}}` | `{{evidence}}` | `{{MUST|SHOULD|STRETCH}}` | `{{PENDING|IN_PROGRESS|DONE|BLOCKED}}` |

### 3.1 Cut lines
- Must ship: `{{minimum winning set}}`
- Should ship: `{{high leverage but deferrable}}`
- Stretch: `{{nice-to-have if core is secure}}`

---

## 4) Phase Plan

| Phase | Goal | Status | Dependencies | Exit evidence |
|---|---|---|---|---|
| `{{P0}}` | `{{goal}}` | `{{PENDING|IN_PROGRESS|DONE|BLOCKED}}` | `{{deps}}` | `{{what proves exit}}` |

---

## 5) Micro-Phase Operations Backlog

| Task ID | Objective (Surgical) | Status | Agent | Date | Evidence/Note |
|---|---|---|---|---|---|
| `{{W-01}}` | `{{target}}` | `{{PENDING|IN_PROGRESS|DONE|BLOCKED}}` | `{{agent}}` | `{{date}}` | `{{note}}` |

---

## 6) Task Tracking Ledger

| Step | Description | Status | Parent ID | Agent | Started | Completed | Evidence/Notes |
|---|---|---|---|---|---|---|---|
| `{{1.1}}` | `{{detail}}` | `{{PENDING|IN_PROGRESS|DONE|BLOCKED}}` | `{{parent}}` | `{{agent}}` | `{{date}}` | `{{date}}` | `{{evidence}}` |

---

## 7) Validation Gates Matrix

| Gate Designation | Scope | Assessment Vector | Expected | Result | Log / Artifact |
|---|---|---|---|---|---|
| `{{Repository Validation Gate}}` | `{{scope}}` | `{{command or review}}` | `PASS` | `{{PASS|FAIL|NOT_RUN|WARN}}` | `{{artifact}}` |

---

## 8) Risks, Decisions, Handoff

### 8.1 Risk registry
| Risk ID | Risk | Probability | Impact | Mitigation | Status |
|---|---|---|---|---|---|
| `{{R-01}}` | `{{risk}}` | `{{L|M|H}}` | `{{L|M|H}}` | `{{mitigation}}` | `{{OPEN|WATCH|CLOSED}}` |

### 8.2 Decision log
| Decision ID | Decision | Reason | Date | Owner |
|---|---|---|---|---|
| `{{D-01}}` | `{{decision}}` | `{{reason}}` | `{{date}}` | `{{owner}}` |

### 8.3 Handoff checkpoint

```markdown
## CHECKPOINT - HANDOFF
- Last Concluded Micro-Step: {{phase.step}}
- Status: {{DONE|IN_PROGRESS|BLOCKED}}
- Next Micro-Step: {{phase.step}}
- Critical Gate Status: {{PASS|FAIL|NOT_RUN|WARN}}
```