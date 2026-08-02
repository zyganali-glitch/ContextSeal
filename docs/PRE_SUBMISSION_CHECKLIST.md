# Pre-Submission Checklist

Updated: 2026-08-02 UTC

This checklist is authoritative for final-head release readiness. Do not claim the hackathon submission is frozen until every required item below is either `PASS` with named evidence or explicitly marked `WARN` or `NOT_RUN` with a direct reason.

## Exact final-head procedure

1. Pick one freeze-candidate commit SHA and stop landing follow-up changes on top of it.
2. Run `npm run prevideo:check` and `npm run submission:check` on that exact checkout; keep the tree clean.
3. Push only that exact SHA to the submission branch or final `main` head.
4. Record the matching GitHub Actions CI run and GitHub Pages deploy for that same SHA before changing any submission surface.
5. Create the immutable annotated tag `datahub-hackathon-submission-v1` at that exact SHA, then push the tag without moving it.
6. Create the GitHub release from that exact annotated tag and link the same-SHA CI, Pages, evidence manifest, and demo video.
7. Only then upload or confirm the public video URL, remove pending submission text, and freeze Devpost.

## Final SHA and tree

- [ ] Record the final Git commit SHA that backs the submission.
- [ ] Confirm `git status --short` is empty.
- [ ] Confirm `git diff --exit-code` passes after the final read-only validation suite.
- [ ] Confirm the pushed branch and any PR point to the same final SHA.

## Local validation contract

- [ ] Run `npm ci --ignore-scripts` on the exact final-head checkout.
- [ ] Run `npm run prevideo:check`.
- [ ] Run `npm run submission:check`.
- [ ] Confirm `git diff --exit-code` still passes immediately after `npm run submission:check`.
- [ ] Run `npm run demo:generate` once and commit only if the deterministic fixture artifacts legitimately changed.
- [ ] Run `npm run sandbox:generate` once and commit only if the deterministic sandbox artifact legitimately changed.
- [ ] Run `npm run pr:bundle` once and commit only if the deterministic PR artifacts legitimately changed.
- [ ] Run `npm run validate` as the read-only validation suite.

## Live proof and evidence freshness

- [x] Recapture disposable-local live DataHub read evidence from source commit `baa61387324868b39427030c447b94c2b9599c03`.
- [x] Recapture disposable-local live DataHub write-back and durable read-back evidence from that same source commit, including the idempotent retry.
- [x] Run `npm run evidence:check`; it passed with 10 MCP reads, 6 downstream assets, and 3 verified mutations.
- [x] Keep the recorded proof visibly synthetic-local and separate from fixture impact, production evidence, and final-head hosted proof.

## Generated bundle execution

- [ ] Generate isolated rename, type-change, and drop dbt projects from the exact final SHA.
- [ ] Run `dbt parse`, `dbt compile`, `dbt run`, and `dbt test` with `dbt-core` and `dbt-duckdb` for all three paths.
- [ ] Confirm the generator consumes and records the complete captured schema snapshot, resolves output-name collisions, and derives tests only from explicit field constraints.
- [ ] Commit the machine-readable real-dbt evidence artifact and confirm it names the exact generator input and final SHA.
- [ ] Reproduce the same real-dbt proof in CI; conformance-only sandbox evidence cannot close this gate.

## Hosted and container proof

- [ ] Push the exact frozen SHA and avoid follow-up commits before hosted proof is recorded.
- [ ] Record the GitHub Actions run URL or ID for that exact SHA.
- [ ] Record the Node 20 validation result on that exact SHA.
- [ ] Record the Node 24 validation result on that exact SHA.
- [ ] Record the Python safety-test result on that exact SHA.
- [ ] Record the container-smoke result on that exact SHA.
- [ ] Record the GitHub Pages workflow run URL or ID for that same SHA.
- [ ] Record the live GitHub Pages URL served from that same SHA.
- [ ] Run local Docker build and smoke checks when the daemon is available.
- [ ] Create and inspect the immutable annotated tag `datahub-hackathon-submission-v1` at the verified SHA.
- [ ] Create a GitHub release from that exact tag; do not release from an untagged or later commit.

## AI and review handoff proof

- [ ] Capture one real local Ollama-backed AI artifact on the final SHA, or leave the AI model-backed gate `WARN` with the environment reason.
- [ ] Confirm `examples/outputs/proofs/ollama-ai-proof.json` either comes from that final SHA or is explicitly refreshed from it.
- [ ] Confirm the committed AI input/output artifacts still match the deterministic demo run.
- [ ] Confirm the committed PR body, checklist, and payload still match the deterministic PR bundle generator.
- [ ] Confirm the optional draft PR path was either dry-run validated or executed live with a human-approved token.

## Submission assets

- [ ] Record a playable public YouTube, Vimeo, or Youku demo URL showing the functioning app in under three minutes.
- [ ] Freeze and submit the Devpost entry against the exact final SHA; remove every placeholder URL.
- [x] Confirm the Apache-2.0 license is detected and visible in the public repository's GitHub About surface (`Apache-2.0`, verified 2026-07-22).
- [ ] Freeze README, judging docs, evidence docs, and Turkish helper surfaces against the same final truth.
- [ ] Confirm upstream PR #35 is described only as `OPEN / NOT MERGED / AWAITING MAINTAINER REVIEW` while the verified public PR remains open with no reviews.

## Intentional non-goals

- [ ] Leave production warehouse execution `NOT_RUN` unless named evidence exists.
- [ ] Leave customer impact `NOT_RUN` unless named evidence exists.
- [ ] Do not freeze the submission while the mandatory real dbt bundle execution proof is `NOT_RUN` or `FAIL`.
