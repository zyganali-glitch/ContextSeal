import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("live setup wraps the change request for the server contract", async () => {
  const setup = await readFile("docs/LIVE_DATAHUB_SETUP.md", "utf8");

  assert.match(setup, /\$request = Get-Content examples\/retail-change-request\.json -Raw \| ConvertFrom-Json/);
  assert.match(setup, /\$body = @\{ request = \$request \} \| ConvertTo-Json -Depth 10/);
  assert.match(setup, /Authorization = \"Bearer <CONTEXTSEAL_OPERATOR_TOKEN>\"/);
  assert.doesNotMatch(setup, /\$body = Get-Content examples\/retail-change-request\.json -Raw/);
});

test("live-mode docs and environment surfaces pin the MCP launcher and describe the operator bearer contract", async () => {
  const files = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("README.tr.md", "utf8"),
    readFile("docs/LIVE_DATAHUB_SETUP.md", "utf8"),
    readFile("docs/tr/CANLI_DATAHUB_KURULUMU.md", "utf8"),
    readFile("AGENT_ENVIRONMENT_AND_API.md", "utf8"),
    readFile(".env.example", "utf8")
  ]);

  for (const content of files) {
    assert.match(content, /CONTEXTSEAL_OPERATOR_TOKEN/);
    assert.match(content, /CONTEXTSEAL_ALLOWED_TARGET_URNS/);
    assert.match(content, /mcp-server-datahub@0\.6\.0/);
    assert.doesNotMatch(content, /mcp-server-datahub@latest/);
  }

  for (const content of files.slice(0, 5)) {
    assert.match(content, /Authorization: Bearer <CONTEXTSEAL_OPERATOR_TOKEN>|Authorization = \"Bearer <CONTEXTSEAL_OPERATOR_TOKEN>\"/);
  }
});

test("submission truth surfaces no longer use the old PR review wording or the public video placeholder", async () => {
  const files = await Promise.all([
    readFile("docs/DEVPOST_SUBMISSION.md", "utf8"),
    readFile("docs/MAINTAINER_OUTREACH.md", "utf8"),
    readFile("docs/DATAHUB_SKILL_CONTRIBUTION.md", "utf8"),
    readFile("docs/PRE_SUBMISSION_CHECKLIST.md", "utf8")
  ]);

  for (const content of files) {
    assert.doesNotMatch(content, /OPEN \/ REVIEW_REQUIRED \/ NOT_MERGED/);
    assert.doesNotMatch(content, /OPEN \/ READY_FOR_REVIEW \/ NOT_MERGED/);
  }

  for (const content of files) {
    assert.doesNotMatch(content, /OPEN \/ NOT_MERGED \/ NO MAINTAINER REVIEW RECORDED YET/);
    assert.match(content, /OPEN \/ NOT MERGED \/ AWAITING MAINTAINER REVIEW/);
  }
  assert.doesNotMatch(files[0], /ADD_PUBLIC_YOUTUBE_URL/);
});

test("evidence manifest exposes the final truth-lock columns and required pending rows", async () => {
  const manifest = await readFile("docs/EVIDENCE_MANIFEST.md", "utf8");

  assert.match(manifest, /\| Claim \| State \| Freshness \| Exact source \/ implementation identity \| Evidence artifact or run \| Boundary \|/);
  for (const row of [
    "Real dbt bundle execution works for rename, type-change, drop, and collision handling",
    "Recorded local Ollama proof exists separately from deterministic demo artifacts",
    "Candidate CI proof is recorded for the pre-freeze submission candidate",
    "Exact frozen final-head CI is recorded from the release SHA",
    "Exact frozen final-head Pages is recorded from the release SHA",
    "Public final demo video URL is recorded",
    "Devpost submission is frozen against the exact final SHA",
    "Production warehouse SQL executed",
    "Customer impact measured"
  ]) {
    assert.match(manifest, new RegExp(row.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("pages workflow deploys only after submission check and tracked-tree verification", async () => {
  const workflow = await readFile(".github/workflows/pages.yml", "utf8");

  assert.match(workflow, /npm run submission:check/);
  assert.match(workflow, /git diff --exit-code/);
  assert.doesNotMatch(workflow, /^\s*-\s*run:\s*npm run validate\s*$/m);
});

test("judge-facing docs distinguish the recorded write-back proof from fixture impact", async () => {
  const [readme, devpost, boundary, judgePath, judgingMap, audit, plan] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("docs/DEVPOST_SUBMISSION.md", "utf8"),
    readFile("docs/EVIDENCE_BOUNDARY.md", "utf8"),
    readFile("docs/JUDGE_TEST_PATH.md", "utf8"),
    readFile("docs/JUDGING_MAP.md", "utf8"),
    readFile("docs/CLAIM_AUDIT.md", "utf8"),
    readFile("plans/PLAN_20260721_contextseal_hackathon_win.md", "utf8")
  ]);

  for (const content of [readme, devpost, boundary, judgePath, judgingMap, audit]) {
    assert.match(content, /synthetic-local|synthetic metadata/i);
    assert.match(content, /fixture/i);
  }
  assert.match(readme, /three `APPLIED` bounded write-backs, three `SKIPPED` verify-then-skip retries/);
  assert.match(devpost, /three `APPLIED` operations, and three `SKIPPED` idempotent retry operations/);
  assert.match(judgePath, /recorded `PASS` export/);
  assert.match(plan, /Current Write-Back Export Gate[\s\S]*?\| `PASS` \|/);
  assert.match(plan, /Final Video Duration Gate[\s\S]*?\| `NOT_RUN` \|/);
  assert.doesNotMatch(plan, /Final 115-125 second/);
});

test("submission docs lock the canonical skill and immutable same-SHA release order", async () => {
  const [checklist, manifest, readme, contribution] = await Promise.all([
    readFile("docs/PRE_SUBMISSION_CHECKLIST.md", "utf8"),
    readFile("docs/EVIDENCE_MANIFEST.md", "utf8"),
    readFile("README.md", "utf8"),
    readFile("docs/DATAHUB_SKILL_CONTRIBUTION.md", "utf8")
  ]);

  for (const content of [checklist, manifest]) {
    assert.match(content, /datahub-hackathon-submission-v1/);
    assert.match(content, /GitHub release/i);
    assert.match(content, /same SHA|that exact SHA/i);
  }
  assert.match(readme, /datahub-schema-change-certification/);
  assert.match(readme, /legacy compatibility alias/i);
  assert.match(contribution, /only canonical package name/);
  assert.match(contribution, /must not fork the canonical workflow/);
});

test("final video docs require the longer badge-visible recorded-proof path", async () => {
  const [script, turkishGuide, devpost, turkishDevpost] = await Promise.all([
    readFile("docs/DEMO_SCRIPT.md", "utf8"),
    readFile("docs/tr/DEMO_VIDEO_CEKIM_REHBERI.md", "utf8"),
    readFile("docs/DEVPOST_SUBMISSION.md", "utf8"),
    readFile("docs/tr/DEVPOST_BASVURU_REHBERI.md", "utf8")
  ]);

  assert.match(script, /2 minutes 20 seconds/);
  assert.match(script, /2:15 to 2:30/);
  assert.match(script, /fixture badge visible/);
  assert.match(script, /RECORDED LIVE-LOCAL PROOF/);
  assert.match(script, /12-step Agent Run Trace/);
  assert.doesNotMatch(script, /1:40 Target|100-second judge demo/);
  assert.match(turkishGuide, /2 dakika 15 saniye ile 2 dakika 30 saniye/);
  assert.match(turkishGuide, /RECORDED LIVE-LOCAL PROOF/);
  assert.doesNotMatch(turkishGuide, /90-110 saniye|100 saniyelik/);
  for (const content of [devpost, turkishDevpost]) {
    assert.match(content, /30-second judge summary/);
    assert.match(content, /In the 2:20 judge demo/);
  }
});

test("submission docs share the hardened five-tool live read contract", async () => {
  const files = await Promise.all([
    readFile("docs/EVIDENCE_BOUNDARY.md", "utf8"),
    readFile("docs/JUDGING_MAP.md", "utf8"),
    readFile("docs/DEVPOST_SUBMISSION.md", "utf8")
  ]);
  const tools = ["get_entities", "list_schema_fields", "get_lineage", "get_lineage_paths_between", "get_dataset_queries"];

  for (const content of files) {
    for (const tool of tools) assert.match(content, new RegExp(`\\b${tool}\\b`));
  }
});

test("read-only validation wording does not claim artifact regeneration", async () => {
  const [readme, judgingMap] = await Promise.all([
    readFile("README.md", "utf8"),
    readFile("docs/JUDGING_MAP.md", "utf8")
  ]);

  for (const content of [readme, judgingMap]) {
    const sentence = content.split("\n").find((line) => line.includes("npm run validate") && line.includes("read-only"));
    assert.ok(sentence);
    assert.doesNotMatch(sentence, /regeneration|refresh/i);
  }
});
