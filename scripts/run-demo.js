import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeChange, decideRun } from "../src/core/workflow.js";

const root = path.resolve(".");
const policy = JSON.parse(await readFile(path.join(root, "config/policy.json"), "utf8"));
const request = JSON.parse(await readFile(path.join(root, "examples/retail-change-request.json"), "utf8"));
const context = JSON.parse(await readFile(path.join(root, "examples/retail-context-graph.json"), "utf8"));
const observedAt = Date.parse(context.observedAt);
if (!Number.isFinite(observedAt)) throw new Error("Fixture context must contain a valid observedAt timestamp.");
const analyzedAt = new Date(observedAt + (30 * 60 * 1_000));
const decidedAt = new Date(observedAt + (32 * 60 * 1_000));
const run = analyzeChange({ request, context, policy, mode: "fixture", now: analyzedAt });
const approved = decideRun(run, {
  decision: "APPROVE",
  reviewer: "demo-reviewer",
  note: "Approved safe expand-migrate-contract scope only.",
  scopeAccepted: true
}, decidedAt);

const outputs = new Map([
  [path.join(root, "examples/outputs/demo-certification.json"), JSON.stringify(approved, null, 2)],
  [path.join(root, "public/demo-data.json"), JSON.stringify({ analyzed: run, approved }, null, 2)]
]);
for (const file of approved.artifacts.files) {
  const target = path.join(root, "examples/outputs", file.path);
  outputs.set(target, file.content);
}

const checkOnly = process.argv.includes("--check");
for (const [target, content] of outputs) {
  if (checkOnly) {
    let committed;
    try { committed = await readFile(target, "utf8"); }
    catch (error) {
      if (error.code === "ENOENT") throw new Error(`Generated demo output is missing: ${path.relative(root, target)}`);
      throw error;
    }
    if (committed !== content) {
      throw new Error(`Generated demo output is stale: ${path.relative(root, target)}. Run npm run demo:generate.`);
    }
    continue;
  }
  await mkdir(path.dirname(target), { recursive: true });
  let existing = null;
  try { existing = await readFile(target, "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing !== content) await writeFile(target, content, "utf8");
}

const action = checkOnly ? "verified" : "generated";
console.log(`PASS demo ${action} ${approved.runId}: ${approved.impact.counts.total} impacted, risk ${approved.risk.score}, passport ${approved.passport.passportId}`);
