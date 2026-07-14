# Pre-submission readiness ledger

`[x]` items are repository facts prepared or verified by the agent. Unchecked items require the project owner’s video, identity, account, or final Devpost action. Evidence-state words retain their exact repository meanings.

## 1. Repository and runtime — agent complete

- [x] Fresh checkout: `npm ci --ignore-scripts` succeeds.
- [x] `npm run validate` passes and leaves no Git diff.
- [x] Tests pass on Node 20 and Node 24 in GitHub Actions.
- [x] `npm run demo:check` confirms committed output is deterministic.
- [x] `npm run evidence:check` validates the committed synthetic-local proof.
- [x] `npm run smoke` completes analyze, approval, and fixture-only operation preparation.
- [x] `docker compose up --build` becomes healthy; `/api/health` and `/api/demo` respond in fixture mode with mutations disabled.
- [x] GitHub Actions and Pages are green on the exact submitted commit.
- [x] The submitted `main` worktree is clean.
- [x] No placeholder workstation path, mojibake, dead documentation link, credential, private tenant, or customer data is tracked.
- [x] Repository history contains no tracked `.env`, high-confidence GitHub token, or private-key signature.

## 2. Claim integrity — agent complete

- [x] [Evidence manifest](EVIDENCE_MANIFEST.md) matches the committed JSON and generated files.
- [x] `PASS`, `WARN`, `FAIL`, `NOT_RUN`, `STALE`, and `FIXTURE` keep their exact meanings everywhere.
- [x] GitHub Pages is called a generated historical fixture walkthrough, never a live backend.
- [x] Local fixture is called real application execution with synthetic context.
- [x] Live-local evidence is called disposable local DataHub with synthetic metadata.
- [x] Fixture facts remain five downstream assets, deepest path four hops, and two synthetic query examples.
- [x] Live-local facts remain 10 MCP reads; complete 3-field schema in 1 page; 6 downstream assets (2 Datasets / 2 DataJobs / 2 Dashboards); 6 exact paths; 0 query records; direct request `70 / BLOCKED`; 3 `PASS` mutation receipts; separate durable read-back `PASS`.
- [x] The fixture's synthetic `ML_MODEL` node is not confused with the live-local MLflow scoring `DataJob`; neither is presented as proof that inference ran.
- [x] Mutation receipts and durable read-back are described separately.
- [x] Document verification is described as exact receipt-document bindings, not full-body equality.
- [x] Generated SQL is never described as executed warehouse SQL.
- [x] No production, customer-adoption, security-certification, or incident-reduction claim appears.

## 3. DataHub proof and safety — agent complete

- [x] The proof target contains both `contextseal_fixture=true` and `evidence_boundary=synthetic-local`.
- [x] The approved scope, reviewer note, passport ID, raw-evidence hash, and manifest match the exported run.
- [x] Exactly three bounded mutation receipts are `PASS`.
- [x] Structured properties and the appended passport reference were read back.
- [x] Passport, manifest, and target literals were found in the exact returned decision document.
- [x] `DATAHUB_MCP_MUTATIONS_ENABLED=false` is explicit in the current local environment.
- [x] The recording runtime is fixture mode with no operator or DataHub credential loaded; DataHub calls and mutations remain `NOT_RUN`.
- [x] `.env` is ignored and untracked.
- [x] No token appears in committed evidence, prepared media, browser storage, repository history, or screenshots.

## 4. Public surfaces and submission package — agent complete

- [x] Repository is public: https://github.com/zyganali-glitch/ContextSeal
- [x] GitHub recognizes Apache-2.0.
- [x] About description, topics, and website URL match the project.
- [x] GitHub Pages opens signed out: https://zyganali-glitch.github.io/ContextSeal/
- [x] Hosted copy clearly says generated fixture walkthrough and historical recorded certification.
- [x] README's first screen explains the product, why it is an agent, and the two-minute path.
- [x] Sample generated artifacts and live-local evidence are easy to find.
- [x] The submitted work and commit history comply with the hackathon build period.
- [x] Four sanitized Devpost images are ready at [docs/media](media/README.md), each `1500 × 1000` (`3:2`) and below 5 MB.
- [x] English project copy, Built With tags, gallery captions, exact links, limitations, build-period disclosure, and optional feedback text are copy-ready.
- [x] DataHub Skills/open-source bonus links public [PR #35](https://github.com/datahub-project/datahub-skills/pull/35) with exact status `OPEN / READY_FOR_REVIEW / NOT_MERGED`.
- [x] Daily read-only repository/Pages/PR monitoring is scheduled through the official judging window.

Ongoing condition, not a pre-submit task: keep the repository, walkthrough, and eventual video public and unrestricted through **August 31, 2026 at 5:00 PM EDT** (Istanbul: **September 1, 2026 at 00:00**), when the [official judging period](https://datahub.devpost.com/rules) ends.

## 5. Demo video — project owner

- [ ] Follow [exact narration](DEMO_SCRIPT.md) and [shot list](VIDEO_SHOT_LIST.md).
- [ ] Final duration is below 3:00; target 2:50–2:58.
- [ ] The video shows the functioning product, not only slides.
- [ ] Runtime boundary badges remain visible.
- [ ] Narration says “five downstream fixture assets, deepest four hops,” not “five-hop path.”
- [ ] Fixture queries are explicitly synthetic; live-local zero stays zero.
- [ ] Direct blocked request and generated safe alternative are visibly distinct.
- [ ] Human approval, passport, fixture `NOT_RUN`, and recorded live-local DataHub proof are shown.
- [ ] The live-local proof caption says synthetic metadata and no production/customer data.
- [ ] Browser profile, tabs, notifications, username paths, `.env`, terminal, and tokens are absent.
- [ ] Audio is intelligible; English captions are manually corrected.
- [ ] No copyrighted music, footage, or unlicensed third-party material appears.
- [ ] Video is public on YouTube, Vimeo, or Youku and plays signed out.

## 6. Devpost form — project owner

- [ ] Join the hackathon and complete owner-controlled identity, team, residence, eligibility, and terms fields.
- [ ] Select primary category **Agents That Do Real Work** and, if permitted, secondary fit **Metadata-Aware Code Generation & Development**.
- [ ] Paste the final English description from [Devpost submission](DEVPOST_SUBMISSION.md).
- [ ] Add the public repository, walkthrough, sample-output, video, and upstream PR URLs.
- [ ] Replace `TODO_PUBLIC_VIDEO_URL`; it must not appear in the submitted form.
- [ ] Upload the prepared thumbnail and three gallery images with the provided captions.
- [ ] Add the prepared Built With tags.
- [ ] If the optional Most Valuable Feedback field is used, paste the real [copy-ready response](DEVPOST_FEEDBACK.md).
- [ ] Confirm DataHub MCP read, exact-path, mutation, and verification tools remain named.
- [ ] Confirm limitations and build-period disclosure remain included.
- [ ] Preview signed out where possible; open every link and play the entire video.
- [ ] Submit and privately save the final preview and public Devpost project URL.

## 7. Final consistency — split ownership

- [x] Run the README judge path from a clean checkout.
- [x] Compare README, dashboard, evidence manifest, committed JSON, Devpost copy, narration, and shot list.
- [x] Open the repository, walkthrough, sample outputs, and upstream PR without authentication.
- [ ] Compare the recorded video against the prepared package after editing.
- [ ] Compare the final Devpost preview against the prepared package before Submit.

## Timing

Official deadline: **August 10, 2026 at 5:00 PM EDT** (**August 11, 2026 at 00:00 in Istanbul**).

Target:

- August 8: code/evidence freeze
- August 9: video, copy, public-link, and signed-out review
- August 10: contingency only; no new feature work
