import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeChange, decideRun } from "../src/core/workflow.js";
import { enrichRunWithAi } from "../src/ai/adapter.js";

function appendBullets(lines, items) {
  for (const item of items || []) lines.push(`- ${item}`);
}

function buildAiOutputMarkdown(run) {
  const ai = run.ai || {};
  const lines = [
    "# ContextSeal AI Companion Output",
    "",
    `- Run ID: ${run.runId}`,
    `- Status: ${ai.status || "NOT_RUN"}`,
    `- Runtime: ${ai.runtime || "unknown"}`,
    `- Model: ${ai.model || "unknown"}`,
    `- Disclaimer: ${ai.disclaimer || "Explanation only. Deterministic ContextSeal evidence remains authoritative."}`
  ];

  if (ai.reason) lines.push(`- Reason: ${ai.reason}`);

  lines.push("", "## Structured output", "");
  if (!ai.output) {
    lines.push("No model-authored structured output is available for this run.");
    return lines.join("\n");
  }

  lines.push("### Owner alert", "", `Title: ${ai.output.ownerAlert.title}`, ai.output.ownerAlert.summary, "");
  appendBullets(lines, ai.output.ownerAlert.bullets);

  lines.push("", "### Migration rationale", "", ai.output.migrationRationale.summary, "");
  appendBullets(lines, ai.output.migrationRationale.safeguards);

  lines.push(
    "",
    "### Reviewer note draft",
    "",
    `Subject: ${ai.output.reviewerNoteDraft.subject}`,
    ai.output.reviewerNoteDraft.body,
    "",
    "### Next step guidance",
    "",
    "Immediate actions:"
  );
  appendBullets(lines, ai.output.nextStepGuidance.immediateActions);
  lines.push("", "After approval:");
  appendBullets(lines, ai.output.nextStepGuidance.afterApproval);
  return lines.join("\n");
}

const root = path.resolve(".");
const policy = JSON.parse(await readFile(path.join(root, "config/policy.json"), "utf8"));
const request = JSON.parse(await readFile(path.join(root, "examples/retail-change-request.json"), "utf8"));
const context = JSON.parse(await readFile(path.join(root, "examples/retail-context-graph.json"), "utf8"));
context.observedAt = new Date().toISOString();
const run = await enrichRunWithAi(analyzeChange({ request, context, policy, mode: "fixture" }));
const approved = decideRun(run, {
  decision: "APPROVE",
  reviewer: "demo-reviewer",
  note: "Approved safe expand-migrate-contract scope only.",
  scopeAccepted: true
});
await mkdir(path.join(root, "examples/outputs"), { recursive: true });
await writeFile(path.join(root, "examples/outputs/demo-certification.json"), JSON.stringify(approved, null, 2));
await mkdir(path.join(root, "examples/outputs/generated/ai"), { recursive: true });
await mkdir(path.join(root, "examples/outputs/generated"), { recursive: true });
await writeFile(path.join(root, "examples/outputs/generated/ai/contextseal-ai-input.json"), `${JSON.stringify(run.aiGroundingInput, null, 2)}\n`);
await writeFile(path.join(root, "examples/outputs/generated/ai/contextseal-ai-output.json"), `${JSON.stringify(run.ai, null, 2)}\n`);
await writeFile(path.join(root, "examples/outputs/generated/ai/contextseal-ai-output.md"), `${buildAiOutputMarkdown(run)}\n`);
await writeFile(path.join(root, "examples/outputs/generated/ARTIFACT_MANIFEST.json"), `${JSON.stringify(approved.artifacts.manifest, null, 2)}\n`);
await writeFile(path.join(root, "public/demo-data.json"), JSON.stringify({ analyzed: run, approved, aiGroundingInput: run.aiGroundingInput }, null, 2));
for (const file of approved.artifacts.files) {
  const target = path.join(root, "examples/outputs", file.path);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, file.content);
}
console.log(`PASS demo ${approved.runId}: ${approved.impact.counts.total} impacted, risk ${approved.risk.score}, passport ${approved.passport.passportId}`);
