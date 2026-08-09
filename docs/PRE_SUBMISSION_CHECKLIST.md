# Pre-Submission Checklist

Updated: 2026-08-09 UTC

This checklist is authoritative for final-head release readiness. Do not claim the hackathon submission is frozen until every required item below is either `PASS` with named evidence or explicitly marked `WARN` or `NOT_RUN` with a direct reason.

## Current truth before the final freeze

- [x] Record that PR #4 merged into `main` as merge commit `0dc924db9d82037d2e813548bdee27af5f180889`.
- [x] Record that PR #5 (`agent/contextseal-final-product-polish`) merged into `main` as merge commit `7f24388059e8a12872f48c214ebd2cac82811a7d`.
- [x] Record that `7f24388059e8a12872f48c214ebd2cac82811a7d` is the verified PRE-VIDEO MAIN CANDIDATE: ContextSeal CI run `31246557467` PASS (validate Node 20 PASS, validate Node 24 PASS, dbt-proof PASS, container-smoke PASS, submission PASS) and Deploy Judge Demo run `31246557473` PASS (build PASS, deploy PASS, Pages `submission:check` PASS).
- [x] Record that the earlier pre-freeze candidate SHA `c984eeba449d54d49fb4228b22835933fb7db98e` has hosted CI proof only.
- [x] Record that the temporary PR #4 and PR #5 working branches were deleted or retired after merge.
- [ ] Select the new frozen release SHA after the final docs truth-sync merges into `main`. The immutable GitHub Release after that merge is the authoritative record for the exact final release SHA, CI run, Pages run, video URL, and Devpost freeze.

## Exact final-head procedure

1. Finish code, UI polish, and submission copy (product-polish landed as PR #5; final docs truth-sync lands as the last docs-only PR).
2. Merge the final docs truth-sync branch to `main`, then stop landing follow-up changes on top of the chosen release candidate SHA.
3. Run `npm run prevideo:check` and `npm run submission:check` on that exact checkout; keep the tree clean.
4. Push only that exact SHA to the release branch or final `main` head.
5. Record the matching GitHub Actions CI run and GitHub Pages deploy for that same SHA before changing any submission surface.
6. Create the immutable annotated tag `datahub-hackathon-submission-v1` at that exact SHA, then push the tag without moving it.
7. Create the GitHub release from that exact annotated tag and link the same-SHA CI, Pages, evidence manifest, and demo video.
8. Only then upload or confirm the public video URL, remove pending submission text, and freeze Devpost.

## Historical candidate record

- [x] Historical candidate SHA `c984eeba449d54d49fb4228b22835933fb7db98e` passed `npm run prevideo:check`.
- [x] Historical candidate SHA `c984eeba449d54d49fb4228b22835933fb7db98e` passed `npm run submission:check`.
- [x] Historical candidate GitHub Actions run `30766641380` passed Node 20, Node 24, Python safety, dbt-proof, container-smoke, and submission.
- [x] Historical candidate verification kept a clean tree after the read-only suite.

## Final SHA and tree

- [ ] Confirm `git status --short` is empty at frozen final-head verification.
- [ ] Confirm `git diff --exit-code` passes after the frozen head read-only validation suite.
- [ ] Confirm the selected release SHA is the same SHA used by CI, Pages, tag, release, video, and Devpost.

## Local validation contract for the new frozen final head

- [ ] Run `npm ci --ignore-scripts` on the exact frozen final-head checkout.
- [ ] Run `npm run prevideo:check`.
- [ ] Run `npm run submission:check`.
- [ ] Confirm `git diff --exit-code` still passes immediately after `npm run submission:check`.
- [ ] Run `npm run demo:generate` once and commit only if the deterministic fixture artifacts legitimately changed.
- [ ] Run `npm run sandbox:generate` once and commit only if the deterministic sandbox artifact legitimately changed.
- [ ] Run `npm run pr:bundle` once and commit only if the deterministic PR artifacts legitimately changed.
- [ ] Run `npm run validate` as the read-only validation suite.

## Live proof and evidence freshness

- [x] Historical disposable-local live DataHub read evidence remains recorded from source commit `baa61387324868b39427030c447b94c2b9599c03`.
- [x] Historical disposable-local live DataHub write-back and durable read-back evidence remain recorded from that same source commit, including the idempotent retry.
- [x] Historical `npm run evidence:check` passed with 10 MCP reads, 6 downstream assets, and 3 verified mutations.
- [~] Recapture disposable-local live DataHub read evidence from the new frozen release SHA is optional; historical proof from `baa61387324868b39427030c447b94c2b9599c03` remains valid.
- [~] Recapture disposable-local live DataHub write-back and durable read-back evidence from the frozen release SHA is optional; historical proof from `baa61387324868b39427030c447b94c2b9599c03` remains valid.
- [x] Run `npm run evidence:check` on the final branch to validate committed artifact integrity; the proof remains visibly synthetic-local and separate from fixture impact, production evidence, and final-head hosted proof.

## Generated bundle execution

- [ ] Generate isolated rename, type-change, and drop dbt projects from the exact final SHA.
- [ ] Run `dbt parse`, `dbt compile`, `dbt run`, and `dbt test` with `dbt-core` and `dbt-duckdb` for all three paths.
- [ ] Confirm the generator consumes and records the complete captured schema snapshot, resolves output-name collisions, and derives tests only from explicit field constraints.
- [ ] Commit the machine-readable real-dbt evidence artifact and confirm it names the exact generator input and final SHA.
- [ ] Reproduce the same real-dbt proof in CI; conformance-only sandbox evidence cannot close this gate.

## Hosted and container proof

- [x] Historical candidate SHA `c984eeba449d54d49fb4228b22835933fb7db98e` already has GitHub Actions run `30766641380`: `https://github.com/zyganali-glitch/ContextSeal/actions/runs/30766641380`.
- [x] Pre-video main candidate `7f24388059e8a12872f48c214ebd2cac82811a7d` has ContextSeal CI run `31246557467` PASS: validate Node 20 PASS, validate Node 24 PASS, dbt-proof PASS, container-smoke PASS, submission PASS — `https://github.com/zyganali-glitch/ContextSeal/actions/runs/31246557467`.
- [x] Pre-video main candidate `7f24388059e8a12872f48c214ebd2cac82811a7d` has Deploy Judge Demo run `31246557473` PASS: build PASS, deploy PASS, Pages `submission:check` PASS — `https://github.com/zyganali-glitch/ContextSeal/actions/runs/31246557473`.
- [ ] Record the GitHub Actions run URL or ID for the new frozen release SHA (post-docs-merge) in the immutable GitHub Release.
- [ ] Record the Node 20 validation result on the new frozen release SHA.
- [ ] Record the Node 24 validation result on the new frozen release SHA.
- [ ] Record the Python setup and fail-closed DataHub safety-test result on the new frozen release SHA.
- [ ] Record the container-smoke result on the new frozen release SHA.
- [ ] Record the GitHub Pages workflow run URL or ID for that same frozen release SHA.
- [ ] Record the live GitHub Pages URL served from that same frozen release SHA.
- [ ] Manually open the deployed Pages URL at desktop and mobile widths before recording the final video.
- [x] Run local Docker build and smoke checks when the daemon is available.
- [ ] Create and inspect the immutable annotated tag `datahub-hackathon-submission-v1` at the new frozen release SHA.
- [ ] Create a GitHub release from that exact tag; do not release from an untagged or later commit.

## AI and review handoff proof

- [x] Historical local Ollama proof remains committed at `examples/outputs/proofs/ollama-ai-proof.json`.
- [ ] Capture one real local Ollama-backed AI artifact on the final SHA, or leave the AI model-backed gate `WARN` with the environment reason.
- [ ] Confirm `examples/outputs/proofs/ollama-ai-proof.json` either comes from that final SHA or is explicitly refreshed from it.
- [ ] Confirm the committed AI input/output artifacts still match the deterministic demo run.
- [ ] Confirm the committed PR body, checklist, and payload still match the deterministic PR bundle generator.
- [ ] Confirm the optional draft PR path was either dry-run validated or executed live with a human-approved token.

## Submission assets

- [x] Record a playable public YouTube demo URL showing the functioning app in under three minutes: `https://www.youtube.com/watch?v=ckhx5X1QQwo`, actual edited runtime approximately 2:05 (verified public on 2026-08-09).
- [x] Submit the Devpost entry: `https://devpost.com/software/contextseal` is publicly submitted. Per the actual chronology, the Devpost entry and the public video were completed before this final repository release closure; the immutable GitHub Release records the exact final release SHA that closes the repository identity.
- [x] Commit the four final submission screenshots under `docs/assets/devpost/` with stable lowercase repository-safe filenames.
- [x] Confirm the Apache-2.0 license is detected and visible in the public repository's GitHub About surface (`Apache-2.0`, verified 2026-07-22).
- [x] Freeze README, judging docs, evidence docs, and Turkish helper surfaces against the same final truth (this final docs truth-sync commit).
- [x] Confirm upstream PR #35 is described only as `OPEN / NOT MERGED / AWAITING MAINTAINER REVIEW`; public GitHub API verification on 2026-08-09 shows state `open`, `merged: false`.

## Intentional non-goals

- [ ] Leave production warehouse execution `NOT_RUN` unless named evidence exists.
- [ ] Leave customer impact `NOT_RUN` unless named evidence exists.
- [ ] Do not freeze the submission while the mandatory real dbt bundle execution proof is `NOT_RUN` or `FAIL`.
