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

  assert.match(files[0], /OPEN \/ NOT_MERGED \/ NO MAINTAINER REVIEW RECORDED YET/);
  assert.doesNotMatch(files[0], /ADD_PUBLIC_YOUTUBE_URL/);
});

test("evidence manifest exposes the final truth-lock columns and required pending rows", async () => {
  const manifest = await readFile("docs/EVIDENCE_MANIFEST.md", "utf8");

  assert.match(manifest, /\| Claim \| State \| Freshness \| Exact source \/ implementation identity \| Evidence artifact or run \| Boundary \|/);
  for (const row of [
    "Real dbt bundle execution works for rename, type-change, drop, and collision handling",
    "Recorded local Ollama proof exists separately from deterministic demo artifacts",
    "Exact final-head CI result is recorded from the frozen submission SHA",
    "Exact final-head Pages result is recorded from the frozen submission SHA",
    "Public final demo video URL is recorded",
    "Devpost submission is frozen against the exact final SHA",
    "Production warehouse SQL executed",
    "Customer impact measured"
  ]) {
    assert.match(manifest, new RegExp(row.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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
