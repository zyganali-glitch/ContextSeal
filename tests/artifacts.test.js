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
  impacted: [{ name: "customer_segments", type: "DATASET", owners: ["urn:li:corpgroup:growth-data"] }]
};
const risk = { verdict: "BLOCKED", score: 80 };

function filesFor(request) {
  const result = generateArtifacts(request, impact, risk);
  assert.equal(result.files.length, 4);
  assert.equal(new Set(result.files.map((file) => file.path)).size, 4);
  const files = Object.fromEntries(result.files.map((file) => [file.kind, file]));
  assert.equal(files.ROLLBACK.path, "generated/rollback/gold_customers_contextseal_rollback.sql");
  assert.notEqual(files.ROLLBACK.path, "generated/rollback/gold_customers.sql");
  return files;
}

test("rename artifacts use the generated model for rollback and test the new field", () => {
  const files = filesFor({ ...baseRequest, changeType: "rename_column", destinationField: "contact_email" });

  assert.match(files.DBT_MODEL.content, /customer_email as contact_email/);
  assert.match(files.DBT_MODEL.content, /ref\('gold_customers'\)/);
  assert.match(files.DBT_TESTS.content, /name: gold_customers_contextseal/);
  assert.match(files.DBT_TESTS.content, /name: contact_email/);
  assert.match(files.ROLLBACK.content, /exclude \(contact_email\)/);
  assert.match(files.ROLLBACK.content, /ref\('gold_customers_contextseal'\)/);
  assert.doesNotMatch(files.ROLLBACK.content, /_compat/);
});

test("type-change artifacts keep the source, validate the typed field, and roll it back", () => {
  const files = filesFor({ ...baseRequest, changeType: "type_change", destinationType: "decimal(18, 2)" });

  assert.match(files.DBT_MODEL.content, /try_cast\(customer_email as decimal\(18, 2\)\) as customer_email_typed/);
  assert.match(files.DBT_TESTS.content, /name: customer_email_typed/);
  assert.match(files.ROLLBACK.content, /exclude \(customer_email_typed\)/);
  assert.match(files.ROLLBACK.content, /ref\('gold_customers_contextseal'\)/);
  assert.doesNotMatch(files.ROLLBACK.content, /_typed'\)/);
});

test("drop artifacts preserve and test the existing source field", () => {
  const files = filesFor({ ...baseRequest, changeType: "drop_column" });

  assert.match(files.DBT_MODEL.content, /Deliberately preserves customer_email/);
  assert.match(files.DBT_TESTS.content, /name: customer_email/);
  assert.doesNotMatch(files.DBT_TESTS.content, /customer_email_typed/);
  assert.match(files.ROLLBACK.content, /ref\('gold_customers'\)/);
  assert.doesNotMatch(files.ROLLBACK.content, /select 1/);
});

test("type-change artifacts reject unsafe SQL type text instead of sanitizing it", () => {
  assert.throws(
    () => filesFor({ ...baseRequest, changeType: "type_change", destinationType: "varchar); drop table users; --" }),
    /Unsafe SQL type/
  );
});

test("artifact generation fails closed for an unsupported change type", () => {
  assert.throws(() => filesFor({ ...baseRequest, changeType: "truncate_table" }), /Unsupported change type/);
});
