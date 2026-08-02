import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { DBT_PROOF_PATH, validateDbtProofArtifact } from "./run-dbt-proof.js";

async function main() {
  const proof = JSON.parse(await readFile(DBT_PROOF_PATH, "utf8"));
  validateDbtProofArtifact(proof);
  console.log(`PASS real dbt proof artifact: ${DBT_PROOF_PATH} matches the pinned toolchain and current generator outputs`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}