import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeChange, decideRun } from "../src/core/workflow.js";
import { enrichRunWithAi } from "../src/ai/adapter.js";

const FIXTURE_OBSERVED_AT = "2026-07-22T06:39:36.459Z";
const FIXTURE_ANALYZE_AT = "2026-07-22T06:39:36.461Z";
const FIXTURE_DECIDE_AT = "2026-07-22T06:39:36.469Z";

function parseArgs(argv) {
  const options = { check: false };
  for (const arg of argv) {
    if (arg === "--check") options.check = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

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

function jsonText(value, trailingNewline = false) {
  const serialized = JSON.stringify(value, null, 2);
  return trailingNewline ? `${serialized}\n` : serialized;
}

async function buildExpectedOutputs(root) {
  const policy = JSON.parse(await readFile(path.join(root, "config/policy.json"), "utf8"));
  const request = JSON.parse(await readFile(path.join(root, "examples/retail-change-request.json"), "utf8"));
  const context = JSON.parse(await readFile(path.join(root, "examples/retail-context-graph.json"), "utf8"));
  context.observedAt = FIXTURE_OBSERVED_AT;
  const run = await enrichRunWithAi(analyzeChange({
    request,
    context,
    policy,
    mode: "fixture",
    now: new Date(FIXTURE_ANALYZE_AT)
  }));
  const approved = decideRun(run, {
    decision: "APPROVE",
    reviewer: "demo-reviewer",
    note: "Approved safe expand-migrate-contract scope only.",
    scopeAccepted: true
  }, new Date(FIXTURE_DECIDE_AT));

  const outputs = new Map([
    ["examples/outputs/demo-certification.json", jsonText(approved)],
    ["examples/outputs/generated/ai/contextseal-ai-input.json", jsonText(run.aiGroundingInput, true)],
    ["examples/outputs/generated/ai/contextseal-ai-output.json", jsonText(run.ai, true)],
    ["examples/outputs/generated/ai/contextseal-ai-output.md", `${buildAiOutputMarkdown(run)}\n`],
    ["examples/outputs/generated/ARTIFACT_MANIFEST.json", jsonText(approved.artifacts.manifest, true)],
    ["public/demo-data.json", jsonText({ analyzed: run, approved, aiGroundingInput: run.aiGroundingInput })]
  ]);

  for (const file of approved.artifacts.files) {
    outputs.set(path.posix.join("examples/outputs", file.path.replaceAll("\\", "/")), file.content);
  }

  return { run, approved, outputs };
}

async function writeOutputs(root, outputs) {
  for (const [relativePath, content] of outputs) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

async function assertOutputs(root, outputs) {
  const mismatches = [];

  for (const [relativePath, expected] of outputs) {
    try {
      const actual = await readFile(path.join(root, relativePath), "utf8");
      if (actual !== expected) mismatches.push(relativePath);
    } catch (error) {
      if (error?.code === "ENOENT") mismatches.push(relativePath);
      else throw error;
    }
  }

  if (mismatches.length) {
    throw new Error(`Committed demo artifacts differ from deterministic generation: ${mismatches.join(", ")}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const root = path.resolve(".");
const { run, approved, outputs } = await buildExpectedOutputs(root);

if (options.check) {
  await assertOutputs(root, outputs);
  console.log(`PASS demo check ${approved.runId}: committed fixture artifacts match deterministic generation`);
} else {
  await writeOutputs(root, outputs);
  console.log(`PASS demo ${approved.runId}: ${approved.impact.counts.total} impacted, risk ${approved.risk.score}, passport ${approved.passport.passportId}`);
}
