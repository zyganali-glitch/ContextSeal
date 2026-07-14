# Pre-submission checklist

Use this immediately before submitting. Automated checks prove repository facts; manual checks prove public visibility and presentation. Do not substitute one for the other.

## 1. Stop-ship repository checks

- [ ] Fresh checkout: `npm ci --ignore-scripts` succeeds.
- [ ] `npm run validate` passes and leaves no Git diff.
- [ ] `npm test` passes on Node 20 and Node 24.
- [ ] `npm run demo:check` confirms committed output is deterministic.
- [ ] `npm run evidence:check` validates the committed synthetic-local proof.
- [ ] `npm run smoke` completes analyze, approval, and fixture-only operation preparation.
- [ ] `docker compose up --build` becomes healthy and the fixture API responds.
- [ ] GitHub Actions is green on the exact submitted commit.
- [ ] `git status --short` is empty on the submitted branch.
- [ ] No placeholder workstation path, mojibake, dead link, credential, private tenant, or customer data is tracked.

## 2. Claim integrity

- [ ] [Evidence manifest](EVIDENCE_MANIFEST.md) matches the committed JSON and generated files.
- [ ] `PASS`, `WARN`, `FAIL`, `NOT_RUN`, `STALE`, and `FIXTURE` keep their exact meanings everywhere.
- [ ] GitHub Pages is called a generated historical fixture walkthrough, never a live backend.
- [ ] Local fixture is called real application execution with synthetic context.
- [ ] Live-local evidence is called disposable local DataHub with synthetic metadata.
- [ ] Fixture has five downstream assets and two synthetic query examples.
- [ ] Current live-local facts match the recaptured evidence: 10 MCP reads; complete 3-field schema in 1 page; 6 downstream assets (2 Datasets / 2 DataJobs / 2 Dashboards); 6 exact paths; 0 query records; direct request `70 / BLOCKED`; 3 `PASS` mutation receipts; separate durable read-back `PASS`.
- [ ] The fixture's synthetic `ML_MODEL` node is not confused with the live-local MLflow scoring `DataJob`; neither is presented as proof that inference ran.
- [ ] Mutation receipts and durable read-back are described separately.
- [ ] Document verification is described as exact receipt-document bindings, not full-body equality.
- [ ] Generated SQL is never described as executed warehouse SQL.
- [ ] No production, customer-adoption, security-certification, or incident-reduction claim appears.

## 3. DataHub proof and safety reset

- [ ] The proof target contains both `contextseal_fixture=true` and `evidence_boundary=synthetic-local`.
- [ ] The approved scope, reviewer note, passport ID, raw-evidence hash, and manifest match the exported run.
- [ ] Exactly three bounded mutation receipts are `PASS`.
- [ ] Structured properties and the appended passport reference were read back.
- [ ] Passport, manifest, and target literals were found in the exact returned decision document.
- [ ] `DATAHUB_MCP_MUTATIONS_ENABLED=false` is restored.
- [ ] `CONTEXTSEAL_ALLOWED_TARGET_URNS` contains only the intended exact target.
- [ ] The ContextSeal operator token is different from the DataHub credential.
- [ ] `.env` is ignored and untracked.
- [ ] No token appears in terminal capture, screenshots, video, evidence, browser storage, or Git history.

## 4. Public repository and demo

- [ ] Repository is public: https://github.com/zyganali-glitch/ContextSeal
- [ ] GitHub recognizes Apache-2.0 in the About panel.
- [ ] About description and website URL match the final submission.
- [ ] GitHub Pages opens while signed out: https://zyganali-glitch.github.io/ContextSeal/
- [ ] Hosted copy clearly says generated fixture walkthrough and historical recorded certification.
- [ ] README's first screen explains the product, why it is an agent, and the two-minute path.
- [ ] Sample generated artifacts and live-local evidence are easy to find.
- [ ] The submitted work and commit history comply with the hackathon build period.
- [ ] Repository, hosted walkthrough, and video remain public and unrestricted through at least **August 31, 2026 at 5:00 PM EDT**, when the [official judging period](https://datahub.devpost.com/rules) ends.

## 5. Demo video

- [ ] Follow [exact narration](DEMO_SCRIPT.md) and [shot list](VIDEO_SHOT_LIST.md).
- [ ] Final duration is below 3:00; target 2:50–2:58.
- [ ] The video shows the functioning product, not only slides.
- [ ] Runtime boundary badges remain visible.
- [ ] Narration says “five downstream fixture assets, deepest four hops,” not “five-hop path.”
- [ ] Fixture queries are explicitly synthetic; live-local zero stays zero if that is the evidence.
- [ ] Direct blocked request and generated safe alternative are visibly distinct.
- [ ] Human approval, passport, fixture `NOT_RUN`, and live-local DataHub proof are shown.
- [ ] The live-local proof caption says synthetic metadata and no production/customer data.
- [ ] Browser profile, tabs, notifications, username paths, `.env`, and tokens are absent.
- [ ] Audio is intelligible; English captions were manually corrected.
- [ ] No copyrighted music, footage, or unlicensed third-party material appears.
- [ ] Video is public on YouTube, Vimeo, or Youku and plays while signed out.

## 6. Devpost form

- [ ] Primary category: **Agents That Do Real Work**.
- [ ] Secondary fit, if the form permits: **Metadata-Aware Code Generation & Development**.
- [ ] Repository, walkthrough, and public video URLs are clickable.
- [ ] Final English description is copied from [Devpost submission](DEVPOST_SUBMISSION.md).
- [ ] `TODO_PUBLIC_VIDEO_URL` is absent from the submitted form.
- [ ] DataHub MCP read, exact-path, mutation, and verification tools are named.
- [ ] Sample dbt, YAML, rollback, owner, passport, and evidence outputs are linked.
- [ ] Build-period disclosure mentions AI development assistance and no copied personal-project code.
- [ ] Limitations remain included.
- [x] DataHub Skills/open-source bonus links the real public [PR #35](https://github.com/datahub-project/datahub-skills/pull/35) and labels it `OPEN / DRAFT / NOT_MERGED`.
- [ ] Any Most Valuable Feedback submission contains real, actionable experience—not invented feedback.

## 7. Final incognito and clean-checkout review

- [ ] Open the Devpost preview while signed out where possible.
- [ ] Open every submitted URL in a private window.
- [ ] Play the entire public video from the submitted URL.
- [ ] Run the README judge path once from a clean checkout.
- [ ] Compare video, Devpost text, README, dashboard, evidence manifest, and committed JSON one final time.
- [ ] Save the final Devpost preview and submitted project URL privately.

## Timing

Official deadline: **August 10, 2026 at 5:00 PM EDT** (**August 11, 2026 at 00:00 in Istanbul**).

Target:

- August 8: code/evidence freeze
- August 9: video, copy, public-link, and incognito review
- August 10: contingency only; no new feature work
