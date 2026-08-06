import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeChange, decideRun } from "../src/core/workflow.js";
import { assertRenameArtifactContract } from "../src/core/artifact-contract.js";
import { enrichRunWithAi } from "../src/ai/adapter.js";
import { AI_PROOF_PATH, validateAiProof } from "../src/ai/proof.js";
import { loadEnvFile } from "../src/env.js";

const FIXTURE_OBSERVED_AT = "2026-07-22T06:39:36.459Z";
const FIXTURE_ANALYZE_AT = "2026-07-22T06:39:36.461Z";
const FIXTURE_DECIDE_AT = "2026-07-22T06:39:36.469Z";
const RECORDED_LIVE_LOCAL_PROOF_LABEL = "Recorded live-local proof";
const RECORDED_LIVE_LOCAL_PROOF_NOTE = "Recorded disposable-local synthetic DataHub evidence. This page is not connected to a live catalog.";
const STALE_RECORDED_LIVE_LOCAL_PROOF_NOTE = "Historical disposable-local synthetic DataHub evidence. It predates the current provenance and idempotency contract, so this page marks it STALE and is not connected to a live catalog.";

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

async function readOptionalRecordedAiProof(root) {
  try {
    const proof = JSON.parse(await readFile(path.join(root, AI_PROOF_PATH), "utf8"));
    return validateAiProof(proof);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Committed recorded AI proof is invalid: ${error.message}`);
  }
}

function proofState(value) {
  return ["PASS", "WARN", "FAIL", "NOT_RUN", "STALE", "FIXTURE"].includes(value) ? value : "NOT_RUN";
}

function isCurrentWritebackProof(writebackEvidence) {
  const writeback = writebackEvidence?.run?.writeback || {};
  const firstReceipts = Array.isArray(writeback.mutationReceipts) ? writeback.mutationReceipts : [];
  const secondRun = writeback.secondRun || {};
  const secondReceipts = Array.isArray(secondRun.mutationReceipts) ? secondRun.mutationReceipts : [];
  const expectedTools = ["add_structured_properties", "update_description", "save_document"];
  return Boolean(
    writebackEvidence?.proofProvenance
    && writeback.idempotency?.strategy === "VERIFY_THEN_SKIP"
    && writeback.idempotency?.state === "PASS"
    && writeback.readback?.state === "PASS"
    && writeback.readback?.verified?.description?.passportBlockCount === 1
    && writeback.readback?.verified?.relatedDocument?.state === "PASS"
    && secondRun.idempotency?.strategy === "VERIFY_THEN_SKIP"
    && secondRun.idempotency?.state === "PASS"
    && secondRun.readback?.state === "PASS"
    && secondRun.readback?.verified?.description?.passportBlockCount === 1
    && secondRun.readback?.verified?.relatedDocument?.state === "PASS"
    && firstReceipts.length === expectedTools.length
    && secondReceipts.length === expectedTools.length
    && expectedTools.every((tool, index) => firstReceipts[index]?.tool === tool && firstReceipts[index]?.status === "PASS" && firstReceipts[index]?.action === "APPLIED")
    && expectedTools.every((tool, index) => secondReceipts[index]?.tool === tool && secondReceipts[index]?.status === "PASS" && secondReceipts[index]?.action === "SKIPPED")
  );
}

async function readOptionalRecordedLiveProof(root) {
  try {
    const [readEvidence, writebackEvidence] = await Promise.all([
      readFile(path.join(root, "examples", "outputs", "live-datahub-read-evidence.json"), "utf8").then(JSON.parse),
      readFile(path.join(root, "examples", "outputs", "live-datahub-writeback-evidence.json"), "utf8").then(JSON.parse)
    ]);
    const writeback = writebackEvidence?.run?.writeback || {};
    const firstReceipts = Array.isArray(writeback.mutationReceipts) ? writeback.mutationReceipts : [];
    const secondRun = writeback.secondRun || {};
    const secondReceipts = Array.isArray(secondRun.mutationReceipts) ? secondRun.mutationReceipts : [];
    const relatedDocument = writeback.readback?.verified?.relatedDocument || {};
    const typeCounts = new Map((readEvidence.lineageSummary?.entityTypes || []).map((item) => [item?.type, item?.count]));
    const current = isCurrentWritebackProof(writebackEvidence);
    const displayState = (value) => current ? proofState(value) : "STALE";
    const receiptState = (receipt) => current ? proofState(receipt?.status) : "STALE";
    const receiptSummary = (receipt) => ({
      tool: typeof receipt?.tool === "string" ? receipt.tool : "unknown",
      action: typeof receipt?.action === "string" ? receipt.action : "not recorded",
      state: receiptState(receipt)
    });

    return {
      status: current ? proofState(readEvidence.status) : "STALE",
      label: RECORDED_LIVE_LOCAL_PROOF_LABEL,
      note: current ? RECORDED_LIVE_LOCAL_PROOF_NOTE : STALE_RECORDED_LIVE_LOCAL_PROOF_NOTE,
      observedAt: typeof readEvidence.observedAt === "string" ? readEvidence.observedAt : null,
      targetUrn: typeof readEvidence.targetUrn === "string" ? readEvidence.targetUrn : null,
      rawEvidenceHash: typeof readEvidence.rawEvidenceHash === "string" ? readEvidence.rawEvidenceHash : null,
      sourceProvenance: {
        commitSha: typeof writebackEvidence.proofProvenance?.commitSha === "string" ? writebackEvidence.proofProvenance.commitSha : null,
        initialRawEvidenceHash: typeof writebackEvidence.proofProvenance?.rawEvidenceHash === "string" ? writebackEvidence.proofProvenance.rawEvidenceHash : null,
        finalRawEvidenceHash: typeof writebackEvidence.proofProvenance?.finalReadRawEvidenceHash === "string" ? writebackEvidence.proofProvenance.finalReadRawEvidenceHash : null
      },
      mcp: {
        serverName: typeof readEvidence.mcp?.serverInfo?.name === "string" ? readEvidence.mcp.serverInfo.name : null,
        serverVersion: typeof readEvidence.mcp?.serverInfo?.version === "string" ? readEvidence.mcp.serverInfo.version : null,
        launcherPackage: typeof readEvidence.mcp?.launcher?.launcherPackage === "string" ? readEvidence.mcp.launcher.launcherPackage : null
      },
      read: {
        toolCount: Number.isSafeInteger(readEvidence.summary?.toolCount) ? readEvidence.summary.toolCount : null,
        toolNames: Array.isArray(readEvidence.tools) ? readEvidence.tools.filter((tool) => typeof tool === "string") : [],
        downstreamAssetCount: Number.isSafeInteger(readEvidence.summary?.downstreamAssetCount) ? readEvidence.summary.downstreamAssetCount : null,
        queryCount: Number.isSafeInteger(readEvidence.summary?.queryCount) ? readEvidence.summary.queryCount : null,
        entityTypeCounts: Object.fromEntries(["DATASET", "DATA_JOB", "DASHBOARD"].map((type) => [type, Number.isSafeInteger(typeCounts.get(type)) ? typeCounts.get(type) : null])),
        maxHops: Number.isSafeInteger(readEvidence.summary?.maxHops) ? readEvidence.summary.maxHops : null
      },
      writeback: {
        state: displayState(writeback.readback?.state),
        mutationReceiptCount: firstReceipts.length,
        receiptStates: firstReceipts.map(receiptSummary),
        firstRunActions: firstReceipts.map(receiptSummary),
        secondRunActions: secondReceipts.map(receiptSummary),
        durableReadbackState: displayState(writeback.readback?.state),
        idempotencyStrategy: typeof writeback.idempotency?.strategy === "string" ? writeback.idempotency.strategy : "not recorded",
        exactOneDescription: {
          state: displayState(writeback.readback?.verified?.description?.state),
          count: Number.isSafeInteger(writeback.readback?.verified?.description?.passportBlockCount) ? writeback.readback.verified.description.passportBlockCount : null
        },
        exactOneDocument: {
          state: displayState(relatedDocument.state),
          verified: relatedDocument.state === "PASS" ? current : false
        },
        documentBindingState: displayState(relatedDocument.state)
      },
      evidencePaths: [
        "examples/outputs/live-datahub-read-evidence.json",
        "examples/outputs/live-datahub-writeback-evidence.json"
      ]
    };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Committed recorded live-local proof is invalid: ${error.message}`);
  }
}

export async function buildDeterministicFixtureRun(root, { env = process.env, useRuntimeAi = false } = {}) {
  const policy = JSON.parse(await readFile(path.join(root, "config/policy.json"), "utf8"));
  const request = JSON.parse(await readFile(path.join(root, "examples/retail-change-request.json"), "utf8"));
  const context = JSON.parse(await readFile(path.join(root, "examples/retail-context-graph.json"), "utf8"));
  context.observedAt = FIXTURE_OBSERVED_AT;
  const aiEnv = useRuntimeAi ? env : { ...env, CONTEXTSEAL_AI_ENABLED: "false" };
  const run = await enrichRunWithAi(analyzeChange({
    request,
    context,
    policy,
    mode: "fixture",
    now: new Date(FIXTURE_ANALYZE_AT)
  }), { env: aiEnv });
  const approved = decideRun(run, {
    decision: "APPROVE",
    reviewer: "demo-reviewer",
    note: "Approved safe expand-migrate-contract scope only.",
    scopeAccepted: true
  }, new Date(FIXTURE_DECIDE_AT));
  assertRenameArtifactContract(approved.artifacts.files);

  return { run, approved };
}

export async function buildExpectedOutputs(root, { env = process.env } = {}) {
  const { run, approved } = await buildDeterministicFixtureRun(root, { env, useRuntimeAi: false });
  const recordedAiProof = await readOptionalRecordedAiProof(root);
  const recordedLiveProof = await readOptionalRecordedLiveProof(root);

  const outputs = new Map([
    ["examples/outputs/demo-certification.json", jsonText(approved)],
    ["examples/outputs/generated/ai/contextseal-ai-input.json", jsonText(run.aiGroundingInput, true)],
    ["examples/outputs/generated/ai/contextseal-ai-output.json", jsonText(run.ai, true)],
    ["examples/outputs/generated/ai/contextseal-ai-output.md", `${buildAiOutputMarkdown(run)}\n`],
    ["examples/outputs/generated/ARTIFACT_MANIFEST.json", jsonText(approved.artifacts.manifest, true)],
    ["public/demo-data.json", jsonText({ analyzed: run, approved, aiGroundingInput: run.aiGroundingInput, recordedAiProof, recordedLiveProof })]
  ]);

  for (const file of approved.artifacts.files) {
    outputs.set(path.posix.join("examples/outputs", file.path.replaceAll("\\", "/")), file.content);
  }

  return { run, approved, outputs };
}

export async function writeOutputs(root, outputs) {
  for (const [relativePath, content] of outputs) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

export async function assertOutputs(root, outputs) {
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(".");
  const env = { ...process.env };
  await loadEnvFile(root, env);
  const { approved, outputs } = await buildExpectedOutputs(root, { env });

  if (options.check) {
    await assertOutputs(root, outputs);
    console.log(`PASS demo check ${approved.runId}: committed fixture artifacts match deterministic generation`);
  } else {
    await writeOutputs(root, outputs);
    console.log(`PASS demo ${approved.runId}: ${approved.impact.counts.total} impacted, risk ${approved.risk.score}, passport ${approved.passport.passportId}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
