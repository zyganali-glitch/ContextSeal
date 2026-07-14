import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeChange, decideRun } from "../src/core/workflow.js";

const root = path.resolve(".");
const policy = JSON.parse(await readFile(path.join(root, "config/policy.json"), "utf8"));
const request = JSON.parse(await readFile(path.join(root, "examples/retail-change-request.json"), "utf8"));
const context = JSON.parse(await readFile(path.join(root, "examples/retail-context-graph.json"), "utf8"));
context.observedAt = new Date().toISOString();
const run = analyzeChange({ request, context, policy, mode: "fixture" });
const approved = decideRun(run, {
  decision: "APPROVE",
  reviewer: "demo-reviewer",
  note: "Approved safe expand-migrate-contract scope only.",
  scopeAccepted: true
});
await mkdir(path.join(root, "examples/outputs"), { recursive: true });
await writeFile(path.join(root, "examples/outputs/demo-certification.json"), JSON.stringify(approved, null, 2));
await writeFile(path.join(root, "public/demo-data.json"), JSON.stringify({ analyzed: run, approved }, null, 2));
for (const file of approved.artifacts.files) {
  const target = path.join(root, "examples/outputs", file.path);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, file.content);
}
console.log(`PASS demo ${approved.runId}: ${approved.impact.counts.total} impacted, risk ${approved.risk.score}, passport ${approved.passport.passportId}`);
