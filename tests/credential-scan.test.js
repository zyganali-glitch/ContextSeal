import test from "node:test";
import assert from "node:assert/strict";
import {
  containsRuntimeCredential,
  credentialSignatures,
  runtimeCredentialSignatures
} from "../src/security/credential-scan.js";

test("credential scan catches DataHub assignments and JWT/PAT shapes while allowing placeholders", () => {
  const tokenKey = ["DATAHUB", "GMS", "TOKEN"].join("_");
  const operatorKey = ["CONTEXTSEAL", "OPERATOR", "TOKEN"].join("_");
  const jwt = [
    "eyJhbGciOiJIUzI1NiJ9",
    "eyJzdWIiOiJkYXRhaHViLXVzZXIifQ",
    "somesignaturematerial1234"
  ].join(".");
  const pat = ["datahub", "pat", "abcdefghijklmnopqrstuvwxyz123456"].join("_");

  assert.ok(credentialSignatures(`${tokenKey}=live-secret-value-123456789`).length > 0);
  assert.ok(credentialSignatures(`${operatorKey}: operator-secret-value-123456789`).length > 0);
  assert.ok(credentialSignatures(`- ${tokenKey}=docker-secret-value-123456789`).length > 0);
  assert.ok(credentialSignatures(`"${operatorKey}": "json-secret-value-123456789"`).length > 0);
  assert.ok(credentialSignatures(`setx ${tokenKey} windows-secret-value-123456789`).length > 0);
  assert.ok(credentialSignatures(jwt).length > 0);
  assert.ok(credentialSignatures(pat).length > 0);

  assert.deepEqual(credentialSignatures(`${tokenKey}=\n${operatorKey}=<generate-a-random-token>`), []);
  assert.deepEqual(credentialSignatures(`${tokenKey}=\${DATAHUB_SECRET}\n${operatorKey}=\$(openssl rand -hex 32)`), []);
});

test("runtime credential scan catches high-confidence pasted secrets without returning their values", () => {
  const dataHubTokenKey = ["DATAHUB", "GMS", "TOKEN"].join("_");
  const githubPat = ["github", "pat", "A1".repeat(16)].join("_");
  const dataHubPat = ["datahub", "pat", "b2".repeat(16)].join("_");
  const jwt = [
    "eyJhbGciOiJIUzI1NiJ9",
    "eyJzdWIiOiJsaXZlLXVzZXIifQ",
    "C3".repeat(14)
  ].join(".");
  const bearerValue = `D4${"e".repeat(28)}`;
  const assignedValue = "abcdefghijklmnop";

  for (const sample of [
    githubPat,
    dataHubPat,
    jwt,
    `Authorization: Bearer ${bearerValue}`,
    `token=${assignedValue}`,
    `${dataHubTokenKey}=short-but-real`
  ]) {
    const signatures = runtimeCredentialSignatures(sample);
    assert.ok(signatures.length > 0);
    assert.equal(signatures.some((signature) => sample.includes(signature)), false);
    assert.equal(containsRuntimeCredential(sample), true);
  }
});

test("runtime credential scan allows ordinary governance prose, placeholders, and DataHub URNs", () => {
  const safe = [
    "Never paste a token or credential into this rationale.",
    "token=<redacted>",
    "Authorization: Bearer <generate-a-random-token>",
    "urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.gold.customers,PROD)",
    "Approve only the exact staged migration for customer_email."
  ];
  for (const sample of safe) assert.deepEqual(runtimeCredentialSignatures(sample), []);
});