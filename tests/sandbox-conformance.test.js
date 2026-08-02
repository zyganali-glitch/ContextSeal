import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
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

test("generated artifact sandbox check fails closed without rewriting evidence", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "contextseal-sandbox-check-"));
  const outputsRoot = path.join(tempDir, "outputs");
  const generatedRoot = path.join(outputsRoot, "generated");
  const sandboxRoot = path.join(outputsRoot, "sandbox");
  const manifestPath = path.join(generatedRoot, "ARTIFACT_MANIFEST.json");
  const evidencePath = path.join(sandboxRoot, "generated-sandbox-evidence.json");
  const corruptedModelPath = path.join(generatedRoot, "models", "gold_customers_contextseal.sql");

  await cp(path.join("examples", "outputs", "generated"), generatedRoot, { recursive: true });
  await cp(path.join("examples", "outputs", "sandbox"), sandboxRoot, { recursive: true });

  const originalEvidence = await readFile(evidencePath, "utf8");
  await writeFile(corruptedModelPath, "select 1 as broken_model;\n", "utf8");

  await assert.rejects(
    execFileAsync(
      "python",
      [
        "scripts/run-generated-sandbox.py",
        "--check",
        "--manifest",
        manifestPath,
        "--evidence-output",
        evidencePath
      ],
      { encoding: "utf8" }
    ),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, /FAIL generated artifact sandbox/);
      return true;
    }
  );

  const afterEvidence = await readFile(evidencePath, "utf8");
  assert.equal(afterEvidence, originalEvidence);
});