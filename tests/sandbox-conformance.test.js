import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("generated artifact sandbox validates the committed fixture bundle", async () => {
  const { stdout } = await execFileAsync("python", ["scripts/run-generated-sandbox.py"], { encoding: "utf8" });
  assert.match(stdout, /PASS generated artifact sandbox/);
  assert.match(stdout, /4 artifact\(s\) validated/);
});

test("generated artifact sandbox can persist a JSON evidence record", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "contextseal-sandbox-"));
  const evidencePath = path.join(tempDir, "sandbox-evidence.json");
  const { stdout } = await execFileAsync(
    "python",
    ["scripts/run-generated-sandbox.py", "--evidence-output", evidencePath],
    { encoding: "utf8" }
  );

  assert.match(stdout, /PASS generated artifact sandbox/);
  const payload = JSON.parse(await readFile(evidencePath, "utf8"));
  assert.equal(payload.status, "PASS");
  assert.equal(payload.artifactCount, 4);
  assert.equal(payload.manifestVersion, "1.0");
  assert.equal(payload.manifestPath, "examples/outputs/generated/ARTIFACT_MANIFEST.json");
  assert.equal(payload.artifacts[0].path, "generated/models/gold_customers_contextseal.sql");
});