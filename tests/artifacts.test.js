import test from "node:test";
import assert from "node:assert/strict";
import { generateArtifacts } from "../src/core/artifacts.js";

const baseRequest = {
  targetUrn: "urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.gold.customers,PROD)",
  entityName: "gold_customers",
  sourceField: "customer_email",
  destinationField: null,
  destinationType: null,
  requestedBy: "test-owner",
  rationale: "Exercise generated migration artifacts."
};
const impact = {
  target: {
    type: "DATASET",
    platform: "snowflake",
    schemaFields: [
      { fieldPath: "customer_id", nativeDataType: "varchar", nullable: false, unique: true },
      { fieldPath: "customer_email", nativeDataType: "varchar", nullable: false },
      { fieldPath: "updated_at", nativeDataType: "timestamp", nullable: false }
    ]
  },
  counts: {
    total: 1,
    highCriticality: 0,
    byType: { DATASET: 1 }
  },
  impacted: [{
    urn: "urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.analytics.customer_segments,PROD)",
    name: "customer_segments",
    type: "DATASET",
    owners: ["urn:li:corpgroup:growth-data"],
    hops: 1,
    path: ["gold_customers", "customer_segments"]
  }]
};
const risk = { verdict: "BLOCKED", score: 80, findings: [{ code: "DOWNSTREAM_DEPENDENCY" }] };

function filesFor(request) {
  const result = generateArtifacts(request, impact, risk);
  assert.equal(result.files.length, request.changeType === "rename_column" ? 5 : 4);
  assert.equal(new Set(result.files.map((file) => file.path)).size, result.files.length);
  const files = Object.fromEntries(result.files.map((file) => [file.kind, file]));
  assert.equal(files.ROLLBACK.path, "generated/rollback/gold_customers.sql");
  return files;
}

test("rename artifacts use explicit schema projection, a compatibility alias, and a parity test", () => {
  const files = filesFor({ ...baseRequest, changeType: "rename_column", destinationField: "contact_email" });

  assert.match(files.DBT_MODEL.content, /customer_email as contact_email/);
  assert.match(files.DBT_MODEL.content, /customer_id,\n  customer_email,\n  updated_at,\n  customer_email as contact_email/);
  assert.doesNotMatch(files.DBT_MODEL.content, /select\s+\*/i);
  assert.match(files.DBT_MODEL.content, /ref\('gold_customers'\)/);
  assert.match(files.DBT_TESTS.content, /name: gold_customers_contextseal/);
  assert.match(files.DBT_TESTS.content, /name: customer_email[\s\S]*- not_null/);
  assert.match(files.DBT_TESTS.content, /name: contact_email/);
  assert.match(files.DBT_DATA_TEST.content, /customer_email is distinct from contact_email/);
  assert.match(files.ROLLBACK.content, /customer_id,\n  customer_email,\n  updated_at/);
  assert.match(files.ROLLBACK.content, /ref\('gold_customers_contextseal'\)/);
  assert.deepEqual(
    generateArtifacts({ ...baseRequest, changeType: "rename_column", destinationField: "contact_email" }, impact, risk)
      .grounding.schemaInputs.capturedSchemaFields.map((field) => field.fieldPath),
    ["customer_id", "customer_email", "updated_at"]
  );
});

test("type-change artifacts keep the source, validate the typed field, and roll it back", () => {
  const files = filesFor({ ...baseRequest, changeType: "type_change", destinationType: "decimal(18, 2)" });

  assert.match(files.DBT_MODEL.content, /try_cast\(customer_email as decimal\(18, 2\)\) as customer_email_typed/);
  assert.match(files.DBT_TESTS.content, /name: customer_email_typed/);
  assert.doesNotMatch(files.DBT_MODEL.content, /select\s+\*/i);
  assert.doesNotMatch(files.ROLLBACK.content, /select\s+\*/i);
  assert.match(files.ROLLBACK.content, /ref\('gold_customers_contextseal'\)/);
});

test("drop artifacts preserve and test the existing source field", () => {
  const files = filesFor({ ...baseRequest, changeType: "drop_column" });

  assert.match(files.DBT_MODEL.content, /Deliberately preserves customer_email/);
  assert.match(files.DBT_TESTS.content, /name: customer_email/);
  assert.doesNotMatch(files.DBT_TESTS.content, /customer_email_typed/);
  assert.match(files.ROLLBACK.content, /authoritative snapshot/);
});

test("type-change artifacts reject unsafe SQL type text instead of sanitizing it", () => {
  assert.throws(
    () => filesFor({ ...baseRequest, changeType: "type_change", destinationType: "varchar); drop table users; --" }),
    /Unsafe SQL type/
  );
});

test("generated tests do not invent not_null when the captured source field is nullable", () => {
  const nullableImpact = structuredClone(impact);
  nullableImpact.target.schemaFields.find((field) => field.fieldPath === "customer_email").nullable = true;
  const result = generateArtifacts(
    { ...baseRequest, changeType: "rename_column", destinationField: "contact_email" },
    nullableImpact,
    risk
  );
  const tests = result.files.find((file) => file.kind === "DBT_TESTS");

  assert.doesNotMatch(tests.content, /not_null/);
  assert.deepEqual(result.grounding.schemaInputs.generatedTests, []);
  assert.equal(result.grounding.schemaInputs.sourceFieldSchema.nullable, true);
});

test("artifact generation fails closed for an unsupported change type", () => {
  assert.throws(() => filesFor({ ...baseRequest, changeType: "truncate_table" }), /Unsupported change type/);
});

test("artifact generation fails closed for an unsupported platform dialect", () => {
  const unsupportedImpact = structuredClone(impact);
  unsupportedImpact.target.platform = "bigquery";
  assert.throws(
    () => generateArtifacts({ ...baseRequest, changeType: "rename_column", destinationField: "contact_email" }, unsupportedImpact, risk),
    /Unsupported generated artifact dialect/
  );
});
