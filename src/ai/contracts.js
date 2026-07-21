export const AI_SCHEMA_VERSION = "1.0";
export const AI_OUTPUT_DISCLAIMER = "Explanation only. Deterministic ContextSeal evidence remains authoritative.";

export class AiContractError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "AiContractError";
    this.details = details;
  }
}

function fail(message, details = []) {
  throw new AiContractError(message, details);
}

function requiredString(value, field, max = 4000) {
  const text = String(value ?? "").trim();
  if (!text) fail(`${field} must be a non-empty string.`);
  if (text.length > max) fail(`${field} exceeds ${max} characters.`);
  return text;
}

function optionalString(value, field, max = 4000) {
  if (value == null) return null;
  return requiredString(value, field, max);
}

function requiredNumber(value, field) {
  if (typeof value !== "number" || Number.isNaN(value)) fail(`${field} must be a number.`);
  return value;
}

function stringArray(value, field, { min = 1, maxItems = 5, maxLength = 240 } = {}) {
  if (!Array.isArray(value)) fail(`${field} must be an array.`);
  if (value.length < min) fail(`${field} must contain at least ${min} item(s).`);
  if (value.length > maxItems) fail(`${field} must contain at most ${maxItems} item(s).`);
  return value.map((item, index) => requiredString(item, `${field}[${index}]`, maxLength));
}

function plainObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${field} must be an object.`);
  return value;
}

function assetSummary(asset) {
  const source = plainObject(asset || {}, "asset");
  return {
    urn: requiredString(source.urn, "asset.urn", 512),
    name: requiredString(source.name, "asset.name", 256),
    type: requiredString(source.type || "UNKNOWN", "asset.type", 64),
    platform: optionalString(source.platform, "asset.platform", 128),
    criticality: optionalString(source.criticality, "asset.criticality", 32),
    hops: typeof source.hops === "number" ? source.hops : 0,
    owners: Array.isArray(source.owners) ? source.owners.slice(0, 5).map((item, index) => requiredString(item, `asset.owners[${index}]`, 256)) : [],
    path: Array.isArray(source.path) ? source.path.slice(0, 6).map((item, index) => requiredString(item, `asset.path[${index}]`, 512)) : []
  };
}

function findingSummary(finding, index) {
  const source = plainObject(finding || {}, `risk.findings[${index}]`);
  return {
    code: requiredString(source.code, `risk.findings[${index}].code`, 128),
    severity: requiredString(source.severity, `risk.findings[${index}].severity`, 32),
    weight: requiredNumber(source.weight, `risk.findings[${index}].weight`),
    message: requiredString(source.message, `risk.findings[${index}].message`, 600),
    evidence: Array.isArray(source.evidence)
      ? source.evidence.slice(0, 5).map((item, itemIndex) => requiredString(item, `risk.findings[${index}].evidence[${itemIndex}]`, 512))
      : []
  };
}

function evidenceSummary(item, index) {
  const source = plainObject(item || {}, `evidence[${index}]`);
  return {
    claim: requiredString(source.claim, `evidence[${index}].claim`, 256),
    state: requiredString(source.state, `evidence[${index}].state`, 32),
    artifact: optionalString(source.artifact, `evidence[${index}].artifact`, 512)
  };
}

function queryEvidence(run) {
  const fixtureQueryCount = Array.isArray(run.context?.queries) ? run.context.queries.length : 0;
  const liveQueryPayload = run.liveEvidence?.evidence?.find((item) => item.tool === "get_dataset_queries")?.payload;
  const liveQueryTotal = typeof liveQueryPayload?.total === "number" ? liveQueryPayload.total : null;
  return {
    fixtureQueryCount,
    liveReadCaptured: liveQueryTotal != null,
    liveReadTotal: liveQueryTotal,
    safeClaim: run.mode === "fixture"
      ? `Fixture query evidence shows ${fixtureQueryCount} matching queries; no live query claim is available.`
      : liveQueryTotal == null
        ? "No stored live query read is available yet; do not claim live query usage."
        : liveQueryTotal > 0
          ? `Live query read returned ${liveQueryTotal} observed dataset queries for the target.`
          : "Live query read completed, but the saved result returned zero observed dataset queries for the target."
  };
}

function writebackIntent(run) {
  const approvedScope = ["APPROVED_FOR_WRITEBACK", "CERTIFIED_AND_WRITTEN_BACK"].includes(run.state);
  const liveEvidenceCaptured = Boolean(run.liveEvidence);
  return {
    approvedScope,
    liveEvidenceCaptured,
    canAttemptWriteback: approvedScope && liveEvidenceCaptured,
    safeClaim: approvedScope
      ? liveEvidenceCaptured
        ? "Approved scope may prepare bounded DataHub write-back under the runtime mutation gate."
        : "Approved scope exists, but live MCP evidence is still required before write-back."
      : "No DataHub mutation is authorized yet."
  };
}

function groundingMode(run) {
  if (run.mode === "fixture") return "FIXTURE_DEMO";
  if (run.liveEvidence) return "DATAHUB_WITH_STORED_RAW_MCP_EVIDENCE";
  return "DATAHUB_PENDING_LIVE_EVIDENCE";
}

export function buildAiGroundingInput(run) {
  const source = plainObject(run, "run");
  const request = plainObject(source.request, "run.request");
  const impact = plainObject(source.impact, "run.impact");
  const risk = plainObject(source.risk, "run.risk");
  const artifacts = plainObject(source.artifacts, "run.artifacts");
  const target = plainObject(impact.target, "run.impact.target");
  if (!Array.isArray(impact.impacted)) fail("run.impact.impacted must be an array.");
  if (!Array.isArray(risk.findings)) fail("run.risk.findings must be an array.");
  if (!Array.isArray(artifacts.files)) fail("run.artifacts.files must be an array.");
  if (!Array.isArray(source.evidence)) fail("run.evidence must be an array.");

  const bundle = {
    schemaVersion: AI_SCHEMA_VERSION,
    product: "ContextSeal",
    generatedFromRunId: requiredString(source.runId, "run.runId", 64),
    mode: requiredString(source.mode, "run.mode", 32),
    runState: requiredString(source.state, "run.state", 64),
    evidenceBoundary: {
      groundingMode: groundingMode(source),
      authority: AI_OUTPUT_DISCLAIMER,
      contextState: source.evidence.find((item) => item.claim === "DataHub context retrieved")?.state || "UNKNOWN",
      impactState: source.evidence.find((item) => item.claim === "Downstream impact paths traced")?.state || "UNKNOWN"
    },
    request: {
      targetUrn: requiredString(request.targetUrn, "run.request.targetUrn", 512),
      entityName: requiredString(request.entityName, "run.request.entityName", 256),
      changeType: requiredString(request.changeType, "run.request.changeType", 64),
      sourceField: requiredString(request.sourceField, "run.request.sourceField", 128),
      destinationField: optionalString(request.destinationField, "run.request.destinationField", 128),
      destinationType: optionalString(request.destinationType, "run.request.destinationType", 128),
      requestedBy: requiredString(request.requestedBy, "run.request.requestedBy", 256),
      rationale: requiredString(request.rationale, "run.request.rationale", 600)
    },
    target: {
      ...assetSummary(target),
      tags: Array.isArray(target.tags) ? target.tags.slice(0, 5).map((item, index) => requiredString(item, `run.impact.target.tags[${index}]`, 128)) : [],
      terms: Array.isArray(target.terms) ? target.terms.slice(0, 5).map((item, index) => requiredString(item, `run.impact.target.terms[${index}]`, 128)) : [],
      assertionCount: Array.isArray(target.assertions) ? target.assertions.length : 0,
      incidentCount: Array.isArray(target.incidents) ? target.incidents.length : 0
    },
    impact: {
      totalAssets: requiredNumber(impact.counts?.total, "run.impact.counts.total"),
      highCriticalityAssets: requiredNumber(impact.counts?.highCriticality, "run.impact.counts.highCriticality"),
      byType: plainObject(impact.counts?.byType || {}, "run.impact.counts.byType"),
      impactedAssets: impact.impacted.slice(0, 12).map(assetSummary)
    },
    risk: {
      score: requiredNumber(risk.score, "run.risk.score"),
      verdict: requiredString(risk.verdict, "run.risk.verdict", 64),
      findings: risk.findings.slice(0, 8).map(findingSummary)
    },
    migration: {
      strategy: requiredString(artifacts.strategy, "run.artifacts.strategy", 128),
      summary: requiredString(artifacts.summary, "run.artifacts.summary", 600),
      files: artifacts.files.slice(0, 8).map((file, index) => ({
        path: requiredString(file.path, `run.artifacts.files[${index}].path`, 256),
        kind: requiredString(file.kind, `run.artifacts.files[${index}].kind`, 64)
      }))
    },
    queryEvidence: queryEvidence(source),
    writebackIntent: writebackIntent(source),
    evidence: source.evidence.map(evidenceSummary),
    guidanceConstraints: [
      AI_OUTPUT_DISCLAIMER,
      "Do not change the deterministic verdict, score, or evidence states.",
      "Do not claim warehouse execution unless the evidence state for execution is PASS.",
      "Do not claim live query usage unless the grounded input explicitly says live proof exists.",
      "Do not propose direct destructive schema operations when ContextSeal generated a safer staged migration."
    ],
    requiredOutputs: ["ownerAlert", "migrationRationale", "reviewerNoteDraft", "nextStepGuidance"]
  };
  return validateAiGroundingInput(bundle);
}

export function validateAiGroundingInput(bundle) {
  const source = plainObject(bundle, "aiGroundingInput");
  if (source.schemaVersion !== AI_SCHEMA_VERSION) fail(`aiGroundingInput.schemaVersion must equal ${AI_SCHEMA_VERSION}.`);
  requiredString(source.product, "aiGroundingInput.product", 64);
  requiredString(source.generatedFromRunId, "aiGroundingInput.generatedFromRunId", 64);
  requiredString(source.mode, "aiGroundingInput.mode", 32);
  requiredString(source.runState, "aiGroundingInput.runState", 64);
  plainObject(source.evidenceBoundary, "aiGroundingInput.evidenceBoundary");
  plainObject(source.request, "aiGroundingInput.request");
  plainObject(source.target, "aiGroundingInput.target");
  plainObject(source.impact, "aiGroundingInput.impact");
  plainObject(source.risk, "aiGroundingInput.risk");
  plainObject(source.migration, "aiGroundingInput.migration");
  plainObject(source.queryEvidence, "aiGroundingInput.queryEvidence");
  plainObject(source.writebackIntent, "aiGroundingInput.writebackIntent");
  if (!Array.isArray(source.evidence) || !source.evidence.length) fail("aiGroundingInput.evidence must contain at least one item.");
  stringArray(source.guidanceConstraints, "aiGroundingInput.guidanceConstraints", { min: 3, maxItems: 8, maxLength: 240 });
  stringArray(source.requiredOutputs, "aiGroundingInput.requiredOutputs", { min: 4, maxItems: 4, maxLength: 64 });
  return source;
}

export function validateAiOutput(value) {
  const source = typeof value === "string" ? JSON.parse(value) : value;
  const output = plainObject(source, "aiOutput");
  if (output.schemaVersion !== AI_SCHEMA_VERSION) fail(`aiOutput.schemaVersion must equal ${AI_SCHEMA_VERSION}.`);
  if (requiredString(output.disclaimer, "aiOutput.disclaimer", 120) !== AI_OUTPUT_DISCLAIMER) {
    fail("aiOutput.disclaimer must match the required deterministic-authority disclaimer.");
  }

  const ownerAlert = plainObject(output.ownerAlert, "aiOutput.ownerAlert");
  const migrationRationale = plainObject(output.migrationRationale, "aiOutput.migrationRationale");
  const reviewerNoteDraft = plainObject(output.reviewerNoteDraft, "aiOutput.reviewerNoteDraft");
  const nextStepGuidance = plainObject(output.nextStepGuidance, "aiOutput.nextStepGuidance");

  return {
    schemaVersion: AI_SCHEMA_VERSION,
    disclaimer: AI_OUTPUT_DISCLAIMER,
    ownerAlert: {
      title: requiredString(ownerAlert.title, "aiOutput.ownerAlert.title", 120),
      summary: requiredString(ownerAlert.summary, "aiOutput.ownerAlert.summary", 400),
      bullets: stringArray(ownerAlert.bullets, "aiOutput.ownerAlert.bullets", { min: 2, maxItems: 4, maxLength: 180 })
    },
    migrationRationale: {
      summary: requiredString(migrationRationale.summary, "aiOutput.migrationRationale.summary", 500),
      safeguards: stringArray(migrationRationale.safeguards, "aiOutput.migrationRationale.safeguards", { min: 2, maxItems: 5, maxLength: 180 })
    },
    reviewerNoteDraft: {
      subject: requiredString(reviewerNoteDraft.subject, "aiOutput.reviewerNoteDraft.subject", 160),
      body: requiredString(reviewerNoteDraft.body, "aiOutput.reviewerNoteDraft.body", 1200)
    },
    nextStepGuidance: {
      immediateActions: stringArray(nextStepGuidance.immediateActions, "aiOutput.nextStepGuidance.immediateActions", { min: 2, maxItems: 5, maxLength: 180 }),
      afterApproval: stringArray(nextStepGuidance.afterApproval, "aiOutput.nextStepGuidance.afterApproval", { min: 1, maxItems: 4, maxLength: 180 })
    }
  };
}