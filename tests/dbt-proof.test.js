import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { sha256 } from "../src/core/hash.js";
import {
  DBT_CORE_VERSION,
  DBT_DUCKDB_VERSION,
  DBT_PROOF_BOUNDARY,
  buildDbtProofScenarios,
  resolveEvidencePath,
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
  const typeChange = scenarios.find((scenario) => scenario.request.changeType === "type_change");
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
        id: "type_change_invalid_cast",
        changeType: typeChange.request.changeType,
        expectedResult: "FAIL_CLOSED",
        status: "PASS",
        generatedModelName: typeChange.generatedModelName,
        generatedTests: typeChange.generatedTests,
        generatedDataTestCount: typeChange.generatedDataTestCount,
        generatedFileHashes: typeChange.generatedFileHashes,
        commands: [
          { name: "dbt parse", exitCode: 0 },
          { name: "dbt compile", exitCode: 0 },
          { name: "dbt run", exitCode: 0 },
          { name: "dbt test", exitCode: 1 }
        ],
        checks: {
          canonicalModelIdentity: true,
          invalidCastDataTestObserved: true,
          failureObserved: true
        }
      },
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

test("dbt proof validator rejects an invalid-cast safety scenario without a failing dbt test", () => {
  const scenarios = buildDbtProofScenarios();
  const proof = makeProof();
  proof.scenarios.find((scenario) => scenario.id === "type_change_invalid_cast").commands.at(-1).exitCode = 0;

  assert.throws(() => validateDbtProofArtifact(proof, scenarios), /must preserve a failing dbt test/);
});

test("dbt proof output supports both repo-relative and CI temporary paths", () => {
  const root = path.join(os.tmpdir(), "contextseal-proof-root");
  const temporaryProof = path.join(os.tmpdir(), "contextseal-ci-proof.json");

  assert.equal(resolveEvidencePath(root, "examples/outputs/dbt/proof.json"), path.join(root, "examples", "outputs", "dbt", "proof.json"));
  assert.equal(resolveEvidencePath(root, temporaryProof), temporaryProof);
});
