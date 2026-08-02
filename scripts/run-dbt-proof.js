import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { generateArtifacts } from "../src/core/artifacts.js";
import { sha256 } from "../src/core/hash.js";

const execFileAsync = promisify(execFile);

export const DBT_CORE_VERSION = "1.10.5";
export const DBT_DUCKDB_VERSION = "1.10.0";
export const DBT_PROOF_PATH = "examples/outputs/dbt/real-dbt-proof.json";
export const DBT_PROOF_BOUNDARY = "Synthetic DuckDB dbt-core/dbt-duckdb execution for ContextSeal generated bundles; not production warehouse execution.";
const CANONICAL_GENERATED_MODEL_NAME = "gold_customers_contextseal";
const BASE_MODEL_NAME = "gold_customers";

const BASE_ROWS = [
  [1, "ada@example.com", "100", "loyal"],
  [2, "linus@example.com", "250", null],
  [3, "grace@example.com", "375", "beta"]
];
const BASE_SCHEMA_FIELDS = [
  { fieldPath: "customer_id", nativeDataType: "integer", nullable: false, unique: true },
  { fieldPath: "customer_email", nativeDataType: "varchar", nullable: false },
  { fieldPath: "loyalty_points_text", nativeDataType: "varchar", nullable: false },
  { fieldPath: "legacy_segment", nativeDataType: "varchar", nullable: true }
];

function nowIso() {
  return new Date().toISOString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const options = {
    check: false,
    evidenceOutput: DBT_PROOF_PATH
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      options.check = true;
      continue;
    }
    if (arg === "--evidence-output") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value for --evidence-output");
      options.evidenceOutput = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function sqlLiteral(value) {
  if (value == null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function toPosixPath(value) {
  return String(value).replaceAll("\\", "/");
}

function baseModelSql() {
  const values = BASE_ROWS
    .map((row) => `(${row.map(sqlLiteral).join(", ")})`)
    .join(",\n      ");

  return [
    "select *",
    "from (",
    "  values",
    `      ${values}`,
    ") as seed(customer_id, customer_email, loyalty_points_text, legacy_segment)"
  ].join("\n") + "\n";
}

function baseImpactFor(schemaField) {
  return {
    target: {
      type: "DATASET",
      platform: "duckdb",
      schemaFields: BASE_SCHEMA_FIELDS.map((field) => field.fieldPath === schemaField.fieldPath ? schemaField : field)
    },
    counts: {
      total: 2,
      highCriticality: 1,
      byType: { DATASET: 1, DASHBOARD: 1 }
    },
    impacted: [
      {
        urn: "urn:li:dataset:(urn:li:dataPlatform:duckdb,retail.analytics.customer_segments,PROD)",
        name: "customer_segments",
        type: "DATASET",
        owners: ["urn:li:corpgroup:growth-data"],
        hops: 1,
        path: [BASE_MODEL_NAME, "customer_segments"]
      },
      {
        urn: "urn:li:dashboard:(looker,executive_customer_health)",
        name: "Executive Customer Health",
        type: "DASHBOARD",
        owners: ["urn:li:corpgroup:customer-success"],
        hops: 2,
        path: [BASE_MODEL_NAME, "customer_segments", "executive_customer_health"]
      }
    ]
  };
}

function baseRisk() {
  return {
    verdict: "BLOCKED",
    score: 80,
    findings: [
      {
        code: "DOWNSTREAM_DEPENDENCY",
        severity: "HIGH",
        weight: 50,
        message: "Downstream assets still read the source field.",
        evidence: ["customer_segments", "executive_customer_health"]
      },
      {
        code: "LIVE_QUERY_USAGE",
        severity: "HIGH",
        weight: 30,
        message: "Observed query usage still references the source field.",
        evidence: ["synthetic-fixture"]
      }
    ]
  };
}

export function buildDbtProofScenarios() {
  const scenarios = [
    {
      id: "rename_column",
      request: {
        targetUrn: "urn:li:dataset:(urn:li:dataPlatform:duckdb,retail.gold.customers,PROD)",
        entityName: BASE_MODEL_NAME,
        changeType: "rename_column",
        sourceField: "customer_email",
        destinationField: "contact_email",
        destinationType: null,
        requestedBy: "dbt-proof",
        rationale: "Synthetic rename proof for the pre-video truth lock."
      },
      impact: baseImpactFor({ fieldPath: "customer_email", nativeDataType: "varchar", nullable: false }),
      expectedColumns: [
        { name: "customer_id", type: "INTEGER" },
        { name: "customer_email", type: "VARCHAR" },
        { name: "loyalty_points_text", type: "VARCHAR" },
        { name: "legacy_segment", type: "VARCHAR" },
        { name: "contact_email", type: "VARCHAR" }
      ],
      expectedRows: BASE_ROWS.map(([customerId, customerEmail]) => [customerId, customerEmail, customerEmail]),
      verificationQuery: `select customer_id, customer_email, contact_email from ${CANONICAL_GENERATED_MODEL_NAME} order by customer_id`,
      rollbackExpectedColumns: [
        { name: "customer_id", type: "INTEGER" },
        { name: "customer_email", type: "VARCHAR" },
        { name: "loyalty_points_text", type: "VARCHAR" },
        { name: "legacy_segment", type: "VARCHAR" }
      ],
      nullableShouldGenerateNotNull: true
    },
    {
      id: "type_change",
      request: {
        targetUrn: "urn:li:dataset:(urn:li:dataPlatform:duckdb,retail.gold.customers,PROD)",
        entityName: BASE_MODEL_NAME,
        changeType: "type_change",
        sourceField: "loyalty_points_text",
        destinationField: null,
        destinationType: "decimal(18, 2)",
        requestedBy: "dbt-proof",
        rationale: "Synthetic type-change proof for the pre-video truth lock."
      },
      impact: baseImpactFor({ fieldPath: "loyalty_points_text", nativeDataType: "varchar", nullable: false }),
      expectedColumns: [
        { name: "customer_id", type: "INTEGER" },
        { name: "customer_email", type: "VARCHAR" },
        { name: "loyalty_points_text", type: "VARCHAR" },
        { name: "legacy_segment", type: "VARCHAR" },
        { name: "loyalty_points_text_typed", type: "DECIMAL(18,2)" }
      ],
      expectedRows: BASE_ROWS.map(([customerId, , points]) => [customerId, points, `${Number(points).toFixed(2)}`]),
      verificationQuery: `select customer_id, loyalty_points_text, cast(loyalty_points_text_typed as varchar) as loyalty_points_text_typed from ${CANONICAL_GENERATED_MODEL_NAME} order by customer_id`,
      rollbackExpectedColumns: [
        { name: "customer_id", type: "INTEGER" },
        { name: "customer_email", type: "VARCHAR" },
        { name: "loyalty_points_text", type: "VARCHAR" },
        { name: "legacy_segment", type: "VARCHAR" }
      ],
      nullableShouldGenerateNotNull: true
    },
    {
      id: "drop_column",
      request: {
        targetUrn: "urn:li:dataset:(urn:li:dataPlatform:duckdb,retail.gold.customers,PROD)",
        entityName: BASE_MODEL_NAME,
        changeType: "drop_column",
        sourceField: "legacy_segment",
        destinationField: null,
        destinationType: null,
        requestedBy: "dbt-proof",
        rationale: "Synthetic drop proof for the pre-video truth lock."
      },
      impact: baseImpactFor({ fieldPath: "legacy_segment", nativeDataType: "varchar", nullable: true }),
      expectedColumns: [
        { name: "customer_id", type: "INTEGER" },
        { name: "customer_email", type: "VARCHAR" },
        { name: "loyalty_points_text", type: "VARCHAR" },
        { name: "legacy_segment", type: "VARCHAR" }
      ],
      expectedRows: BASE_ROWS.map(([customerId, , , legacySegment]) => [customerId, legacySegment]),
      verificationQuery: `select customer_id, legacy_segment from ${CANONICAL_GENERATED_MODEL_NAME} order by customer_id`,
      rollbackExpectedColumns: [
        { name: "customer_id", type: "INTEGER" },
        { name: "customer_email", type: "VARCHAR" },
        { name: "loyalty_points_text", type: "VARCHAR" },
        { name: "legacy_segment", type: "VARCHAR" }
      ],
      nullableShouldGenerateNotNull: false
    }
  ];

  return scenarios.map((scenario) => {
    const artifacts = generateArtifacts(scenario.request, scenario.impact, baseRisk());
    return {
      ...scenario,
      risk: baseRisk(),
      artifacts,
      generatedModelName: artifacts.grounding.schemaInputs.generatedModelName,
      generatedTests: artifacts.grounding.schemaInputs.generatedTests,
      generatedDataTestCount: artifacts.files.filter((file) => file.kind === "DBT_DATA_TEST").length,
      generatedFileHashes: Object.fromEntries(artifacts.files.map((file) => [file.path, sha256(file.content)])),
      rollbackModelName: `${artifacts.grounding.schemaInputs.generatedModelName}__rollback`
    };
  });
}

function expectedScenarioHash(scenarios) {
  return sha256(scenarios.map((scenario) => ({ id: scenario.id, generatedFileHashes: scenario.generatedFileHashes })));
}

async function gitHead(root) {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function runCommand(file, args, { cwd, projectDir }) {
  const logicalCommand = `${file} ${args.map((arg) => String(arg).replaceAll(projectDir, "<scenario>")).join(" ")}`;
  try {
    const { stdout, stderr } = await execFileAsync(file, args, { cwd, encoding: "utf8" });
    const outputTail = `${stdout}${stderr}`
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-20);
    return {
      command: logicalCommand,
      exitCode: 0,
      stdoutSummary: outputTail.at(-1) || "PASS",
      outputTail
    };
  } catch (error) {
    const outputTail = `${error.stderr || ""}\n${error.stdout || ""}`
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-20);
    return {
      command: logicalCommand,
      exitCode: error.code ?? 1,
      stdoutSummary: outputTail.at(-1) || error.message || "FAIL",
      outputTail
    };
  }
}

function dbtArgs(command, scenarioDir, ...extraArgs) {
  return [
    "run",
    "--with",
    `dbt-core==${DBT_CORE_VERSION}`,
    "--with",
    `dbt-duckdb==${DBT_DUCKDB_VERSION}`,
    "dbt",
    command,
    "--project-dir",
    scenarioDir,
    "--profiles-dir",
    scenarioDir,
    ...extraArgs
  ];
}

async function readToolchainVersions(root) {
  const { stdout } = await execFileAsync(
    "uv",
    [
      "run",
      "--with",
      `dbt-core==${DBT_CORE_VERSION}`,
      "--with",
      `dbt-duckdb==${DBT_DUCKDB_VERSION}`,
      "python",
      "-c",
      "import importlib.metadata, json, sys; print(json.dumps({'pythonVersion': sys.version.split()[0], 'dbtCoreVersion': importlib.metadata.version('dbt-core'), 'dbtDuckdbVersion': importlib.metadata.version('dbt-duckdb')}))"
    ],
    { cwd: root, encoding: "utf8" }
  );
  return JSON.parse(stdout.trim());
}

async function queryDuckDbJson(root, databasePath, pythonCode, ...pythonArgs) {
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const { stdout } = await execFileAsync(
        "uv",
        [
          "run",
          "--with",
          `dbt-core==${DBT_CORE_VERSION}`,
          "--with",
          `dbt-duckdb==${DBT_DUCKDB_VERSION}`,
          "python",
          "-c",
          pythonCode,
          databasePath,
          ...pythonArgs
        ],
        { cwd: root, encoding: "utf8" }
      );
      return JSON.parse(stdout.trim());
    } catch (error) {
      const message = `${error.stderr || ""}${error.stdout || ""}${error.message || ""}`;
      lastError = error;
      if (!/another process|eriimiyor|used by another process/i.test(message) || attempt === 5) throw error;
      await delay(250 * (attempt + 1));
    }
  }
  throw lastError;
}

async function readColumns(root, databasePath, relationName) {
  return queryDuckDbJson(
    root,
    databasePath,
    "import duckdb, json, sys; con=duckdb.connect(sys.argv[1], read_only=True); rows=con.execute(f\"pragma table_info('{sys.argv[2]}')\").fetchall(); print(json.dumps([{'name': row[1], 'type': row[2], 'notNull': bool(row[3])} for row in rows]))",
    relationName
  );
}

async function readRows(root, databasePath, query) {
  return queryDuckDbJson(
    root,
    databasePath,
    "import duckdb, json, sys; con=duckdb.connect(sys.argv[1], read_only=True); print(json.dumps(con.execute(sys.argv[2]).fetchall()))",
    query
  );
}

async function readRunResults(projectDir) {
  try {
    return JSON.parse(await readFile(path.join(projectDir, "target", "run_results.json"), "utf8"));
  } catch {
    return null;
  }
}

async function writeProjectFiles(projectDir, scenario, { collision = false } = {}) {
  const dbPath = path.join(projectDir, "contextseal.duckdb");
  const projectConfig = [
    "name: contextseal_dbt_proof",
    "version: 1.0.0",
    "config-version: 2",
    "profile: contextseal_dbt_proof",
    "model-paths: ['models']",
    "models:",
    "  contextseal_dbt_proof:",
    "    +materialized: table"
  ].join("\n") + "\n";
  const profiles = [
    "contextseal_dbt_proof:",
    "  target: proof",
    "  outputs:",
    "    proof:",
    "      type: duckdb",
    `      path: ${JSON.stringify(toPosixPath(dbPath))}`,
    "      threads: 1"
  ].join("\n") + "\n";
  const baseModel = baseModelSql();
  const generatedModel = scenario.artifacts.files.find((file) => file.kind === "DBT_MODEL");
  const generatedTests = scenario.artifacts.files.find((file) => file.kind === "DBT_TESTS");
  const rollback = scenario.artifacts.files.find((file) => file.kind === "ROLLBACK");
  const dataTests = scenario.artifacts.files.filter((file) => file.kind === "DBT_DATA_TEST");

  await mkdir(path.join(projectDir, "models", "generated"), { recursive: true });
  await mkdir(path.join(projectDir, "models", "rollback"), { recursive: true });
  await mkdir(path.join(projectDir, "tests"), { recursive: true });
  await writeFile(path.join(projectDir, "dbt_project.yml"), projectConfig, "utf8");
  await writeFile(path.join(projectDir, "profiles.yml"), profiles, "utf8");
  await writeFile(path.join(projectDir, "models", `${BASE_MODEL_NAME}.sql`), baseModel, "utf8");
  await writeFile(path.join(projectDir, "models", "generated", path.basename(generatedModel.path)), generatedModel.content, "utf8");
  await writeFile(path.join(projectDir, "models", "generated", path.basename(generatedTests.path)), generatedTests.content, "utf8");
  await writeFile(path.join(projectDir, "models", "rollback", `${scenario.rollbackModelName}.sql`), rollback.content, "utf8");
  for (const dataTest of dataTests) {
    await writeFile(path.join(projectDir, "tests", path.basename(dataTest.path)), dataTest.content, "utf8");
  }

  if (collision) {
    await mkdir(path.join(projectDir, "models", "collision"), { recursive: true });
    await writeFile(
      path.join(projectDir, "models", "collision", `${scenario.generatedModelName}.sql`),
      "select 1 as duplicate_model_name;\n",
      "utf8"
    );
  }

  return dbPath;
}

function normalizeColumns(columns) {
  return columns.map((column) => ({ name: column.name, type: String(column.type).toUpperCase() }));
}

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function executeSuccessScenario(root, tempRoot, scenario) {
  const projectDir = path.join(tempRoot, scenario.id);
  const dbPath = await writeProjectFiles(projectDir, scenario);
  const commands = [];

  for (const [name, extraArgs] of [
    ["dbt parse", []],
    ["dbt compile", []],
    ["dbt run", []],
    ["dbt test", ["--select", scenario.generatedModelName]]
  ]) {
    const result = await runCommand("uv", dbtArgs(name.split(" ")[1], projectDir, ...extraArgs), { cwd: root, projectDir });
    commands.push({ name, ...result });
    if (result.exitCode !== 0) {
      return {
        id: scenario.id,
        changeType: scenario.request.changeType,
        expectedResult: "PASS",
        status: "FAIL",
        generatedModelName: scenario.generatedModelName,
        generatedTests: scenario.generatedTests,
        generatedFileHashes: scenario.generatedFileHashes,
        commands,
        error: `${name} failed with exit code ${result.exitCode}`
      };
    }
  }

  const [actualColumns, rollbackColumns, actualRows, runResults] = await Promise.all([
    readColumns(root, dbPath, scenario.generatedModelName),
    readColumns(root, dbPath, scenario.rollbackModelName),
    readRows(root, dbPath, scenario.verificationQuery),
    readRunResults(projectDir)
  ]);
  const actualColumnsNormalized = normalizeColumns(actualColumns);
  const rollbackColumnsNormalized = normalizeColumns(rollbackColumns);
  const testsExecuted = (runResults?.results || []).filter((entry) => entry.unique_id?.startsWith("test.")).length;
  const checks = {
    canonicalModelIdentity: scenario.generatedModelName === CANONICAL_GENERATED_MODEL_NAME,
    notNullGenerated: scenario.generatedTests.includes("not_null"),
    notNullExpected: scenario.nullableShouldGenerateNotNull,
    columnsMatch: arraysEqual(actualColumnsNormalized, scenario.expectedColumns),
    rowsMatch: arraysEqual(actualRows, scenario.expectedRows),
    rollbackColumnsMatch: arraysEqual(rollbackColumnsNormalized, scenario.rollbackExpectedColumns),
    rollbackExecuted: commands.some((command) => command.name === "dbt run" && command.exitCode === 0),
    testsObserved: testsExecuted >= scenario.generatedTests.length + scenario.generatedDataTestCount
  };
  const status = [
    checks.canonicalModelIdentity,
    checks.notNullGenerated === checks.notNullExpected,
    checks.columnsMatch,
    checks.rowsMatch,
    checks.rollbackColumnsMatch,
    checks.rollbackExecuted,
    checks.testsObserved
  ].every(Boolean) ? "PASS" : "FAIL";

  return {
    id: scenario.id,
    changeType: scenario.request.changeType,
    expectedResult: "PASS",
    status,
    generatedModelName: scenario.generatedModelName,
    generatedTests: scenario.generatedTests,
    generatedDataTestCount: scenario.generatedDataTestCount,
    generatedFileHashes: scenario.generatedFileHashes,
    commands,
    expectedColumns: scenario.expectedColumns,
    actualColumns: actualColumnsNormalized,
    expectedRows: scenario.expectedRows,
    actualRows,
    rollbackExpectedColumns: scenario.rollbackExpectedColumns,
    rollbackActualColumns: rollbackColumnsNormalized,
    checks,
    testCount: testsExecuted,
    boundary: DBT_PROOF_BOUNDARY
  };
}

async function executeCollisionScenario(root, tempRoot, scenario) {
  const projectDir = path.join(tempRoot, "model_name_collision");
  await writeProjectFiles(projectDir, scenario, { collision: true });
  const parseResult = await runCommand("uv", dbtArgs("parse", projectDir), { cwd: root, projectDir });
  const failureObserved = parseResult.exitCode !== 0;

  return {
    id: "model_name_collision",
    changeType: scenario.request.changeType,
    expectedResult: "FAIL_CLOSED",
    status: failureObserved ? "PASS" : "FAIL",
    generatedModelName: scenario.generatedModelName,
    generatedTests: scenario.generatedTests,
    generatedFileHashes: scenario.generatedFileHashes,
    commands: [{ name: "dbt parse", ...parseResult }],
    checks: {
      canonicalModelIdentity: scenario.generatedModelName === CANONICAL_GENERATED_MODEL_NAME,
      failureObserved
    },
    boundary: DBT_PROOF_BOUNDARY
  };
}

async function runProof(root) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "contextseal-dbt-proof-"));
  try {
    const scenarios = buildDbtProofScenarios();
    const toolchain = await readToolchainVersions(root);
    const results = [];
    for (const scenario of scenarios) results.push(await executeSuccessScenario(root, tempRoot, scenario));
    results.push(await executeCollisionScenario(root, tempRoot, scenarios[0]));

    const status = results.every((result) => result.status === "PASS") ? "PASS" : "FAIL";
    return {
      status,
      validatedAt: nowIso(),
      command: "npm run dbt:proof",
      evidenceBoundary: DBT_PROOF_BOUNDARY,
      toolchain: {
        launcher: "uv",
        pythonVersion: toolchain.pythonVersion,
        dbtCoreVersion: toolchain.dbtCoreVersion,
        dbtDuckdbVersion: toolchain.dbtDuckdbVersion
      },
      sourceImplementation: {
        gitHead: await gitHead(root),
        generatedArtifactSetSha256: expectedScenarioHash(scenarios)
      },
      scenarios: results
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export function validateDbtProofArtifact(proof, expectedScenarios = buildDbtProofScenarios()) {
  assert(proof && typeof proof === "object" && !Array.isArray(proof), "dbt proof artifact must be an object.");
  assert(proof.status === "PASS", `dbt proof artifact must be PASS; found '${proof.status ?? "missing"}'.`);
  assert(proof.evidenceBoundary === DBT_PROOF_BOUNDARY, "dbt proof artifact must preserve the synthetic DuckDB execution boundary.");
  assert(proof.toolchain?.dbtCoreVersion === DBT_CORE_VERSION, `dbt-core version must be ${DBT_CORE_VERSION}.`);
  assert(proof.toolchain?.dbtDuckdbVersion === DBT_DUCKDB_VERSION, `dbt-duckdb version must be ${DBT_DUCKDB_VERSION}.`);
  assert(typeof proof.toolchain?.pythonVersion === "string" && proof.toolchain.pythonVersion, "dbt proof artifact must include a Python version.");

  const scenarioMap = new Map((proof.scenarios || []).map((scenario) => [scenario.id, scenario]));
  for (const scenario of expectedScenarios) {
    const actual = scenarioMap.get(scenario.id);
    assert(actual, `missing dbt proof scenario '${scenario.id}'.`);
    assert(actual.status === "PASS", `dbt proof scenario '${scenario.id}' must be PASS.`);
    assert(actual.generatedModelName === CANONICAL_GENERATED_MODEL_NAME, `dbt proof scenario '${scenario.id}' must use canonical model identity ${CANONICAL_GENERATED_MODEL_NAME}.`);
    assert(arraysEqual(actual.generatedTests || [], scenario.generatedTests), `dbt proof scenario '${scenario.id}' generatedTests do not match the current generator.`);
    assert(actual.generatedDataTestCount === scenario.generatedDataTestCount, `dbt proof scenario '${scenario.id}' data-test count does not match the current generator.`);
    assert(arraysEqual(actual.expectedColumns || [], scenario.expectedColumns), `dbt proof scenario '${scenario.id}' expectedColumns drifted from the current harness.`);
    assert(arraysEqual(actual.expectedRows || [], scenario.expectedRows), `dbt proof scenario '${scenario.id}' expectedRows drifted from the current harness.`);
    assert(arraysEqual(actual.rollbackExpectedColumns || [], scenario.rollbackExpectedColumns), `dbt proof scenario '${scenario.id}' rollbackExpectedColumns drifted from the current harness.`);
    assert(arraysEqual(actual.actualColumns || [], scenario.expectedColumns), `dbt proof scenario '${scenario.id}' actualColumns do not match expectedColumns.`);
    assert(arraysEqual(actual.actualRows || [], scenario.expectedRows), `dbt proof scenario '${scenario.id}' actualRows do not match expectedRows.`);
    assert(arraysEqual(actual.rollbackActualColumns || [], scenario.rollbackExpectedColumns), `dbt proof scenario '${scenario.id}' rollbackActualColumns do not match expected columns.`);
    assert(Object.entries(scenario.generatedFileHashes).every(([filePath, hash]) => actual.generatedFileHashes?.[filePath] === hash), `dbt proof scenario '${scenario.id}' generated file hashes drifted from the current generator.`);
    for (const command of actual.commands || []) {
      assert(command.exitCode === 0, `dbt proof scenario '${scenario.id}' has a non-zero exit code for ${command.name}.`);
    }
    assert(actual.checks?.canonicalModelIdentity === true, `dbt proof scenario '${scenario.id}' must prove canonical model identity.`);
    assert(actual.checks?.notNullGenerated === scenario.nullableShouldGenerateNotNull, `dbt proof scenario '${scenario.id}' not_null generation does not match nullable metadata.`);
    assert(actual.checks?.testsObserved === true, `dbt proof scenario '${scenario.id}' did not record the expected dbt test behavior.`);
  }

  const collision = scenarioMap.get("model_name_collision");
  assert(collision, "missing dbt proof scenario 'model_name_collision'.");
  assert(collision.status === "PASS", "dbt proof collision scenario must PASS by failing closed.");
  assert(collision.expectedResult === "FAIL_CLOSED", "dbt proof collision scenario must declare FAIL_CLOSED.");
  assert(collision.generatedModelName === CANONICAL_GENERATED_MODEL_NAME, "dbt proof collision scenario must use the canonical model identity.");
  assert(collision.commands?.[0]?.exitCode > 0, "dbt proof collision scenario must preserve a non-zero dbt parse exit code.");
  assert(collision.checks?.failureObserved === true, "dbt proof collision scenario must record the duplicate-model failure.");

  assert(proof.sourceImplementation?.generatedArtifactSetSha256 === expectedScenarioHash(expectedScenarios), "dbt proof artifact implementation identity does not match the current generated scenario set.");
  return proof;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(".");
  const evidencePath = path.join(root, options.evidenceOutput);

  if (options.check) {
    const proof = JSON.parse(await readFile(evidencePath, "utf8"));
    validateDbtProofArtifact(proof);
    console.log(`PASS real dbt proof check: ${options.evidenceOutput} is present, PASS, and matches the current generator`);
    return;
  }

  const proof = await runProof(root);
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  if (proof.status !== "PASS") {
    console.error(`FAIL real dbt proof: ${proof.scenarios.filter((scenario) => scenario.status !== "PASS").map((scenario) => scenario.id).join(", ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS real dbt proof: rename, type_change, drop_column, and collision checks succeeded with dbt-core ${proof.toolchain.dbtCoreVersion} and dbt-duckdb ${proof.toolchain.dbtDuckdbVersion}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}