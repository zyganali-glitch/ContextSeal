import path from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateEvidenceBundle } from "./validate-evidence.js";

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
if (run.writeback?.mutationReceipts?.length !== 3 || run.writeback.mutationReceipts.some((item) => item.status !== "PASS")) {
  throw new Error("Latest live run does not contain three successful bounded write-back operations.");
}
if (run.writeback?.readback?.state !== "PASS") {
  throw new Error("Latest live run does not contain a complete PASS durable read-back.");
}

const output = {
  evidenceBoundary: "Disposable local DataHub with synthetic ContextSeal metadata; no production or customer data.",
  exportedAt: new Date().toISOString(),
  run
};
const outputPath = path.join(root, "examples", "outputs", "live-datahub-writeback-evidence.json");
const [readEvidence, policy] = await Promise.all([
  readFile(path.join(root, "examples", "outputs", "live-datahub-read-evidence.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "config", "policy.json"), "utf8").then(JSON.parse)
]);
validateEvidenceBundle({ readEvidence, writebackEvidence: output, policy });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`PASS exported and structurally verified ${run.runId} -> ${path.relative(root, outputPath)}`);
