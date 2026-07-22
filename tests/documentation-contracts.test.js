import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("live setup wraps the change request for the server contract", async () => {
  const setup = await readFile("docs/LIVE_DATAHUB_SETUP.md", "utf8");

  assert.match(setup, /\$request = Get-Content examples\/retail-change-request\.json -Raw \| ConvertFrom-Json/);
  assert.match(setup, /\$body = @\{ request = \$request \} \| ConvertTo-Json -Depth 10/);
  assert.doesNotMatch(setup, /\$body = Get-Content examples\/retail-change-request\.json -Raw/);
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
