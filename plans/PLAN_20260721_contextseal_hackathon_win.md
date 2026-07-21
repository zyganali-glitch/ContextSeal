# ContextSeal Hackathon Win Plan

---

## 0) Document Identity

- Plan filename: `PLAN_20260721_contextseal_hackathon_win.md`
- Active plan directory: `plans/PLAN_20260721_contextseal_hackathon_win.md`
- Archive directory: `plans/completed/PLAN_20260721_contextseal_hackathon_win.md`
- Plan ID: `CS-HACK-20260721-01`
- Project Target Platform: `DATA + API + WEB_DEMO + SUBMISSION_ASSETS`
- Last updated: `2026-07-21 UTC`
- Plan owner: `main-agent`
- Active status: `IN_PROGRESS`
- Required context load:
  1. `AGENT_MEMORY_AND_LESSONS.md`
  2. `AGENT_ARCHITECTURE_AND_PATTERNS.md`
  3. `AGENT_ENVIRONMENT_AND_API.md`
  4. `AGENT_USER_PREFERENCES.md`

### 0.1) Integrity Lock

- `IL-01` The ledger in Section 6 is the official progress surface.
- `IL-02` Status changes update header, phase rows, backlog, ledger, and gates together.
- `IL-03` Parent roadmap items do not close while required child work remains open.
- `IL-04` Completion dates may not exceed the current date.
- `IL-05` No roadmap claim closes while a mandatory gate is `NOT_RUN` or `FAIL` without an explicit exception note.
- `IL-06` Newly discovered blockers are logged as tracked work, not hidden in prose.
- `IL-07` Active tasks move to `IN_PROGRESS` before material edits.
- `IL-08` README, Devpost, demo script, UI copy, and evidence docs must not contradict one another.
- `IL-09` Phase transitions require validation evidence, not narrative optimism.
- `IL-10` Reopened tasks must be logged as reopenings.
- `IL-11` The roadmap assumes zero paid new tools or services.
- `IL-12` LLM output is explanatory only and cannot upgrade evidence truth.
- `GFL-01` Living docs update in the same request when product truth changes.

---

## 1) Universal Consensus Variables

- Tone & Persona: `evidence-first, ruthless, concise`
- Ultimate target: `judge-winning repo + convincing local demo + high-conversion Devpost/video`
- Architectural strategy: `deterministic core + mandatory free/local AI copilot in the winning demo path + DataHub MCP + deterministic fallback`
- QA rigor: `high`
- Track strategy: `Metadata-Aware Code Generation primary until the AI demo path is undeniable; reassess only after AI hero flow lands`
- Tool policy: `free/open-source/local-first`
- Commercial wedge: `passport and compliance artifact, not generic impact analysis`
- Submission doctrine: `lead with what works, then state boundaries honestly`

## 1.1) Hackathon Challenge Contract

- Locked primary challenge: `Metadata-Aware Code Generation & Development`
- Locked secondary support claim: `Agents That Do Real Work`, but only after the AI hero path and DataHub read/act/write-back loop are visible in the product and demo
- Not pursued as primary contract: `Production ML Agents`, `Open/Wildcard`
- Working application rule: the plan does not permit a docs-only or artifact-only close; the shipped app, demo, and validation path must remain operational

| Contract ID | Competition requirement | Commitment level | Delivery phases | Owning micro-phases | Required deliverable | Validation gate |
|---|---|---|---|---|---|---|
| `HC-01` | Build a working software application that uses DataHub | `COMMITTED` | `P1-P7` | `W-04` to `W-18C` | Running app, docs, and reproducible validation path | `Working Application Gate` |
| `HC-02` | The agent reads DataHub before generating or deciding | `COMMITTED` | `P2-P4` | `W-06`, `W-06A`, `W-06B`, `W-11`, `W-12`, `W-13`, `W-14A` | Grounded input bundle tied to DataHub facts and MCP evidence | `DataHub Read Grounding Gate` |
| `HC-03` | The AI agent takes action rather than only reporting | `COMMITTED` | `P2`, `P4`, `P5` | `W-07`, `W-08`, `W-08A`, `W-14B`, `W-14C`, `W-15A` | AI-assisted operator outputs plus generated migration and review artifacts | `AI Hero Gate`, `Generated Artifact Gate` |
| `HC-04` | The system writes results back so the next human or agent inherits them | `COMMITTED` | `P3`, `P7` | `W-11`, `W-16A`, `W-18B` | Visible write-back and inheritance story grounded in the passport | `Write-Back Inheritance Gate` |
| `HC-05` | Generate production data code after reading real schemas, lineage, and rules | `COMMITTED` | `P2-P4` | `W-06`, `W-07A`, `W-14A`, `W-14B`, `W-14C`, `W-14D` | Grounded code-generation contract plus regenerated dbt and rollback outputs | `Generated Artifact Gate`, `Sandbox Execution Gate` |
| `HC-06` | Show example generated artifacts in the repository | `COMMITTED` | `P2-P5` | `W-09A`, `W-14D`, `W-14E`, `W-15C` | Refreshed committed artifacts and example evidence files | `Generated Artifact Gate` |
| `HC-07` | Attach the generated result to a PR and make it reviewer-ready | `COMMITTED` | `P5` | `W-15`, `W-15A`, `W-15B`, `W-15C` | Free GitHub PR path: PR-ready bundle by default, optional draft PR creation when token is provided | `PR Delivery Gate` |
| `HC-08` | Give judges confidence the output works the first time | `COMMITTED` | `P4`, `P6`, `P7` | `W-14C`, `W-14D`, `W-17`, `W-18A`, `W-18B` | Local sandbox execution evidence and concise demo proof | `Sandbox Execution Gate`, `Demo Compression Gate` |
| `HC-09` | Use DataHub MCP or Skills explicitly | `COMMITTED` | `P3`, `P7` | `W-11`, `W-16A`, `W-18A`, `W-18B`, `W-19` | Submission story and product copy explicitly show MCP/Skills usage | `Submission Surface Parity Gate` |
| `HC-10` | Strong entry quality: examples, proof, and handoff quality | `COMMITTED` | `P4-P8` | `W-09A`, `W-14D`, `W-15C`, `W-17A`, `W-18A`, `W-19`, `W-19A` | Example artifacts, demo script, PR packet, and maintainer-facing story | `Generated Artifact Gate`, `Submission Surface Parity Gate`, `Maintainer Traction Gate` |

### 1.2) Mandatory Competition Deliverables

The winning path is not considered ready until these artifacts exist or are explicitly deferred with reason:

1. A working local app path that still passes `npm run validate`.
2. A visible AI stage in the default judge flow.
3. A grounded DataHub input bundle showing what the AI and generator read.
4. Refreshed generated code artifacts committed in the repo.
5. Local sandbox execution or equivalent deterministic working-code proof for the generated bundle.
6. A PR-ready delivery bundle committed in the repo.
7. An optional actual draft PR creation path that works when a GitHub token is provided.
8. A live DataHub read/write-back inheritance story that remains technically honest.
9. Synced README, Devpost draft, judge docs, and Turkish operator aids.
10. A recorded note that actual third-party review or merge is outside the agent's control and may never be pre-claimed.
11. A professional, corporate, modern judge-facing UI plus a recorded desktop/mobile UI audit.

---

## 2) Scope Lock, Allowlist, Denylist

### 2.1 Scope lock
- Included: `README.md`, `README.tr.md`, `docs/`, `public/`, `src/`, `scripts/`, `skills/`, `examples/outputs/`, root governance files, and submission story surfaces
- Excluded: production warehouse execution, customer claims, paid hosted AI services, speculative multi-tenant product work, and non-DataHub ecosystem expansion beyond pitch notes

### 2.2 Allowlist
- `README.md`
- `README.tr.md`
- `AGENT_USER_PREFERENCES.md`
- `docs/DEVPOST_SUBMISSION.md`
- `docs/DEMO_SCRIPT.md`
- `docs/JUDGE_TEST_PATH.md`
- `docs/JUDGING_MAP.md`
- `docs/EVIDENCE_BOUNDARY.md`
- `docs/CLAIM_AUDIT.md`
- `docs/COMPETITION_REQUIREMENT_MATRIX.md`
- `docs/AI_RUNTIME_DECISION.md`
- `docs/VISUAL_DIRECTION.md`
- `docs/UI_REVIEW.md`
- `docs/PR_REVIEW_PACKET.md`
- `docs/MAINTAINER_OUTREACH.md`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/demo-data.json`
- `src/core/*`
- `src/datahub/*`
- `src/ai/*`
- `scripts/*`
- `tests/ai-*.test.js`
- `tests/sandbox-*.test.js`
- `skills/contextseal-change-certification/SKILL.md`
- `examples/outputs/*`
- `examples/outputs/generated/ai/*`
- `examples/outputs/pr/*`
- `examples/outputs/sandbox/*`

### 2.3 Denylist
- Claiming field-level lineage before it is genuinely implemented
- Claiming live normalized impact when the path remains fixture-derived
- Adding paid AI APIs or paid SaaS dependencies to satisfy the agentic gap
- Pitching generic impact analysis as the primary novelty
- Letting README, Devpost, and demo script drift out of sync

---

## 3) Objective Stack and Cut Lines

| Objective ID | Objective | Success signal | Priority wave | Status |
|---|---|---|---|---|
| `O-01` | Make the product unambiguously agentic without weakening deterministic authority | A free/local AI copilot visibly reads grounded ContextSeal evidence and emits owner alert, migration rationale, reviewer-note draft, and next-step guidance inside the default winning demo path | `MUST` | `IN_PROGRESS` |
| `O-02` | Remove or repair fragile technical claims | README, UI, and evidence docs are truthful about asset-level vs field-level and fixture vs live | `MUST` | `DONE` |
| `O-03` | Reposition the story around the passport artifact | Top-of-fold copy, Devpost, and video all make the passport the hero | `MUST` | `PENDING` |
| `O-04` | Compress the demo into a memorable 90-110 second flow | Updated demo script and UI show blocked risk, AI explanation, and passport payoff in under two minutes | `MUST` | `DONE` |
| `O-04A` | Upgrade the UI into a professional, corporate, modern product surface | Hero, AI output area, risk proof, passport, and PR handoff read as boardroom-ready on desktop and mobile | `MUST` | `DONE` |
| `O-05` | Prove the generated data code works in a local deterministic sandbox | Generated dbt/SQL artifacts run or validate in a reproducible local execution path and produce named evidence | `MUST` | `DONE` |
| `O-06` | Deliver the generated result into repo-native and PR-native review surfaces | Repo-committed artifacts exist and a free GitHub PR path is implemented: PR-ready bundle by default, optional draft PR creation with token | `MUST` | `DONE` |
| `O-07` | Preserve or strengthen live DataHub credibility | Live proof path and wording survive technical scrutiny | `SHOULD` | `PENDING` |
| `O-08` | Earn upstream or community traction | PR #35 gets an update comment and at least one outreach attempt is documented | `SHOULD` | `PENDING` |
| `O-09` | Add one defensible stretch proof beyond the core challenge contract | One extra upgrade lands without harming core truth or schedule | `STRETCH` | `PENDING` |

### 3.1 Cut lines
- Must ship: truthful claim reset, mandatory visible local AI copilot, passport-first pitch rewrite, professional modern UI refresh, local sandbox code proof, free PR delivery path, compressed demo script, track choice, and submission-surface sync
- Should ship: live evidence UI step, stronger live normalization story, PR #35 update, and maintainers outreach
- Stretch: field-aware filtering, signed reviewer identity hardening, or expanded entity-type realism in local proof

---

## 4) Phase Plan

| Phase | Goal | Status | Dependencies | Exit evidence |
|---|---|---|---|---|
| `P0` | Consolidate critique, constraints, governance spine, and challenge contract | `DONE` | `-` | Root governance files, active plan, and explicit challenge coverage matrix created |
| `P1` | Truth reset: fix or downgrade fragile claims and lock exact challenge wording | `DONE` | `P0` | Claim audit closes with synchronized docs and UI wording |
| `P2` | Add a free/local AI copilot that is impossible to miss in the demo | `PENDING` | `P1` | AI output artifact, UI surface, example output, grounded input bundle, and safe tests exist |
| `P3` | Strengthen live DataHub credibility, MCP/Skills visibility, and inheritance loop clarity | `PENDING` | `P1` | Live path states are truthful, visible, and technically defensible |
| `P4` | Prove grounded code generation and local working-code execution | `DONE` | `P1`, `P2`, `P3` | Generated artifacts are tied to DataHub facts and validated through a reproducible local sandbox |
| `P5` | Deliver a free GitHub PR path and repo-native review package | `DONE` | `P4` | PR-ready bundle exists, repo validation refreshes it, and the optional token-gated draft PR path now passes dry-run validation |
| `P6` | Rebuild the demo around blocked risk, AI action, passport payoff, PR handoff, and a professional modern UI | `DONE` | `P2`, `P3`, `P4`, `P5` | 90-110 second judge flow with updated UI cues, visual hierarchy, and script |
| `P7` | Rewrite submission surfaces as a sales pitch with honest authority | `PENDING` | `P1`, `P2`, `P3`, `P4`, `P5`, `P6` | README, Devpost draft, judging map, and Turkish helpers aligned |
| `P8` | Pursue upstream/social proof with minimal time burn | `PENDING` | `P7` | PR update + outreach log |
| `P9` | Land one stretch upgrade if core waves are closed | `PENDING` | `P7` | One bounded stretch item validates without hurting core truth |

### 4.1) Phase-by-Phase Execution Contract

| Phase | Exact surfaces to touch | Exact work that must happen | Required proof before closure |
|---|---|---|---|
| `P1` | `README.md`, `README.tr.md`, `docs/*`, `public/*`, `src/core/*`, `src/datahub/*`, `skills/*`, `examples/outputs/*` | Audit every live, field-level, query, and entity-type claim; either implement the capability or downgrade the claim; lock exact challenge wording in all pitch surfaces | Claim matrix updated, wording synchronized, repo still passes `npm run validate` |
| `P2` | `src/`, `scripts/`, `public/`, `tests/`, `examples/outputs/` | Pick the free/local model runtime, define the grounded input bundle, add AI adapter and fallback, emit four operator-facing outputs, save an example AI artifact, and make it visible in the UI | One real local AI run or explicit fallback path, named tests, visible UI panel, saved example output |
| `P3` | `src/datahub/*`, `src/server.js`, `public/*`, `docs/*`, `examples/outputs/*` | Make MCP/Skills usage explicit, separate live raw evidence from fixture-derived visualization, align query and entity-type claims, and show how write-back helps the next human or agent inherit context | Honest live/fixture copy, visible inheritance cue, synchronized docs |
| `P4` | `src/core/*`, `scripts/*`, `tests/*`, `examples/outputs/generated/*`, `examples/outputs/*` | Freeze the DataHub-to-codegen grounding contract, harden generation manifests, run the generated bundle in a local sandbox or equivalent deterministic executor, and save the proof | Sandbox or deterministic execution artifact, refreshed generated outputs, validation record |
| `P5` | `scripts/*`, `src/*`, `docs/*`, `examples/outputs/*` | Define the GitHub PR delivery contract, generate a PR-ready bundle, add optional draft PR creation with token, and save one reviewable PR example artifact | PR bundle exists, optional draft PR path tested when possible, repo artifact saved |
| `P6` | `public/index.html`, `public/app.js`, `public/styles.css`, `public/demo-data.json`, `docs/DEMO_SCRIPT.md`, `docs/VISUAL_DIRECTION.md`, `docs/UI_REVIEW.md`, `AGENT_USER_PREFERENCES.md` | Rebuild the hero sequence so judges see blocked risk, AI explanation, passport, and PR handoff in under two minutes, while upgrading the visual system into a professional corporate product surface | Updated UI flow, visual direction note, UI review note, updated script, timed dry run |
| `P7` | `README.md`, `README.tr.md`, `docs/DEVPOST_SUBMISSION.md`, `docs/JUDGING_MAP.md`, `docs/EVIDENCE_BOUNDARY.md`, `docs/tr/*` | Rewrite the repo and submission surfaces so the challenge contract, AI path, codegen proof, PR path, and write-back story are all explicit and consistent | Cross-surface parity review passes |
| `P8` | GitHub PR text, outreach notes, docs references | Post PR #35 update and prepare maintainer/community outreach | Public outreach artifact or copy-ready note exists |
| `P9` | Chosen stretch surfaces only | Land one extra improvement only after all must-ship gates are green | Stretch validation artifact |

### 4.2) Detailed Micro-Phase Specifications

These rows are binding execution specs. If implementation diverges, the plan must be updated first.

#### P1 — Truth Reset and Challenge Lock

| Task ID | Exact files to touch | Exact output artifact(s) | Exact validation command or review | Done when | Failure trigger | Fallback rule | Depends on |
|---|---|---|---|---|---|---|---|
| `W-04` | `README.md`, `README.tr.md`, `docs/DEVPOST_SUBMISSION.md`, `docs/JUDGING_MAP.md`, `docs/JUDGE_TEST_PATH.md`, `docs/EVIDENCE_BOUNDARY.md`, `docs/LIVE_DATAHUB_SETUP.md`, `public/index.html`, `public/app.js`, `src/core/workflow.js`, `src/core/impact.js`, `src/core/risk.js`, `skills/contextseal-change-certification/SKILL.md`, `examples/outputs/live-datahub-read-evidence.json`, `examples/outputs/live-datahub-writeback-evidence.json` | `docs/CLAIM_AUDIT.md` | Manual claim audit plus `npm run validate` | Every risky claim is listed with `keep`, `downgrade`, or `implement` | Any claim remains uncatalogued or contradictory | If implementation is too large, downgrade the claim instead of preserving ambiguity | `W-03A`, `W-03B` |
| `W-04A` | `docs/COMPETITION_REQUIREMENT_MATRIX.md`, `docs/DEVPOST_SUBMISSION.md`, `docs/JUDGING_MAP.md`, `plans/PLAN_20260721_contextseal_hackathon_win.md` | `docs/COMPETITION_REQUIREMENT_MATRIX.md` | Manual parity review against the hackathon prompt | Chosen primary-track clauses are mapped to product surfaces and planned gaps | Any primary requirement still points to a stretch item | If a clause cannot be met, demote the track decision before coding continues | `W-04` |
| `W-10` | `src/core/workflow.js`, `README.md`, `README.tr.md`, `docs/EVIDENCE_BOUNDARY.md`, `public/app.js`, `public/index.html`, `skills/contextseal-change-certification/SKILL.md`, `examples/outputs/demo-certification.json`, `public/demo-data.json` | Refreshed claim surfaces with corrected impact wording | `npm test`; `npm run demo`; claim diff review | No surviving field-level claim exists unless actual field-level logic is implemented | Any UI, doc, or artifact still says field-level when behavior is asset-level | Default to wording downgrade, not speculative implementation | `W-04` |
| `W-11` | `public/index.html`, `public/app.js`, `README.md`, `README.tr.md`, `docs/EVIDENCE_BOUNDARY.md`, `docs/LIVE_DATAHUB_SETUP.md`, `docs/JUDGE_TEST_PATH.md` | Updated live-versus-fixture product copy | `npm run demo`; manual UI review | Live raw evidence and fixture-derived visualization are visibly separated in UI and docs | Judge could still infer that the graph path itself is live-normalized when it is not | Prefer clearer labels over new backend complexity | `W-04` |
| `W-12` | `README.md`, `docs/DEVPOST_SUBMISSION.md`, `docs/JUDGING_MAP.md`, `docs/EVIDENCE_BOUNDARY.md`, `public/index.html`, `public/app.js`, `examples/outputs/live-datahub-read-evidence.json` | Updated query-usage wording | Claim diff review; `npm run validate` | Query usage claims match what live evidence actually proves | Any surface implies live query proof where only fixture query evidence exists | Keep fixture query value but label it honestly | `W-04` |
| `W-13` | `scripts/seed-datahub.py`, `README.md`, `docs/DEVPOST_SUBMISSION.md`, `docs/LIVE_DATAHUB_SETUP.md`, `examples/outputs/live-datahub-read-evidence.json`, `examples/outputs/live-datahub-writeback-evidence.json` | Either refreshed seeded proof or downgraded entity-type language | `npm run validate`; evidence review | Entity-type story matches seeded local proof reality | Cross-platform asset-type claims remain overstated | Prefer wording downgrade unless seed upgrade is small and testable | `W-04` |
| `W-14` | `plans/PLAN_20260721_contextseal_hackathon_win.md`, `docs/CLAIM_AUDIT.md` | In-plan decision note on field-aware filtering | Plan review | Decision is explicit: implement now or defer honestly | Team can still drift into accidental scope creep | If undecided after timebox, defer and downgrade all related claims | `W-04`, `W-10` |

#### P2 — AI Copilot and Grounded Explanation

| Task ID | Exact files to touch | Exact output artifact(s) | Exact validation command or review | Done when | Failure trigger | Fallback rule | Depends on |
|---|---|---|---|---|---|---|---|
| `W-05` | `package.json`, `README.md`, `README.tr.md`, `AGENT_ENVIRONMENT_AND_API.md`, `plans/PLAN_20260721_contextseal_hackathon_win.md` | `docs/AI_RUNTIME_DECISION.md` | `Get-Command ollama`; `ollama list` when installed; plan review | One free/local runtime and one default OSS model are explicitly chosen | Runtime choice stays abstract or paid | If no local runtime is available, keep deterministic fallback and label AI as unavailable, never fake it | `W-04A` |
| `W-05A` | `README.md`, `README.tr.md`, `docs/AI_RUNTIME_DECISION.md`, `AGENT_ENVIRONMENT_AND_API.md` | Operator setup and fallback note | Manual review | The operator can tell exactly how AI is enabled and what happens if it is absent | Missing-model behavior would break the demo | Fallback must preserve the full deterministic path | `W-05` |
| `W-06` | `src/core/*`, `src/datahub/*`, `src/ai/*`, `public/demo-data.json`, `docs/EVIDENCE_BOUNDARY.md` | Structured AI input contract | Contract review | The AI input bundle names the exact grounded fields it receives | AI can still be fed arbitrary or incomplete context | Refuse AI invocation when required grounded inputs are absent | `W-04`, `W-05` |
| `W-06A` | `src/ai/*`, `tests/ai-*.test.js`, `docs/EVIDENCE_BOUNDARY.md` | Hard response schema for 4 outputs | `npm test` | The AI output schema is explicit, bounded, and test-covered | Freeform prose only, with no schema guardrails | Reduce output scope before allowing uncontrolled format drift | `W-06` |
| `W-06B` | `scripts/*`, `examples/outputs/generated/ai/*`, `public/demo-data.json` | `examples/outputs/generated/ai/contextseal-ai-input.json` | `npm run demo` or dedicated artifact generation script once added | One inspectable example input bundle is committed | No inspectable grounding artifact exists | Use fixture-grounded bundle first; replace with live-derived example only when honest | `W-06` |
| `W-07` | `src/ai/*`, `src/server.js`, `src/core/workflow.js`, `public/demo-data.json` | Local AI adapter | `npm test` | Adapter calls the chosen local runtime and returns bounded output | Adapter blocks analysis when runtime is missing | Fallback returns deterministic-only state plus explicit AI-unavailable note | `W-05`, `W-06`, `W-06A` |
| `W-07A` | `src/server.js`, `src/core/workflow.js`, `src/ai/*` | Analyze-flow integration | `npm run demo`; `npm test` | AI consumes grounded results after deterministic verdict generation | AI influences deterministic verdict or evidence state | Move AI call post-verdict and keep it non-authoritative | `W-07` |
| `W-07B` | `tests/ai-*.test.js`, `tests/workflow.test.js` | AI-path tests | `npm test` | Both runtime-present and runtime-missing paths are tested | Demo or tests require a model unconditionally | Mock the model boundary, not the deterministic core | `W-07A` |
| `W-08` | `src/ai/*`, `src/core/*`, `public/demo-data.json`, `examples/outputs/generated/ai/*` | Four AI outputs in structured form | `npm run demo`; artifact review | Owner alert, migration rationale, reviewer-note draft, and next-step guidance all exist | Any output is generic, redundant, or detached from the grounded input | Shrink scope before shipping cosmetic AI text | `W-07A` |
| `W-08A` | `src/ai/*`, `docs/EVIDENCE_BOUNDARY.md`, `public/app.js`, `public/index.html` | Evidence-boundary-safe AI copy | `npm test`; UI copy review | AI text is clearly labeled as explanation/proposal, not proof | Any AI text visually or semantically upgrades evidence claims | Add stronger labels and layout separation | `W-08` |
| `W-09` | `public/index.html`, `public/app.js`, `public/styles.css`, `public/demo-data.json` | Visible AI panel in the default demo flow | `npm run demo`; browser review | Judges can see the AI contribution without hunting for it | AI exists only in JSON or hidden surfaces | Promote the panel above secondary evidence sections | `W-08A` |
| `W-09A` | `examples/outputs/generated/ai/*`, `docs/DEVPOST_SUBMISSION.md`, `README.md` | `examples/outputs/generated/ai/contextseal-ai-output.json`; `examples/outputs/generated/ai/contextseal-ai-output.md` | Artifact review; `npm run validate` | At least one reproducible AI output artifact is committed and referenced | AI claim depends on screenshots or narration only | Save the artifact even if the UI also shows it | `W-09` |

#### P4 — Grounded Code Generation and Sandbox Proof

| Task ID | Exact files to touch | Exact output artifact(s) | Exact validation command or review | Done when | Failure trigger | Fallback rule | Depends on |
|---|---|---|---|---|---|---|---|
| `W-14A` | `src/core/artifacts.js`, `src/core/workflow.js`, `docs/COMPETITION_REQUIREMENT_MATRIX.md`, `docs/EVIDENCE_BOUNDARY.md` | DataHub-to-codegen grounding contract note | Contract review | The exact schemas, lineage facts, policy findings, and migration rules that drive generation are named | Judges still cannot tell what generation is grounded on | Document the contract before extending generation behavior | `W-04A`, `W-06` |
| `W-14B` | `src/core/artifacts.js`, `src/core/passport.js`, `scripts/run-demo.js`, `examples/outputs/demo-certification.json` | Hardened generation manifest references | `npm test`; `npm run demo` | Each generated artifact can be traced back to grounded inputs and the passport context | Generation remains a black box in the pitch | Add metadata blocks or manifest references before polishing copy | `W-14A` |
| `W-14C` | `scripts/run-generated-sandbox.py`, `package.json`, `tests/sandbox-*.test.js`, `examples/outputs/generated/*` | Local sandbox execution path | `python scripts/run-generated-sandbox.py`; `npm run validate` | Generated artifacts pass a deterministic local execution or conformance run | No executable first-time-working proof exists | If full SQL execution is blocked, ship a narrower deterministic conformance harness and state its scope honestly | `W-14B` |
| `W-14D` | `examples/outputs/sandbox/*`, `docs/JUDGE_TEST_PATH.md`, `docs/DEVPOST_SUBMISSION.md` | `examples/outputs/sandbox/generated-sandbox-evidence.json` | Artifact review; sandbox command rerun | Named sandbox proof is committed and referenced | Sandbox success exists only in terminal memory | Persist the artifact even if the proof is partial | `W-14C` |
| `W-14E` | `examples/outputs/generated/*`, `public/demo-data.json`, `scripts/run-demo.js` | Refreshed generated examples | `npm run demo`; artifact diff review | Checked-in generated artifacts match the final grounded and sandboxed story | Examples drift away from final implementation | Regenerate outputs in the same request as the code change | `W-14D` |

#### P5 — PR Delivery and Reviewer Handoff

| Task ID | Exact files to touch | Exact output artifact(s) | Exact validation command or review | Done when | Failure trigger | Fallback rule | Depends on |
|---|---|---|---|---|---|---|---|
| `W-15` | `docs/PR_REVIEW_PACKET.md`, `README.md`, `docs/DEVPOST_SUBMISSION.md`, `plans/PLAN_20260721_contextseal_hackathon_win.md` | PR delivery contract | Manual review | The PR path defines title, body, checklist, changed files, attached artifacts, and token requirements | PR delivery still means only “you could manually open a PR” | Lock the artifact contract before writing automation | `W-14E` |
| `W-15A` | `scripts/build-pr-bundle.js`, `package.json`, `examples/outputs/pr/*`, `examples/outputs/generated/*` | PR-ready bundle generator | `node scripts/build-pr-bundle.js` | A reviewable bundle is generated locally without paid services | Bundle depends on hidden manual steps | Prefer static bundle generation over premature API integration | `W-15` |
| `W-15B` | `scripts/create-draft-pr.js`, `README.md`, `AGENT_ENVIRONMENT_AND_API.md` | Optional draft PR creation path | `node scripts/create-draft-pr.js --dry-run`; actual call only when `GITHUB_TOKEN` is present | Draft PR creation is implementable and safe when a token is available | Token is required for the default judge flow | Default path remains offline bundle generation; actual PR creation is optional and additive | `W-15A` |
| `W-15C` | `examples/outputs/pr/*`, `docs/PR_REVIEW_PACKET.md`, `docs/DEVPOST_SUBMISSION.md` | `examples/outputs/pr/pr-body.md`; `examples/outputs/pr/pr-payload.json`; `examples/outputs/pr/pr-checklist.md` | Artifact review; bundle generation rerun | Judges can inspect a concrete PR handoff artifact in-repo | PR story still depends on imagination | Save the bundle even if no token-backed live PR is created | `W-15B` |

#### P6 — Visual Upgrade and Judge-Facing Demo

| Task ID | Exact files to touch | Exact output artifact(s) | Exact validation command or review | Done when | Failure trigger | Fallback rule | Depends on |
|---|---|---|---|---|---|---|---|
| `W-16` | `public/index.html`, `public/app.js`, `public/styles.css`, `README.md` | Updated hero and narrative order | `npm start`; browser review | The first viewport emphasizes blocked risk and passport payoff | The page still reads like a generic governance tool | Move secondary copy below the fold | `W-09A`, `W-15C` |
| `W-16A` | `public/index.html`, `public/app.js`, `public/styles.css`, `public/demo-data.json`, `docs/JUDGING_MAP.md` | Visible live-evidence and inheritance cue | `npm start`; browser review | Judges can see the read -> act -> write-back -> inherit loop | Write-back remains technically real but visually invisible | Prefer explicit ribbons or workflow steps over hidden text | `W-11`, `W-15C` |
| `W-16B` | `docs/VISUAL_DIRECTION.md`, `AGENT_USER_PREFERENCES.md`, `public/styles.css` | `docs/VISUAL_DIRECTION.md` | Design review inside plan/docs | Typography, color system, spacing, panel hierarchy, motion, and data-viz principles are locked | Future UI work still depends on taste or improvisation | If unsure, bias toward clean enterprise polish over flashy novelty | `W-16`, `W-16A` |
| `W-16C` | `public/index.html`, `public/app.js`, `public/styles.css`, `public/demo-data.json` | Implemented visual system refresh | `npm start`; browser review | The UI feels professional, corporate, modern, and readable on first glance | Visual debt still hides the AI or passport story | Remove ornamental clutter before adding more modules | `W-16B` |
| `W-16D` | `docs/UI_REVIEW.md`, `public/index.html`, `public/styles.css`, `public/app.js` | `docs/UI_REVIEW.md` | Desktop and mobile browser audit | Audit confirms no overflow, clear hierarchy, and readable AI/risk/passport/PR sections | Layout breaks or weak visual hierarchy remain undocumented | Record the defect list and block closure until fixed | `W-16C` |
| `W-17` | `docs/DEMO_SCRIPT.md`, `README.md`, `docs/DEVPOST_SUBMISSION.md` | Compressed demo script | Timed dry run | Script fits 90-110 seconds | The story still takes too long or buries the AI | Cut exposition, not proof moments | `W-16D` |
| `W-17A` | `docs/DEMO_SCRIPT.md` | Exact shot list, subtitle copy, and spoken beats | Script review | Recording can proceed without improvisation | Demo still relies on ad-lib storytelling | Prefer fewer scenes and bigger beats | `W-17` |

#### P7, P8, P9 — Submission, Outreach, and Stretch

| Task ID | Exact files to touch | Exact output artifact(s) | Exact validation command or review | Done when | Failure trigger | Fallback rule | Depends on |
|---|---|---|---|---|---|---|---|
| `W-18` | `README.md`, `README.tr.md` | Rewritten repo top-fold positioning | Cross-read review | README leads with capability, AI path, passport, and codegen proof before limitations | README still leads with disclaimers | Keep limitations, but push them below proof and product framing | `W-17A` |
| `W-18A` | `docs/DEVPOST_SUBMISSION.md` | Rewritten Devpost draft | Submission-surface review | Devpost draft explicitly satisfies the chosen challenge contract | Devpost still reads like a deterministic governance tool only | Use the challenge matrix as the outline | `W-17A`, `W-15C`, `W-14D` |
| `W-18B` | `docs/JUDGING_MAP.md`, `docs/EVIDENCE_BOUNDARY.md`, `docs/JUDGE_TEST_PATH.md`, `docs/LIVE_DATAHUB_SETUP.md` | Synced judge-facing docs | Cross-surface parity review | All judging docs encode the same truth and same challenge story | Docs contradict the final demo or README | Treat docs drift as a blocking defect | `W-18`, `W-18A` |
| `W-18C` | `README.tr.md`, `docs/tr/*` | Updated Turkish helper surfaces | Turkish surface review | Turkish docs reflect the final English product truth | Turkish docs retain stale pitch or operator steps | Update only after English surfaces stabilize | `W-18B` |
| `W-19` | GitHub PR comment copy, `docs/MAINTAINER_OUTREACH.md` | PR #35 update text | Manual review; optional post action | One concise maintainer-facing update is ready and references the strongest proof surfaces | Update text is vague or overclaims adoption | Prefer modest technical clarity over hype | `W-18A` |
| `W-19A` | `docs/MAINTAINER_OUTREACH.md` | Community outreach note | Manual review | One free-channel outreach note exists for GitHub/Slack reuse | Outreach still has to be improvised later | Save copy even if it is not posted immediately | `W-19` |
| `W-20` | `plans/PLAN_20260721_contextseal_hackathon_win.md` | Stretch decision note | Plan review | One stretch item is selected only after core gates are green | Stretch work starts while must-ship gates are still open | Defer stretch entirely if schedule slips | `W-19A` |
| `W-20A` | Chosen stretch surface only | One extra bounded improvement | Focused validation | Stretch item lands without reopening core truth | Stretch work changes the primary story or breaks core proof | Abort stretch and preserve the core submission | `W-20` |

---

## 5) Micro-Phase Operations Backlog

| Task ID | Objective (Surgical) | Status | Agent | Date | Evidence/Note |
|---|---|---|---|---|---|
| `W-00` | Consolidate 3 independent critiques into one winning doctrine | `DONE` | `main-agent` | `2026-07-21` | Review complete; passport-first, zero-paid, truth-reset strategy locked |
| `W-01` | Inspect Universal-Agent-OS donor surfaces and select repo-appropriate pieces | `DONE` | `main-agent` | `2026-07-21` | Donor rules and plan template narrowed to ContextSeal needs |
| `W-02` | Create repo-local governance spine from donor surfaces | `DONE` | `main-agent` | `2026-07-21` | `AGENT_OS_RULES.md` and memory files created |
| `W-03` | Create active global-plan-template-compatible living roadmap | `DONE` | `main-agent` | `2026-07-21` | This plan created |
| `W-03A` | Expand the plan with an explicit hackathon challenge contract and requirement mapping | `DONE` | `main-agent` | `2026-07-21` | This request captured directly inside the living plan |
| `W-03B` | Tighten the plan to exact execution-spec granularity and add UI modernization scope | `DONE` | `main-agent` | `2026-07-21` | Exact file, artifact, command, fallback, and UI-spec planning added |
| `W-04` | Audit all field-level, live, query, and entity-type claims | `DONE` | `main-agent` | `2026-07-21` | `docs/CLAIM_AUDIT.md` created; core/doc/UI/skill wording narrowed to current truth |
| `W-04A` | Write the requirement-by-requirement gap list for the chosen challenge wording | `DONE` | `main-agent` | `2026-07-21` | `docs/COMPETITION_REQUIREMENT_MATRIX.md` created with current proof and remaining gaps |
| `W-05` | Choose exact zero-paid local model runtime, default model, and fallback contract | `DONE` | `main-agent` | `2026-07-21` | `docs/AI_RUNTIME_DECISION.md` locks Ollama + `qwen2.5:7b`; `npm run ai:probe` added |
| `W-05A` | Define operator setup and no-model fallback behavior for the AI path | `DONE` | `main-agent` | `2026-07-21` | README and environment memory now state that missing AI must not break the deterministic demo |
| `W-06` | Design grounded AI input bundle and non-authoritative output schema | `DONE` | `main-agent` | `2026-07-21` | `src/ai/contracts.js` defines the structured grounding bundle from deterministic run data |
| `W-06A` | Define the exact AI prompt contract and hard response schema for four outputs | `DONE` | `main-agent` | `2026-07-21` | `tests/ai-contracts.test.js` validates the required disclaimer and four-output schema |
| `W-06B` | Persist one example grounded input bundle artifact for review | `DONE` | `main-agent` | `2026-07-21` | `examples/outputs/generated/ai/contextseal-ai-input.json` is regenerated by `npm run demo` |
| `W-07` | Implement local AI adapter with hard fallback to deterministic-only mode | `DONE` | `main-agent` | `2026-07-21` | `src/ai/adapter.js` now returns bounded `PASS`, `FAIL`, `UNAVAILABLE`, or `NOT_ENABLED` states without blocking deterministic analysis |
| `W-07A` | Wire the AI adapter into analyze flow without altering deterministic verdict authority | `DONE` | `main-agent` | `2026-07-21` | `src/server.js` and `scripts/run-demo.js` enrich runs only after deterministic verdict generation |
| `W-07B` | Add tests for model-available and fallback behavior | `DONE` | `main-agent` | `2026-07-21` | `tests/ai-adapter.test.js` covers disabled, unavailable, and bounded-success paths |
| `W-08` | Generate four AI outputs: owner alert, migration rationale, reviewer-note draft, and next-step guidance | `DONE` | `main-agent` | `2026-07-21` | The adapter accepts the full four-output schema under the validated model-backed path |
| `W-08A` | Sanitize AI outputs and bind them to the evidence boundary copy | `DONE` | `main-agent` | `2026-07-21` | UI copy and evidence-boundary docs label AI as explanation-only and preserve explicit fallback states |
| `W-09` | Surface the AI outputs prominently in the UI and demo data | `DONE` | `main-agent` | `2026-07-21` | The Local AI Copilot panel is visible in the default demo flow and backed by `public/demo-data.json` |
| `W-09A` | Persist one reproducible example AI output artifact for docs and pitch surfaces | `DONE` | `main-agent` | `2026-07-21` | `npm run demo` writes `examples/outputs/generated/ai/contextseal-ai-output.json` and `.md`; the checked-in example is a truthful fallback artifact on a machine without Ollama |
| `W-10` | Rename or repair column-level claims in code, docs, UI, and skill | `DONE` | `main-agent` | `2026-07-21` | Authoritative evidence renamed to downstream paths; docs/UI/skill wording downgraded |
| `W-11` | Separate live raw MCP evidence from normalized fixture analysis in user-facing copy | `DONE` | `main-agent` | `2026-07-21` | README, judge docs, evidence boundary, and UI copy now state the split explicitly |
| `W-12` | Resolve observed-query wording to match actual live evidence | `DONE` | `main-agent` | `2026-07-21` | Query wording now distinguishes fixture findings from the zero-result live export |
| `W-13` | Resolve entity-type wording versus seeded local proof reality | `DONE` | `main-agent` | `2026-07-21` | Live proof wording narrowed to dataset-shaped seeded platform results |
| `W-14` | Decide whether to implement field-aware path filtering now or explicitly defer it | `DONE` | `main-agent` | `2026-07-21` | Deferred explicitly in `docs/CLAIM_AUDIT.md` and decision log |
| `W-14A` | Freeze the DataHub-to-codegen grounding contract | `DONE` | `main-agent` | `2026-07-21` | `artifacts.grounding` now names the request, lineage, policy, downstream-owner, and migration-rule inputs that ground generated code |
| `W-14B` | Implement or harden the generation manifest so judges can trace artifacts back to grounded inputs | `DONE` | `main-agent` | `2026-07-21` | `ARTIFACT_MANIFEST.json` now ties each generated file hash to grounding refs and passport context |
| `W-14C` | Add local sandbox execution or equivalent deterministic working-code validation for generated artifacts | `DONE` | `main-agent` | `2026-07-21` | `npm run sandbox` now validates the generated bundle against manifest hashes and grounding-aware conformance rules |
| `W-14D` | Persist one sandbox execution evidence artifact under `examples/outputs/` | `DONE` | `main-agent` | `2026-07-21` | `examples/outputs/sandbox/generated-sandbox-evidence.json` is now regenerated by `npm run sandbox` and records manifest-linked deterministic conformance proof |
| `W-14E` | Refresh committed generated artifacts after the sandbox path is settled | `DONE` | `main-agent` | `2026-07-21` | `npm run demo` plus `npm run sandbox` now keep the committed generated bundle and sandbox proof aligned |
| `W-15` | Define the free GitHub PR delivery contract and required inputs | `DONE` | `main-agent` | `2026-07-21` | `docs/PR_REVIEW_PACKET.md` now locks the branch, title, body, checklist, artifact attachment shape, evidence links, and token boundary for reviewer handoff |
| `W-15A` | Implement a PR-ready bundle generator for the generated change | `DONE` | `main-agent` | `2026-07-21` | `scripts/build-pr-bundle.js` now emits `examples/outputs/pr/pr-body.md`, `pr-payload.json`, and `pr-checklist.md`; validated by `npm run pr:bundle` and `npm run validate` |
| `W-15B` | Implement optional draft PR creation when a GitHub token is present | `DONE` | `main-agent` | `2026-07-21` | `scripts/create-draft-pr.js` now infers `owner/name` from `origin`, enforces `GITHUB_TOKEN` only for live calls, and passes `--dry-run` validation |
| `W-15C` | Persist one PR-ready example artifact or API transcript for judges | `DONE` | `main-agent` | `2026-07-21` | The committed PR bundle is refreshed by `npm run pr:bundle`; `examples/outputs/pr/draft-pr-dry-run.json` persists the token-free GitHub request transcript |
| `W-16` | Reframe home-page hero around blocked risk and passport payoff | `DONE` | `main-agent` | `2026-07-21` | Browser review at `http://127.0.0.1:4173` plus `npm run validate` confirmed the first viewport now leads with blocked risk, safe package, and passport payoff |
| `W-16A` | Add a visible live-evidence and inheritance stage cue to the product surface | `DONE` | `main-agent` | `2026-07-21` | Browser review plus `npm run validate` confirmed the visible read -> act -> write-back -> inherit strip and honest fixture/live inheritance copy |
| `W-16B` | Define the professional corporate visual direction for the upgraded UI | `DONE` | `main-agent` | `2026-07-21` | `docs/VISUAL_DIRECTION.md`, `AGENT_USER_PREFERENCES.md`, browser review at `http://127.0.0.1:4173`, and `npm run validate` now lock the typography, color, spacing, hierarchy, and motion contract |
| `W-16C` | Implement the visual system refresh across hero, AI, risk, passport, and PR surfaces | `DONE` | `main-agent` | `2026-07-21` | Browser review covered the analyzed and approved states at `http://127.0.0.1:4173`; `npm run validate` passed after the workspace hierarchy, semantic panel tones, and state-aware pills were refreshed |
| `W-16D` | Review the refreshed UI at desktop and mobile widths and record the audit | `DONE` | `main-agent` | `2026-07-21` | `docs/UI_REVIEW.md`, browser audit at `1440px` and `390px`, no horizontal overflow, and `npm run validate` close the desktop/mobile review with the workflow-state readability fix included |
| `W-17` | Rewrite demo script to 90-110 seconds | `DONE` | `main-agent` | `2026-07-21` | `docs/DEMO_SCRIPT.md` now totals 100 seconds across 9 timestamped segments; README and Devpost copy are synced; `npm run validate` passed |
| `W-17A` | Produce exact shot order, subtitle copy, and spoken beats for the new demo | `DONE` | `main-agent` | `2026-07-21` | `docs/DEMO_SCRIPT.md` now provides exact on-screen actions, spoken beats, and subtitle copy for all 9 timed segments; `npm run validate` passed |
| `W-18` | Rewrite README top fold and product positioning | `DONE` | `main-agent` | `2026-07-21` | `README.md` and `README.tr.md` now lead with blocked risk, AI boundary, safe package, PR handoff, and passport payoff before longer limitations/problem framing; `npm run validate` passed |
| `W-18A` | Rewrite Devpost draft around passport, AI action, sandbox proof, PR path, and safe write-back | `PENDING` | `main-agent` | `2026-07-21` | Primary track and hero narrative locked |
| `W-18B` | Update judging map and evidence boundary docs to reflect final truth and challenge coverage | `PENDING` | `main-agent` | `2026-07-21` | No cross-surface contradictions |
| `W-18C` | Update Turkish guides for the new story if English surfaces change materially | `PENDING` | `main-agent` | `2026-07-21` | Keep beginner-safe guidance aligned |
| `W-19` | Post a concise update on PR #35 with demo/value context | `PENDING` | `main-agent` | `2026-07-21` | Low-cost traction attempt |
| `W-19A` | Prepare maintainer/community outreach message using free channels only | `PENDING` | `main-agent` | `2026-07-21` | Slack/GitHub note, no paid promo |
| `W-20` | Choose one stretch proof candidate after all must-ship gates are green | `PENDING` | `main-agent` | `2026-07-21` | Stretch cannot preempt core challenge closure |
| `W-20A` | Implement the chosen stretch item | `PENDING` | `main-agent` | `2026-07-21` | Field-aware filtering, signed reviewer identity, or entity-type realism |

---

## 6) Task Tracking Ledger

| Step | Description | Status | Parent ID | Agent | Started | Completed | Evidence/Notes |
|---|---|---|---|---|---|---|---|
| `1.1` | Synthesize all critique streams into one prioritized roadmap | `DONE` | `W-00` | `main-agent` | `2026-07-21` | `2026-07-21` | Three reviewers + repo audit collapsed into one strategy |
| `1.2` | Verify current repo health before plan creation | `DONE` | `W-00` | `main-agent` | `2026-07-21` | `2026-07-21` | `npm run validate` passed before roadmap creation |
| `1.3` | Inspect donor governance surfaces in Universal-Agent-OS | `DONE` | `W-01` | `main-agent` | `2026-07-21` | `2026-07-21` | `AGENT_OS_RULES.md` and `AGENT_OS_PLAN_TEMPLATE.md` selected as donor basis |
| `1.4` | Adapt donor governance into ContextSeal-local operating rules | `DONE` | `W-02` | `main-agent` | `2026-07-21` | `2026-07-21` | New root governance files created |
| `1.5` | Create active living plan with micro-phase backlog and gates | `DONE` | `W-03` | `main-agent` | `2026-07-21` | `2026-07-21` | This plan created |
| `1.6` | Expand the plan with an explicit challenge-coverage contract | `DONE` | `W-03A` | `main-agent` | `2026-07-21` | `2026-07-21` | Challenge requirement mapping and mandatory deliverables added |
| `1.7` | Tighten the plan to exact execution specs and add UI modernization scope | `DONE` | `W-03B` | `main-agent` | `2026-07-21` | `2026-07-21` | Exact file, artifact, command, fallback, and UI scope tables added |
| `2.1` | Audit README, Devpost, UI, skill, and evidence docs for fragile claims | `DONE` | `W-04` | `main-agent` | `2026-07-21` | `2026-07-21` | Includes field-level, live normalized impact, query, and entity-type wording |
| `2.2` | Write the chosen-track requirement gap list and fix-versus-downgrade decisions | `DONE` | `W-04A` | `main-agent` | `2026-07-21` | `2026-07-21` | No silent ambiguity allowed |
| `3.1` | Choose the local/free model runtime, exact model target, and fallback semantics | `DONE` | `W-05` | `main-agent` | `2026-07-21` | `2026-07-21` | Default target locked to local Ollama with `qwen2.5:7b` |
| `3.2` | Define operator setup and missing-model fallback behavior | `DONE` | `W-05A` | `main-agent` | `2026-07-21` | `2026-07-21` | Deterministic-only fallback remains mandatory when AI is unavailable |
| `3.3` | Define grounded AI input and output contracts | `DONE` | `W-06`, `W-06A` | `main-agent` | `2026-07-21` | `2026-07-21` | Structured bundle plus hard response schema |
| `3.4` | Save one example grounded input bundle artifact | `DONE` | `W-06B` | `main-agent` | `2026-07-21` | `2026-07-21` | Inspectable grounding proof |
| `3.5` | Implement the AI adapter and deterministic fallback | `DONE` | `W-07`, `W-07A`, `W-07B` | `main-agent` | `2026-07-21` | `2026-07-21` | Focused adapter tests and full validation passed without requiring a local model |
| `3.6` | Generate and sanitize the four operator-facing AI outputs | `DONE` | `W-08`, `W-08A` | `main-agent` | `2026-07-21` | `2026-07-21` | The bounded schema, prompt contract, UI labels, and evidence-boundary docs now match |
| `3.7` | Add the AI outputs to the UI and persist one example output artifact | `DONE` | `W-09`, `W-09A` | `main-agent` | `2026-07-21` | `2026-07-21` | Browser verification confirms the visible AI panel; demo generation now persists AI output JSON/MD artifacts |
| `4.1` | Fix or downgrade the column-level impact language | `DONE` | `W-10` | `main-agent` | `2026-07-21` | `2026-07-21` | Shared code/doc/UI/skill sync completed |
| `4.2` | Clarify live raw evidence versus fixture-derived path visualization | `DONE` | `W-11` | `main-agent` | `2026-07-21` | `2026-07-21` | Shared docs + UI sync completed |
| `4.3` | Align observed-query claims to real live evidence outputs | `DONE` | `W-12` | `main-agent` | `2026-07-21` | `2026-07-21` | Implied live-usage overclaim removed |
| `4.4` | Align entity-type narrative with seeded proof or rework the seed | `DONE` | `W-13` | `main-agent` | `2026-07-21` | `2026-07-21` | Faster truthful route chosen: wording downgrade |
| `4.5` | Decide whether field-aware filtering is in-scope before submission | `DONE` | `W-14` | `main-agent` | `2026-07-21` | `2026-07-21` | Deferred without blocking the core story |
| `5.1` | Freeze the DataHub-to-codegen grounding contract | `DONE` | `W-14A` | `main-agent` | `2026-07-21` | `2026-07-21` | Code + docs now state the exact deterministic inputs that ground generated artifacts |
| `5.2` | Harden the generation manifest | `DONE` | `W-14B` | `main-agent` | `2026-07-21` | `2026-07-21` | Manifest is now persisted in generated outputs and linked to passport context |
| `5.3` | Add local sandbox execution or equivalent deterministic code validation | `DONE` | `W-14C` | `main-agent` | `2026-07-21` | `2026-07-21` | Python sandbox harness and focused test now provide executable conformance proof for the generated bundle |
| `5.4` | Save sandbox evidence and refresh committed generated outputs | `DONE` | `W-14D`, `W-14E` | `main-agent` | `2026-07-21` | `2026-07-21` | Sandbox proof artifact is committed and regenerated after demo output refresh |
| `6.1` | Define the free GitHub PR delivery contract | `DONE` | `W-15` | `main-agent` | `2026-07-21` | `2026-07-21` | Reviewer-ready handoff path is codified in `docs/PR_REVIEW_PACKET.md` and anchored to repo integrity checks |
| `6.2` | Implement PR-ready bundle generator | `DONE` | `W-15A` | `main-agent` | `2026-07-21` | `2026-07-21` | `node scripts/build-pr-bundle.js` and `npm run validate` both regenerate the offline PR packet from the approved run, manifest, and sandbox evidence |
| `6.3` | Implement optional draft PR creation with token and save PR example artifact | `DONE` | `W-15B`, `W-15C` | `main-agent` | `2026-07-21` | `2026-07-21` | `node scripts/create-draft-pr.js --dry-run` succeeds without a token; the live API call remains explicit and token-gated |
| `7.1` | Reframe home-page hero and add visible live-evidence/inheritance cue | `DONE` | `W-16`, `W-16A` | `main-agent` | `2026-07-21` | `2026-07-21` | Browser review at `http://127.0.0.1:4173`, refreshed `public/demo-data.json`, and `npm run validate` confirm the new hero order and inheritance loop |
| `7.2` | Define and implement the professional visual direction and UI audit | `DONE` | `W-16B`, `W-16C`, `W-16D` | `main-agent` | `2026-07-21` | `2026-07-21` | `docs/VISUAL_DIRECTION.md`, `docs/UI_REVIEW.md`, browser audits at `1440px` and `390px`, and `npm run validate` close the visual professionalism wave |
| `7.3` | Rewrite the demo script, shot order, and subtitle beats | `DONE` | `W-17`, `W-17A` | `main-agent` | `2026-07-21` | `2026-07-21` | The demo script now totals 100 seconds and includes exact shot order, subtitle copy, and spoken beats; `npm run validate` passed |
| `8.1` | Rewrite README and Devpost draft for the chosen challenge contract | `IN_PROGRESS` | `W-18`, `W-18A` | `main-agent` | `2026-07-21` | `-` | README top-fold positioning is complete; Devpost copy alignment remains open in `W-18A` |
| `8.2` | Update judging docs and Turkish support surfaces | `PENDING` | `W-18B`, `W-18C` | `main-agent` | `-` | `-` | Global story parity |
| `9.1` | Post PR #35 update and prepare community outreach note | `PENDING` | `W-19`, `W-19A` | `main-agent` | `-` | `-` | Traction attempt artifacts |
| `10.1` | Choose and implement one stretch upgrade after core closure | `PENDING` | `W-20`, `W-20A` | `main-agent` | `-` | `-` | No stretch before core gates are green |

---

## 7) Validation Gates Matrix

| Gate Designation | Scope | Assessment Vector | Expected | Result | Log / Artifact |
|---|---|---|---|---|---|
| `Repository Validation Gate` | Current repo health | `npm run validate` | `PASS` | `PASS` | Validation run completed on 2026-07-21 |
| `Working Application Gate` | The shipped app remains runnable end to end | `npm run validate` plus local judge flow | `PASS` | `PASS` | Current repo already passes the base working-app path |
| `DataHub Read Grounding Gate` | DataHub facts are the explicit basis for generation and AI explanation | Grounded input artifact plus MCP/Skills trace review | `PASS` | `PASS` | AI grounding input and code-generation grounding contract now explicitly name the deterministic facts used by both explanation and generation paths |
| `Generated Artifact Gate` | Generated migration outputs remain concrete, committed, and reviewable | Artifact diff review plus example output refresh | `PASS` | `PASS` | Generated outputs now ship with grounding metadata, manifest linkage, and a committed sandbox evidence artifact tied to the refreshed bundle |
| `Sandbox Execution Gate` | Generated code works in a local deterministic path | Focused sandbox command or deterministic executor | `PASS` | `PASS` | `npm run sandbox` regenerates `examples/outputs/sandbox/generated-sandbox-evidence.json` after validating the committed bundle |
| `PR Delivery Gate` | Generated result is attachable to PR review | PR bundle generation and optional draft PR creation | `PASS` | `PASS` | `npm run pr:bundle`; `npm run pr:draft -- --dry-run`; `examples/outputs/pr/*`; live API creation remains optional and token-gated |
| `Write-Back Inheritance Gate` | The next human or agent can inherit the result through DataHub write-back | Live proof review plus UI/doc surfacing | `PASS` | `PASS` | Live proof artifacts already existed; `public/index.html`, `public/app.js`, and `docs/JUDGING_MAP.md` now surface the inheritance loop explicitly |
| `Integrity Lock Gate` | Governance surfaces | Manual parity check across `AGENTS.md`, root governance files, and active plan | `PASS` | `PASS` | Root governance spine and active plan created together |
| `Evidence Boundary Gate` | Claims around live, fixture, field-level, and queries | Doc/UI/code audit | `PASS` | `PASS` | `docs/CLAIM_AUDIT.md`; docs/UI/skill/workflow wording synchronized on 2026-07-21 |
| `AI Hero Gate` | Winning demo path AI presence | Local model run + saved artifact + visible UI proof | `PASS` | `WARN` | Visible AI panel plus committed input/output artifacts now exist, but a local-model-backed `PASS` artifact is still pending runtime availability |
| `Agentic Boundary Gate` | Safe non-authoritative AI behavior | Tests + fallback verification + boundary review | `PASS` | `PASS` | Adapter tests cover disabled, unavailable, and bounded-success paths; UI and docs label AI as explanation-only |
| `Visual Professionalism Gate` | Judge-facing UI quality | Desktop and mobile review against `docs/VISUAL_DIRECTION.md` | `PASS` | `PASS` | `docs/VISUAL_DIRECTION.md`; `docs/UI_REVIEW.md`; browser review at `1440px` and `390px`; workflow-state readability fix landed without introducing overflow |
| `Demo Compression Gate` | Judge story | Updated script + timed dry run | `PASS` | `PASS` | `docs/DEMO_SCRIPT.md` totals 100 seconds across 9 segments and now includes exact shot order, subtitle copy, and spoken beats |
| `No-Paid-Dependency Gate` | New roadmap work | Dependency and tool review | `PASS` | `PASS` | Roadmap constrained to free/open-source/local-first paths |
| `Submission Surface Parity Gate` | README, Devpost, judging docs, UI copy | Cross-surface diff review | `PASS` | `NOT_RUN` | Pending `W-18` to `W-21` |
| `Maintainer Traction Gate` | PR and outreach surfaces | Public comment/outreach evidence | `PASS` | `NOT_RUN` | Pending `W-19` and `W-19A` |
| `Stretch Proof Gate` | Chosen extra upgrade only after core closure | Focused validation for chosen stretch | `PASS` | `NOT_RUN` | Pending `W-20` and `W-20A` |

---

## 8) Risks, Decisions, Handoff

### 8.1 Risk registry

| Risk ID | Risk | Probability | Impact | Mitigation | Status |
|---|---|---|---|---|---|
| `R-01` | A local model path proves unstable or unavailable on the target machine | `M` | `H` | Use an optional adapter with deterministic fallback and no paid dependency | `OPEN` |
| `R-01A` | The AI layer lands but still feels cosmetic to judges | `M` | `H` | Force four concrete outputs and make AI visible in the first minute of the demo | `OPEN` |
| `R-02` | Field-level lineage is too large to implement cleanly before submission | `H` | `H` | Downgrade the claim fast, then optionally add field-aware filtering as stretch work | `MITIGATED` |
| `R-02A` | The generated code still lacks a convincing first-time-working proof | `M` | `H` | Promote sandbox execution into the core plan instead of stretch work | `OPEN` |
| `R-02B` | PR delivery remains hand-wavy and fails the chosen primary challenge | `M` | `H` | Promote PR bundle generation and optional draft PR creation into the core plan | `MITIGATED` |
| `R-03` | README/Devpost/UI drift creates a credibility leak | `M` | `H` | Enforce live-doc sync and close `W-20` before claiming polish | `OPEN` |
| `R-04` | Maintainers do not respond before deadline | `H` | `M` | Treat outreach as upside, not a dependency for the main story | `OPEN` |
| `R-05` | Time gets consumed by stretch work before must-have fixes land | `M` | `H` | Hard cut line: no stretch work before `O-01` to `O-06` close | `OPEN` |
| `R-06` | Over-defensive language remains and weakens first impressions | `M` | `M` | Rewrite top folds after truth reset, not before | `OPEN` |
| `R-07` | An actual third-party PR merge cannot be obtained before deadline | `H` | `M` | Commit to PR-ready delivery and optional draft PR creation; never pre-claim external review or merge | `OPEN` |
| `R-08` | The UI remains technically correct but still looks like a polished internal dashboard rather than a premium submission | `M` | `M` | Lock visual direction before implementation and review both desktop and mobile states | `MITIGATED` |

### 8.2 Decision log

| Decision ID | Decision | Reason | Date | Owner |
|---|---|---|---|---|
| `D-01` | Primary challenge track is `Metadata-Aware Code Generation & Development` | The repo can satisfy that contract most directly if sandbox proof and PR delivery are made core requirements | `2026-07-21` | `main-agent` |
| `D-02` | The story hero is the passport/compliance artifact, not generic impact analysis | This is the most differentiated wedge versus commodity lineage tooling | `2026-07-21` | `main-agent` |
| `D-03` | New roadmap work assumes zero paid tools or services | The user explicitly wants a no-paid-upgrade path | `2026-07-21` | `main-agent` |
| `D-04` | Any LLM addition must remain explanatory, optional, and non-authoritative | Preserves the core safety thesis while satisfying hackathon expectations | `2026-07-21` | `main-agent` |
| `D-05` | For the winning submission path, AI is mandatory and visible even though deterministic fallback remains available | Hidden or merely optional AI would still read as non-agentic to judges | `2026-07-21` | `main-agent` |
| `D-06` | Local sandbox execution is a core requirement, not stretch work | The chosen primary challenge implies judges need evidence that generated code works on the first try | `2026-07-21` | `main-agent` |
| `D-07` | Free PR delivery is a core requirement, not stretch work | The chosen primary challenge explicitly values PR-attached generated artifacts | `2026-07-21` | `main-agent` |
| `D-08` | Actual external review or merge is outside the agent's control and cannot be pre-claimed | The plan will implement PR creation/attachment paths and reviewer-ready artifacts, but not fake external adoption | `2026-07-21` | `main-agent` |
| `D-09` | UI modernization is a core requirement, not optional polish | Judge perception and demo clarity depend on a professional product surface | `2026-07-21` | `main-agent` |
| `D-10` | Field-aware filtering is deferred until after the core hackathon path ships | Truthful wording downgrade is cheaper and safer than late lineage-scope expansion | `2026-07-21` | `main-agent` |
| `D-11` | The AI copilot runtime is optional local Ollama with `qwen2.5:7b`, and missing runtime must fall back to deterministic-only mode | This keeps the agentic path free/local while preserving a stable judge path on machines without Ollama | `2026-07-21` | `main-agent` |

### 8.3 Handoff checkpoint

```markdown
## CHECKPOINT - HANDOFF
- Last Concluded Micro-Step: 8.1
- Status: IN_PROGRESS
- Next Micro-Step: W-18A
- Critical Gate Status: PASS for repository validation, working app, DataHub grounding, generated artifact proof, sandbox execution, PR delivery, write-back inheritance, evidence-boundary truth reset, agentic-boundary safety, visual professionalism, and demo compression; WARN for AI hero proof; NOT_RUN for submission parity gates
```