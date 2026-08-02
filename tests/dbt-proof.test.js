import test from "node:test";
import assert from "node:assert/strict";
import { sha256 } from "../src/core/hash.js";
import {
  DBT_CORE_VERSION,
  DBT_DUCKDB_VERSION,
  DBT_PROOF_BOUNDARY,
  buildDbtProofScenarios,
  validateDbtProofArtifact
} from "../scripts/run-dbt-proof.js";

function scenarioHash(scenarios) {
  return sha256(scenarios.map((scenario) => ({ id: scenario.id, generatedFileHashes: scenario.generatedFileHashes })));
}

function makeScenarioResult(scenario) {
  return {
    id: scenario.id,
    changeType: scenario.request.changeType,
    expectedResult: "PASS",
    status: "PASS",
    generatedModelName: scenario.generatedModelName,
    generatedTests: scenario.generatedTests,
    generatedDataTestCount: scenario.generatedDataTestCount,
    generatedFileHashes: scenario.generatedFileHashes,
    commands: [
      { name: "dbt parse", exitCode: 0 },
      { name: "dbt compile", exitCode: 0 },
      { name: "dbt run", exitCode: 0 },
      { name: "dbt test", exitCode: 0 }
    ],
    expectedColumns: scenario.expectedColumns,
    actualColumns: scenario.expectedColumns,
    expectedRows: scenario.expectedRows,
    actualRows: scenario.expectedRows,
    rollbackExpectedColumns: scenario.rollbackExpectedColumns,
    rollbackActualColumns: scenario.rollbackExpectedColumns,
    checks: {
      canonicalModelIdentity: true,
      notNullGenerated: scenario.nullableShouldGenerateNotNull,
      testsObserved: true
    }
  };
}

function makeProof() {
  const scenarios = buildDbtProofScenarios();
  return {
    status: "PASS",
    evidenceBoundary: DBT_PROOF_BOUNDARY,
    toolchain: {
      launcher: "uv",
      pythonVersion: "3.11.9",
      dbtCoreVersion: DBT_CORE_VERSION,
      dbtDuckdbVersion: DBT_DUCKDB_VERSION
    },
    sourceImplementation: {
      gitHead: "a7b6f659fd7f904585df39c5e863aacfbfb353ad",
      generatedArtifactSetSha256: scenarioHash(scenarios)
    },
    scenarios: [
      ...scenarios.map(makeScenarioResult),
      {
        id: "model_name_collision",
        changeType: scenarios[0].request.changeType,
        expectedResult: "FAIL_CLOSED",
        status: "PASS",
        generatedModelName: scenarios[0].generatedModelName,
        generatedTests: scenarios[0].generatedTests,
        generatedDataTestCount: scenarios[0].generatedDataTestCount,
        generatedFileHashes: scenarios[0].generatedFileHashes,
        commands: [{ name: "dbt parse", exitCode: 2 }],
        checks: {
          canonicalModelIdentity: true,
          failureObserved: true
        }
      }
    ]
  };
}

test("dbt proof validator accepts the required pinned artifact shape", () => {
  const scenarios = buildDbtProofScenarios();
  const proof = makeProof();
  assert.equal(validateDbtProofArtifact(proof, scenarios).status, "PASS");
});

test("dbt proof validator rejects PASS artifacts that contain failed execution steps", () => {
  const scenarios = buildDbtProofScenarios();
  const proof = makeProof();
  proof.scenarios[0].commands[2].exitCode = 1;

  assert.throws(() => validateDbtProofArtifact(proof, scenarios), /non-zero exit code/);
});