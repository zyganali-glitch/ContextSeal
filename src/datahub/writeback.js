import { stableStringify } from "../core/hash.js";
import { assertPassportValid, PassportVerificationError } from "../core/passport.js";
import { containsRuntimeCredential } from "../security/credential-scan.js";
import { contentPayload, extractEntities } from "./live-context.js";

const MUTATION_TOOLS = ["add_structured_properties", "update_description", "save_document"];
const DOCUMENT_URN = /^urn:li:document:[^\s\u0000-\u001f\u007f]{1,1024}$/;
const PROPERTY_VALUES = new Map([
  ["io.contextseal.status", (run) => "CERTIFIED"],
  ["io.contextseal.riskScore", (run) => run.risk.score],
  ["io.contextseal.passportId", (run) => run.passport.passportId],
  ["io.contextseal.validUntil", (run) => run.passport.validUntil.slice(0, 10)]
]);

export class WritebackError extends Error {
  constructor(message, results = [], readback = null) {
    super(message);
    this.name = "WritebackError";
    this.results = results;
    this.readback = readback;
  }
}

export class WritebackVerificationError extends WritebackError {
  constructor(message, results, readback) {
    super(message, results, readback);
    this.name = "WritebackVerificationError";
  }
}

function assertWritebackPolicy(run, policy) {
  if (!Array.isArray(policy?.supportedChanges) || !policy.supportedChanges.includes(run.request.changeType)) {
    throw new PassportVerificationError("Active policy does not permit this change type for write-back.", [
      `change type ${run.request.changeType}`
    ]);
  }
  const configured = policy?.writeback?.structuredProperties;
  if (!Array.isArray(configured) || configured.length === 0 || new Set(configured).size !== configured.length) {
    throw new PassportVerificationError("Active policy must define a non-empty, unique structured-property allowlist.");
  }
  const unsupported = configured.filter((name) => !PROPERTY_VALUES.has(name));
  if (unsupported.length) {
    throw new PassportVerificationError("Active policy requests unsupported ContextSeal structured properties.", unsupported);
  }
}

function mutationValues(run, policy) {
  assertWritebackPolicy(run, policy);
  return Object.fromEntries(policy.writeback.structuredProperties.map((name) => [
    `urn:li:structuredProperty:${name}`,
    [PROPERTY_VALUES.get(name)(run)]
  ]));
}

function canonicalWritebackOperations(run, policy) {
  return [
    {
      tool: "add_structured_properties",
      arguments: { entity_urns: [run.request.targetUrn], property_values: mutationValues(run, policy) }
    },
    {
      tool: "update_description",
      arguments: {
        entity_urn: run.request.targetUrn,
        operation: "append",
        description: `\n\n---\nContextSeal passport **${run.passport.passportId}**: ${run.artifacts.summary}`
      }
    },
    {
      tool: "save_document",
      arguments: {
        title: `Change Passport ${run.passport.passportId}`,
        document_type: "Decision",
        content: JSON.stringify(run.passport, null, 2),
        topics: ["contextseal", "schema-change", "certified-migration"],
        related_assets: [run.request.targetUrn]
      }
    }
  ];
}

export function buildWritebackOperations(run, policy, now = new Date()) {
  assertPassportValid(run, policy, now);
  return canonicalWritebackOperations(run, policy);
}

function assertOperationsBound(operations, run, policy) {
  if (!Array.isArray(operations) || operations.length !== MUTATION_TOOLS.length
      || operations.some((item, index) => item?.tool !== MUTATION_TOOLS[index])) {
    throw new Error("Write-back operation set is not the certified bounded mutation plan.");
  }
  const expected = canonicalWritebackOperations(run, policy);
  if (stableStringify(operations) !== stableStringify(expected)) {
    throw new Error("Write-back operation content has changed since certification.");
  }
}

function assertCredentialFreeResult(result) {
  let serialized;
  try { serialized = JSON.stringify(result); }
  catch { throw new Error("DataHub MCP returned a non-serializable result."); }
  if (containsRuntimeCredential(serialized)) {
    throw new Error("DataHub MCP result contained credential-like material and was rejected.");
  }
}

function sanitizedMutationResult(tool, result) {
  if (!result || result.isError === true) {
    throw new Error("MCP mutation response did not contain an explicit success=true receipt.");
  }
  assertCredentialFreeResult(result);
  const payload = contentPayload(result);
  if (payload?.success !== true) {
    throw new Error("MCP mutation response did not contain an explicit success=true receipt.");
  }
  // Persist only the fields needed for deterministic verification. Remote
  // diagnostics and arbitrary metadata never become a run receipt.
  const receipt = { success: true };
  if (tool === "save_document" && payload.urn != null) {
    if (typeof payload.urn !== "string" || !DOCUMENT_URN.test(payload.urn)) {
      throw new Error("save_document returned an invalid document URN receipt.");
    }
    receipt.urn = payload.urn;
  }
  return { isError: false, structuredContent: receipt };
}

function credentialFreePayload(result) {
  assertCredentialFreeResult(result);
  return contentPayload(result);
}

export async function executeWriteback(client, operations, { run, policy, now = new Date() } = {}) {
  if (!run || !policy) throw new Error("A certified run and active policy are required at mutation time.");
  assertPassportValid(run, policy, now);
  assertOperationsBound(operations, run, policy);
  // Execute a fresh canonical snapshot so a caller cannot mutate the supplied
  // operation objects after the mutation-time check (a TOCTOU bypass).
  const certifiedOperations = canonicalWritebackOperations(run, policy);
  const results = [];
  for (const operation of certifiedOperations) {
    try {
      const result = await client.callTool(operation.tool, operation.arguments);
      results.push({
        tool: operation.tool,
        status: "PASS",
        result: sanitizedMutationResult(operation.tool, result)
      });
    } catch (error) {
      results.push({
        tool: operation.tool,
        status: "FAIL",
        error: "DataHub MCP mutation failed; external detail was withheld."
      });
      throw new WritebackError(`DataHub write-back stopped at ${operation.tool}.`, results);
    }
  }
  return results;
}

function propertyMap(entity) {
  const properties = entity?.structuredProperties?.properties || [];
  return new Map(properties.map((item) => {
    const key = item?.structuredProperty?.urn || (item?.structuredProperty?.definition?.qualifiedName
      ? `urn:li:structuredProperty:${item.structuredProperty.definition.qualifiedName}` : null);
    const values = (item?.values || []).map((value) => value?.stringValue ?? value?.numberValue ?? value?.doubleValue ?? value?.value);
    return [key, values];
  }).filter(([key]) => key));
}

function sameScalar(actual, expected) {
  if (typeof expected === "number") return Number(actual) === expected;
  return String(actual) === String(expected);
}

function verifyTargetEntity(entity, run, policy) {
  const actual = propertyMap(entity);
  const expected = mutationValues(run, policy);
  const properties = Object.entries(expected).map(([key, values]) => ({
    property: key,
    expected: values[0],
    actual: actual.get(key)?.[0] ?? null,
    matches: actual.has(key) && sameScalar(actual.get(key)[0], values[0])
  }));
  const description = entity?.editableProperties?.description || entity?.description || "";
  return {
    structuredProperties: {
      state: properties.every((item) => item.matches) ? "PASS" : "FAIL",
      properties
    },
    description: {
      state: description.includes(run.passport.passportId) ? "PASS" : "FAIL",
      passportIdPresent: description.includes(run.passport.passportId)
    }
  };
}

function resultDocumentUrn(receipts) {
  const result = receipts.find((item) => item.tool === "save_document")?.result;
  if (!result) return null;
  try {
    const payload = contentPayload(result);
    return typeof payload?.urn === "string" && payload.urn.startsWith("urn:li:document:") ? payload.urn : null;
  } catch {
    return null;
  }
}

function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchContainsLiteral(match, expectedLiteral) {
  if (!match || typeof match !== "object") return false;
  return Object.entries(match).some(([key, value]) => {
    if (!["excerpt", "text", "match", "value", "content", "context", "line"].includes(key)) return false;
    return typeof value === "string" && value.includes(expectedLiteral);
  });
}

function verifyGrepPayload(payload, documentUrn, expectedTitle, expectedLiteral) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const exact = results.find((item) => item?.urn === documentUrn && item?.title === expectedTitle);
  const matches = exact?.matches || [];
  return Boolean(exact && Number(exact.total_matches ?? matches.length) > 0 && matches.length > 0
    && matches.some((match) => matchContainsLiteral(match, expectedLiteral)));
}

async function verifyDocument(client, run, receipts, evidence) {
  const documentUrn = resultDocumentUrn(receipts);
  if (!documentUrn) {
    return { state: "NOT_RUN", urn: null, reason: "save_document receipt did not return a document URN" };
  }
  const expectedTitle = `Change Passport ${run.passport.passportId}`;
  const checks = [
    { name: "passportId", literal: run.passport.passportId },
    { name: "manifestHash", literal: run.passport.manifestHash },
    { name: "targetUrn", literal: run.request.targetUrn }
  ];
  const verified = {};
  for (const check of checks) {
    const args = { urns: [documentUrn], pattern: regexEscape(check.literal), context_chars: 500, max_matches_per_doc: 5 };
    try {
      const result = await client.callTool("grep_documents", args);
      const payload = credentialFreePayload(result);
      evidence.push({ tool: "grep_documents", arguments: args, state: "PASS", payload });
      verified[check.name] = verifyGrepPayload(payload, documentUrn, expectedTitle, check.literal);
    } catch (error) {
      evidence.push({
        tool: "grep_documents",
        arguments: args,
        state: "WARN",
        error: "DataHub MCP document read failed; external detail was withheld."
      });
      return { state: "WARN", urn: documentUrn, title: expectedTitle, reason: "document retrieval was unavailable", verified };
    }
  }
  return {
    state: Object.values(verified).every(Boolean) ? "PASS" : "FAIL",
    urn: documentUrn,
    title: expectedTitle,
    verificationScope: "EXACT_URN_TITLE_AND_LITERAL_BINDINGS",
    verified
  };
}

async function collectReadbackAttempt(client, run, mutationReceipts, policy, now) {
  const evidence = [];
  const args = { urns: [run.request.targetUrn] };
  let targetVerification;
  try {
    const result = await client.callTool("get_entities", args);
    const payload = credentialFreePayload(result);
    evidence.push({ tool: "get_entities", arguments: args, state: "PASS", payload });
    const entities = extractEntities(payload, "post-write get_entities payload");
    const matches = entities.filter((entity) => entity?.urn === run.request.targetUrn);
    if (matches.length !== 1) throw new Error("Post-write read-back did not return exactly the certified target.");
    targetVerification = verifyTargetEntity(matches[0], run, policy);
  } catch (error) {
    const withheld = "DataHub MCP entity read or deterministic verification failed; external detail was withheld.";
    evidence.push({ tool: "get_entities", arguments: args, state: "FAIL", error: withheld });
    targetVerification = {
      structuredProperties: { state: "FAIL", properties: [], reason: withheld },
      description: { state: "FAIL", passportIdPresent: false, reason: withheld }
    };
  }
  const relatedDocument = await verifyDocument(client, run, mutationReceipts, evidence);
  const requiredFailed = targetVerification.structuredProperties.state === "FAIL"
    || targetVerification.description.state === "FAIL"
    || relatedDocument.state === "FAIL";
  const state = requiredFailed ? "FAIL" : relatedDocument.state === "PASS" ? "PASS" : "WARN";
  return {
    state,
    observedAt: now.toISOString(),
    targetUrn: run.request.targetUrn,
    verified: { ...targetVerification, relatedDocument },
    evidence
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function collectWritebackReadback(client, run, mutationReceipts, {
  policy,
  now = null,
  maxAttempts = 3,
  retryDelayMs = 200,
  sleep = delay,
  clock = () => new Date()
} = {}) {
  if (!policy) throw new Error("Active policy is required for post-write verification.");
  const boundedAttempts = Math.min(5, Math.max(1, Number.isSafeInteger(maxAttempts) ? maxAttempts : 3));
  const boundedDelay = Math.min(2_000, Math.max(0, Number.isFinite(retryDelayMs) ? retryDelayMs : 200));
  const attempts = [];
  for (let attempt = 1; attempt <= boundedAttempts; attempt += 1) {
    const attemptNow = now instanceof Date ? now : clock();
    const result = await collectReadbackAttempt(client, run, mutationReceipts, policy, attemptNow);
    attempts.push({ attempt, ...result });
    if (result.state === "PASS") break;
    if (attempt < boundedAttempts) await sleep(boundedDelay * (2 ** (attempt - 1)));
  }
  const finalAttempt = attempts.at(-1);
  return {
    state: finalAttempt.state,
    observedAt: finalAttempt.observedAt,
    targetUrn: finalAttempt.targetUrn,
    verified: finalAttempt.verified,
    evidence: finalAttempt.evidence,
    attemptCount: attempts.length,
    attempts
  };
}
