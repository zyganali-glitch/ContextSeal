import path from "node:path";
import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { validateEvidenceBundle } from "./validate-evidence.js";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runsDirectory = path.join(root, ".contextseal", "runs");
const candidates = [];
for (const filename of await readdir(runsDirectory)) {
  if (!filename.endsWith(".json")) continue;
  const run = JSON.parse(await readFile(path.join(runsDirectory, filename), "utf8"));
  if (run.state === "CERTIFIED_AND_WRITTEN_BACK" && run.mode === "datahub") candidates.push(run);
}
candidates.sort((a, b) => Date.parse(b.writeback?.at || b.createdAt) - Date.parse(a.writeback?.at || a.createdAt));
const run = candidates[0];
if (!run) throw new Error("No completed live DataHub run exists.");
const firstReceipts = run.writeback?.mutationReceipts || [];
const secondReceipts = run.writeback?.secondRun?.mutationReceipts || [];
if (firstReceipts.length !== 3 || firstReceipts.some((item) => item.status !== "PASS" || item.action !== "APPLIED")) {
  throw new Error("Latest live run does not contain three applied bounded write-back operations.");
}
if (secondReceipts.length !== 3 || secondReceipts.some((item) => item.status !== "PASS" || item.action !== "SKIPPED")) {
  throw new Error("Latest live run does not contain three skipped idempotent retry operations.");
}
if (run.writeback?.readback?.state !== "PASS" || run.writeback?.secondRun?.readback?.state !== "PASS") {
  throw new Error("Latest live run does not contain complete PASS durable read-backs for both attempts.");
}

const [readEvidence, policy, revision] = await Promise.all([
  readFile(path.join(root, "examples", "outputs", "live-datahub-read-evidence.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "config", "policy.json"), "utf8").then(JSON.parse),
  execFileAsync("git", ["rev-parse", "--verify", "HEAD"], { cwd: root, windowsHide: true })
]);
const commitSha = revision.stdout.trim().toLowerCase();
if (!/^[a-f0-9]{40}$/.test(commitSha)) throw new Error("Unable to capture an exact Git commit SHA for the live evidence export.");
const exportedAt = new Date().toISOString();
const output = {
  evidenceBoundary: "Disposable local DataHub with synthetic ContextSeal metadata; no production or customer data.",
  exportedAt,
  proofProvenance: {
    capturedAt: exportedAt,
    commitSha,
    targetUrn: run.request.targetUrn,
    rawEvidenceHash: run.liveEvidence.rawEvidenceHash,
    finalReadRawEvidenceHash: readEvidence.rawEvidenceHash,
    mcp: run.liveEvidence.mcp,
    tools: run.liveEvidence.tools,
    finalReadMcp: readEvidence.mcp,
    finalReadTools: readEvidence.tools,
    idempotency: {
      strategy: run.writeback.idempotency?.strategy,
      state: run.writeback.idempotency?.state,
      firstRunActions: Object.fromEntries(firstReceipts.map((receipt) => [receipt.tool, receipt.action])),
      secondRunActions: Object.fromEntries(secondReceipts.map((receipt) => [receipt.tool, receipt.action]))
    }
  },
  run
};
const outputPath = path.join(root, "examples", "outputs", "live-datahub-writeback-evidence.json");
validateEvidenceBundle({ readEvidence, writebackEvidence: output, policy });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`PASS exported and structurally verified ${run.runId} -> ${path.relative(root, outputPath)}`);
