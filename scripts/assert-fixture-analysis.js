import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertRenameArtifactContract } from "../src/core/artifact-contract.js";

async function main() {
  const [analysisPath] = process.argv.slice(2);
  if (!analysisPath) throw new Error("Usage: node scripts/assert-fixture-analysis.js <analysis-json-path>");
  const analysis = JSON.parse(await readFile(path.resolve(analysisPath), "utf8"));
  if (analysis.state !== "AWAITING_HUMAN") throw new Error("Fixture analysis must remain AWAITING_HUMAN.");
  if (analysis.evidence?.find((item) => item.claim === "DataHub context retrieved")?.state !== "FIXTURE") {
    throw new Error("Fixture analysis must retain its FIXTURE DataHub context boundary.");
  }
  assertRenameArtifactContract(analysis.artifacts?.files);
  console.log("PASS fixture analysis: five required rename artifact kinds are present.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
