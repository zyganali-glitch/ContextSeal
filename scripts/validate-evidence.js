import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sha256 } from "../src/core/hash.js";
import { generateArtifacts } from "../src/core/artifacts.js";
import { traceImpact } from "../src/core/impact.js";
import { evaluateRisk } from "../src/core/risk.js";
import { normalizeLiveContext } from "../src/datahub/live-context.js";

const ALLOWED_STATES = new Set(["PASS", "WARN", "FAIL", "NOT_RUN", "STALE", "FIXTURE"]);
const BASE_READ_TOOLS = ["get_entities", "list_schema_fields", "get_lineage", "get_dataset_queries"];
const MUTATION_TOOLS = ["add_structured_properties", "update_description", "save_document"];
const COMMITTED_MCP_PACKAGE = "mcp-server-datahub@0.6.0";

export class EvidenceValidationError extends Error {
  constructor(details) {
    super(`Evidence validation failed (${details.length} issue${details.length === 1 ? "" : "s"}).`);
    this.name = "EvidenceValidationError";
    this.details = details;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getClaim(evidence, claim) {
  return Array.isArray(evidence) ? evidence.find((item) => item?.claim === claim) : undefined;
}

function validateCommittedMcpProvenance(mcp, label, errors) {
  if (!isRecord(mcp)
      || typeof mcp.protocolVersion !== "string" || !mcp.protocolVersion
      || typeof mcp.serverInfo?.name !== "string" || !mcp.serverInfo.name
      || typeof mcp.serverInfo?.version !== "string" || !mcp.serverInfo.version) {
    errors.push(`${label}: MCP handshake provenance is missing or invalid.`);
  }
  if (mcp?.launcher?.transport !== "stdio" || mcp?.launcher?.launcherPackage !== COMMITTED_MCP_PACKAGE) {
    errors.push(`${label}: committed proof must attest the pinned ${COMMITTED_MCP_PACKAGE} stdio launcher without persisting command paths.`);
  }
}

function entityFromCalls(calls, targetUrn) {
  const call = calls.find((item) => item?.tool === "get_entities" && item.arguments?.urns?.includes(targetUrn));
  const payload = call?.payload;
  const candidates = [payload?.result, payload?.entities, payload?.results, payload?.searchResults];
  const values = candidates.find(Array.isArray) || [];
  return values.map((item) => item?.entity || item).find((item) => item?.urn === targetUrn);
}

function fixtureMarkers(entity) {
  return new Map((entity?.properties?.customProperties || []).map((item) => [item?.key, String(item?.value)]));
}

function literalPresentInMatches(payload, literal) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results.some((result) => (result?.matches || []).some((match) =>
    Object.values(match || {}).some((value) => typeof value === "string" && value.includes(literal))));
}

function discoveredTargets(calls) {
  const lineage = calls.find((item) => item?.tool === "get_lineage");
  const downstreams = lineage?.payload?.downstreams || lineage?.payload?.result?.downstreams || lineage?.payload;
  const results = downstreams?.searchResults || downstreams?.results || downstreams?.entities;
  return new Set((Array.isArray(results) ? results : []).map((item) => (item?.entity || item)?.urn).filter(Boolean));
}

function queryTotal(calls) {
  const queries = calls.find((item) => item?.tool === "get_dataset_queries");
  const total = queries?.payload?.total ?? queries?.payload?.result?.total;
  return Number.isInteger(total) ? total : null;
}

function validateRawCalls(calls, targetUrn, sourceField, maxHops, errors, label, expectedTargets = null) {
  if (!Array.isArray(calls) || calls.length === 0) {
    errors.push(`${label}: evidence must be a non-empty MCP call array.`);
    return { targets: new Set(), pathCalls: [], pathCount: 0, queryCount: null, schemaFieldCount: null, entity: null };
  }

  for (const [index, call] of calls.entries()) {
    if (!isRecord(call) || typeof call.tool !== "string" || !isRecord(call.arguments) || !isRecord(call.payload)) {
      errors.push(`${label}: call ${index + 1} must preserve tool, arguments, and payload.`);
    }
    if (call?.isError === true || call?.payload?.isError === true) errors.push(`${label}: ${call.tool || `call ${index + 1}`} reports isError=true.`);
  }

  for (const tool of BASE_READ_TOOLS) {
    if (!calls.some((item) => item?.tool === tool)) errors.push(`${label}: required MCP tool ${tool} is missing.`);
  }

  const entityCall = calls.find((item) => item?.tool === "get_entities");
  if (!entityCall?.arguments?.urns?.includes(targetUrn)) errors.push(`${label}: get_entities does not target ${targetUrn}.`);
  for (const tool of ["get_lineage", "get_dataset_queries"]) {
    const call = calls.find((item) => item?.tool === tool);
    if (call?.arguments?.urn !== targetUrn) errors.push(`${label}: ${tool} target does not match the certified URN.`);
  }

  const entity = entityFromCalls(calls, targetUrn);
  if (!entity) errors.push(`${label}: get_entities payload does not contain the certified target.`);
  const schemaCalls = calls.filter((item) => item?.tool === "list_schema_fields");
  const fields = schemaCalls.flatMap((item) => {
    const payload = isRecord(item?.payload?.result) ? item.payload.result : item?.payload;
    return Array.isArray(payload?.fields) ? payload.fields : [];
  });
  if (!fields.some((field) => field?.fieldPath === sourceField)) {
    errors.push(`${label}: authoritative list_schema_fields evidence does not contain requested sourceField ${sourceField}.`);
  }

  const targets = discoveredTargets(calls);
  if (targets.size === 0) errors.push(`${label}: get_lineage did not preserve any discovered downstream targets.`);
  const paths = calls.filter((item) => item?.tool === "get_lineage_paths_between");
  let pathCount = 0;
  const covered = new Set();
  for (const pathCall of paths) {
    if (pathCall.arguments?.source_urn !== targetUrn || pathCall.arguments?.direction !== "downstream") {
      errors.push(`${label}: lineage-path call has an inconsistent source or direction.`);
    }
    const target = pathCall.arguments?.target_urn;
    if (covered.has(target)) errors.push(`${label}: duplicate exact-path call for ${target}.`);
    if (typeof target === "string") covered.add(target);
    const rawPayloadSource = pathCall.payload?.source || pathCall.payload?.sourceUrn || pathCall.payload?.source_urn;
    const rawPayloadTarget = pathCall.payload?.target || pathCall.payload?.targetUrn || pathCall.payload?.target_urn;
    const payloadSource = typeof rawPayloadSource === "string" ? rawPayloadSource : rawPayloadSource?.urn;
    const payloadTarget = typeof rawPayloadTarget === "string" ? rawPayloadTarget : rawPayloadTarget?.urn;
    if (payloadSource !== targetUrn || payloadTarget !== target) errors.push(`${label}: exact-path payload endpoints do not match its arguments.`);
    const returnedPaths = pathCall.payload?.paths;
    if (!Array.isArray(returnedPaths) || returnedPaths.length === 0) {
      errors.push(`${label}: exact-path payload for ${target} is empty.`);
      continue;
    }
    pathCount += returnedPaths.length;
    for (const entry of returnedPaths) {
      const nodes = Array.isArray(entry) ? entry : entry?.path;
      const urns = Array.isArray(nodes) ? nodes.map((node) => typeof node === "string" ? node : node?.urn) : [];
      if (urns.length < 2 || urns[0] !== targetUrn || urns.at(-1) !== target) errors.push(`${label}: returned path endpoints are inconsistent for ${target}.`);
      if (!Number.isSafeInteger(maxHops) || maxHops <= 0 || urns.length - 1 > maxHops) {
        errors.push(`${label}: returned path for ${target} exceeds or lacks the policy maxHops bound.`);
      }
    }
  }
  const coverageTargets = expectedTargets || targets;
  for (const target of coverageTargets) {
    if (!covered.has(target)) errors.push(`${label}: no exact path evidence was captured for ${target}.`);
  }
  for (const target of covered) {
    if (!targets.has(target)) errors.push(`${label}: path evidence target ${target} was not discovered by get_lineage.`);
  }

  const total = queryTotal(calls);
  if (total === null || total < 0) errors.push(`${label}: get_dataset_queries payload.total must be a non-negative integer.`);
  return { targets, pathCalls: paths, pathCount, queryCount: total, schemaFieldCount: fields.length, entity };
}

function verifyManifest(passport, errors) {
  if (!isRecord(passport)) {
    errors.push("writeback: passport is missing.");
    return;
  }
  const { passportId, manifestHash, ...body } = passport;
  const calculated = sha256(body);
  if (manifestHash !== calculated) errors.push("writeback: passport manifestHash does not match its canonical body.");
  if (passportId !== `csp_${calculated.slice(0, 20)}`) errors.push("writeback: passportId is not derived from manifestHash.");
}

function propertyMap(entity) {
  const properties = entity?.structuredProperties?.properties;
  const result = new Map();
  for (const item of Array.isArray(properties) ? properties : []) {
    const key = item?.structuredProperty?.definition?.qualifiedName || item?.structuredProperty?.urn?.replace("urn:li:structuredProperty:", "");
    const value = item?.values?.[0];
    if (key) result.set(key, value?.stringValue ?? value?.numberValue ?? value?.booleanValue);
  }
  return result;
}

function verificationState(value) {
  if (value === true) return "PASS";
  if (typeof value === "string") return value;
  return value?.state || null;
}

export function validateEvidenceBundle({ readEvidence, writebackEvidence, policy }) {
  const errors = [];
  const envelope = writebackEvidence;
  const run = envelope?.run;
  if (!isRecord(readEvidence)) errors.push("read: evidence artifact must be an object.");
  if (!isRecord(envelope) || !isRecord(run)) errors.push("writeback: evidence artifact must contain a run object.");
  if (errors.length) throw new EvidenceValidationError(errors);

  const boundary = `${readEvidence.evidenceBoundary || ""} ${envelope.evidenceBoundary || ""}`;
  if (!/synthetic/i.test(boundary) || !/(?:disposable|local)/i.test(boundary) || !/no (?:production|customer)/i.test(boundary)) {
    errors.push("boundary: committed proof must explicitly identify disposable/local synthetic data and exclude production/customer data.");
  }
  if (readEvidence.status !== "PASS") errors.push("read: top-level status must be PASS.");
  if (readEvidence.contextsealMutationGateEnabled !== false) {
    errors.push("read: final capture must show ContextSeal's runtime mutation gate disabled.");
  }
  if (run.mode !== "datahub") errors.push("writeback: committed live proof must use datahub mode.");
  if (run.state !== "CERTIFIED_AND_WRITTEN_BACK") errors.push("writeback: run must end in CERTIFIED_AND_WRITTEN_BACK.");

  const targetUrn = run.request?.targetUrn;
  const sourceField = run.request?.sourceField;
  if (typeof targetUrn !== "string" || typeof sourceField !== "string") errors.push("writeback: request targetUrn and sourceField are required.");
  const expectedTargets = new Set((run.impact?.impacted || []).map((item) => item?.urn).filter(Boolean));
  if (expectedTargets.size !== run.impact?.counts?.total) errors.push("writeback: impact count does not match unique impacted URNs.");

  const live = validateRawCalls(run.liveEvidence?.evidence, targetUrn, sourceField, policy?.impactMaxHops, errors, "writeback.liveEvidence", expectedTargets);
  const finalRead = validateRawCalls(readEvidence.evidence, targetUrn, sourceField, policy?.impactMaxHops, errors, "read", expectedTargets);
  for (const [entity, label] of [[live.entity, "writeback.liveEvidence"], [finalRead.entity, "read"]]) {
    const markers = fixtureMarkers(entity);
    if (markers.get("contextseal_fixture") !== "true" || markers.get("evidence_boundary") !== "synthetic-local") {
      errors.push(`${label}: raw target entity is not marked contextseal_fixture=true and evidence_boundary=synthetic-local.`);
    }
  }
  if (readEvidence.targetUrn !== targetUrn || run.liveEvidence?.targetUrn !== targetUrn || run.passport?.targetUrn !== targetUrn || run.impact?.target?.urn !== targetUrn) {
    errors.push("target: request, impact, live evidence, read evidence, and passport URNs must match.");
  }
  for (const target of live.targets) if (!expectedTargets.has(target)) errors.push(`writeback: discovered target ${target} is missing from normalized impact.`);
  for (const target of expectedTargets) if (!live.targets.has(target)) errors.push(`writeback: normalized impact target ${target} is missing from discovery evidence.`);

  if (run.liveEvidence?.rawEvidenceHash !== sha256(run.liveEvidence?.evidence)) errors.push("writeback: rawEvidenceHash does not bind the raw MCP call array.");
  if (readEvidence.rawEvidenceHash !== sha256(readEvidence.evidence)) errors.push("read: rawEvidenceHash does not bind the post-write MCP call array.");
  let recomputedContext = null;
  try {
    const recomputed = normalizeLiveContext({
      targetUrn,
      sourceField,
      changeType: run.request?.changeType,
      destinationField: run.request?.destinationField,
      maxHops: policy?.impactMaxHops,
      observedAt: run.liveEvidence?.observedAt,
      evidence: run.liveEvidence?.evidence,
      rawEvidenceHash: run.liveEvidence?.rawEvidenceHash
    });
    recomputedContext = recomputed.normalizedContext;
    if (sha256(recomputed.normalizedContext) !== sha256(run.context)) {
      errors.push("writeback: normalized context does not exactly match deterministic normalization of raw live evidence.");
    }
    if (sha256(recomputed.summary) !== sha256(run.liveEvidence?.summary)
        || sha256(recomputed.toolTypes) !== sha256(run.liveEvidence?.tools)) {
      errors.push("writeback: live summary/tool list does not match deterministic raw-evidence normalization.");
    }
  } catch (error) {
    errors.push(`writeback: raw live evidence cannot be deterministically normalized (${error.message}).`);
  }
  let finalRecomputed = null;
  try {
    finalRecomputed = normalizeLiveContext({
      targetUrn,
      sourceField,
      changeType: run.request?.changeType,
      destinationField: run.request?.destinationField,
      maxHops: policy?.impactMaxHops,
      observedAt: readEvidence.observedAt,
      evidence: readEvidence.evidence,
      rawEvidenceHash: readEvidence.rawEvidenceHash
    });
  } catch (error) {
    errors.push(`read: raw post-write evidence cannot be deterministically normalized (${error.message}).`);
  }
  if (!Array.isArray(policy?.supportedChanges) || !policy.supportedChanges.includes(run.request?.changeType)) {
    errors.push("writeback: active policy does not support the certified change type.");
  }
  if (recomputedContext) {
    try {
      const recomputedImpact = traceImpact(recomputedContext, targetUrn, policy.impactMaxHops);
      const recomputedRisk = evaluateRisk({ request: run.request, context: recomputedContext, impact: recomputedImpact, policy, now: new Date(run.createdAt) });
      const recomputedArtifacts = generateArtifacts(run.request, recomputedImpact, recomputedRisk);
      if (sha256(recomputedImpact) !== sha256(run.impact)) errors.push("writeback: impact does not match recomputation from bound live context and policy.");
      if (sha256(recomputedRisk) !== sha256(run.risk)) errors.push("writeback: risk does not match recomputation from bound live context and policy.");
      if (sha256(recomputedArtifacts) !== sha256(run.artifacts)) errors.push("writeback: generated artifacts do not match deterministic recomputation.");
    } catch (error) {
      errors.push(`writeback: deterministic impact/risk/artifact recomputation failed (${error.message}).`);
    }
  }
  const summary = run.liveEvidence?.summary;
  if (summary?.toolCount !== run.liveEvidence?.evidence?.length) errors.push("writeback: live evidence toolCount is incorrect.");
  if (summary?.targetEntityCount !== 1 || !live.entity) errors.push("writeback: targetEntityCount does not match the exact get_entities target result.");
  if (summary?.schemaFieldCount !== live.schemaFieldCount) errors.push("writeback: schemaFieldCount does not match authoritative list_schema_fields pages.");
  if (summary?.maxHops !== policy?.impactMaxHops || (run.impact?.impacted || []).some((item) => item?.hops > policy?.impactMaxHops)) {
    errors.push("writeback: live evidence and normalized impact exceed or do not bind the policy maxHops value.");
  }
  if (summary?.pathCount !== live.pathCount || summary?.pathTargetCount !== expectedTargets.size) errors.push("writeback: path summary does not match exact-path evidence coverage.");
  if (summary?.downstreamAssetCount !== expectedTargets.size) errors.push("writeback: downstreamAssetCount does not match normalized impact.");
  if (summary?.queryCount !== live.queryCount) errors.push("writeback: queryCount must use get_dataset_queries.payload.total.");
  if (!finalRecomputed
      || sha256(readEvidence.summary) !== sha256(finalRecomputed.summary)
      || readEvidence.summary?.toolCount !== readEvidence.evidence?.length
      || readEvidence.summary?.targetEntityCount !== 1
      || readEvidence.summary?.schemaFieldCount !== finalRead.schemaFieldCount
      || readEvidence.summary?.pathCount !== finalRead.pathCount
      || readEvidence.summary?.pathTargetCount !== expectedTargets.size
      || readEvidence.summary?.downstreamAssetCount !== expectedTargets.size
      || readEvidence.summary?.queryCount !== finalRead.queryCount) {
    errors.push("read: post-write summary does not match its raw MCP evidence.");
  }
  const finalReadTools = [...new Set(readEvidence.evidence?.map((item) => item?.tool).filter(Boolean))];
  if (!Array.isArray(readEvidence.tools) || sha256(readEvidence.tools) !== sha256(finalReadTools) || !isRecord(readEvidence.mcp)) {
    errors.push("read: MCP tool/server metadata does not match the final capture.");
  }
  validateCommittedMcpProvenance(readEvidence.mcp, "read", errors);

  const passport = run.passport;
  verifyManifest(passport, errors);
  if (!/^2(?:\.|$)/.test(String(passport?.passportVersion || ""))) errors.push("writeback: committed passport must use the evidence-bound v2 contract.");
  if (passport?.status !== "CERTIFIED" || passport?.runId !== run.runId) errors.push("writeback: passport status/runId is inconsistent with the certified run.");
  if (passport?.createdAt !== run.createdAt || passport?.mode !== run.mode) errors.push("writeback: passport creation/mode provenance is inconsistent with the run.");
  if (passport?.requestHash !== sha256(run.request)) errors.push("writeback: passport requestHash mismatch.");
  if (passport?.contextHash !== sha256(run.context)) errors.push("writeback: passport contextHash mismatch.");
  if (run.policyVersion !== policy?.policyVersion || run.policyHash !== sha256(policy)) errors.push("writeback: run policy version/hash mismatch.");
  if (passport?.policy?.version !== policy?.policyVersion || passport?.policy?.sha256 !== sha256(policy)) errors.push("writeback: passport policy binding mismatch.");
  if (passport?.liveEvidence?.rawEvidenceHash !== run.liveEvidence?.rawEvidenceHash || passport?.liveEvidence?.targetUrn !== targetUrn) {
    errors.push("writeback: passport does not bind the live evidence hash and target.");
  }
  if (passport?.liveEvidence?.observedAt !== run.liveEvidence?.observedAt
      || !isRecord(passport?.liveEvidence?.summary) || !isRecord(summary)
      || sha256(passport.liveEvidence.summary) !== sha256(summary)) {
    errors.push("writeback: passport live-evidence timestamp/summary does not match the captured evidence.");
  }
  if (!isRecord(run.liveEvidence?.mcp) || sha256(passport?.liveEvidence?.mcp) !== sha256(run.liveEvidence?.mcp)) errors.push("writeback: passport MCP server metadata binding mismatch.");
  validateCommittedMcpProvenance(run.liveEvidence?.mcp, "writeback", errors);
  const requiredTools = [...BASE_READ_TOOLS, "get_lineage_paths_between"];
  for (const tool of requiredTools) if (!passport?.liveEvidence?.tools?.includes(tool)) errors.push(`writeback: passport live-evidence tool list is missing ${tool}.`);
  const capturedTools = [...new Set(run.liveEvidence?.evidence?.map((item) => item?.tool).filter(Boolean))];
  if (!Array.isArray(passport?.liveEvidence?.tools) || sha256(passport.liveEvidence.tools) !== sha256(capturedTools)) {
    errors.push("writeback: passport tool list does not exactly match captured MCP tools.");
  }

  const artifactHashes = new Map((passport?.artifactHashes || []).map((item) => [item?.path, item?.sha256]));
  if (artifactHashes.size !== run.artifacts?.files?.length) errors.push("writeback: passport artifact hash count mismatch.");
  for (const file of run.artifacts?.files || []) {
    if (artifactHashes.get(file.path) !== sha256(file.content)) errors.push(`writeback: artifact hash mismatch for ${file.path}.`);
  }
  const expectedRiskBinding = {
    verdict: run.risk?.verdict,
    score: run.risk?.score,
    findingCodes: (run.risk?.findings || []).map((item) => item.code),
    sha256: sha256(run.risk)
  };
  if (sha256(passport?.risk) !== sha256(expectedRiskBinding)) errors.push("writeback: passport risk binding does not match deterministic run risk.");
  if (sha256(passport?.impact) !== sha256(run.impact?.counts) || passport?.impactHash !== sha256(run.impact)) {
    errors.push("writeback: passport impact counts/path binding does not match the run.");
  }
  if (passport?.migrationStrategy !== run.artifacts?.strategy || passport?.migrationSummary !== run.artifacts?.summary) {
    errors.push("writeback: passport migration strategy/summary does not match generated artifacts.");
  }
  if (sha256(passport?.approval) !== sha256(run.approval)) errors.push("writeback: passport approval binding does not exactly match the run decision.");

  for (const item of [...(run.evidence || []), ...(passport?.evidence || [])]) {
    if (!ALLOWED_STATES.has(item?.state)) errors.push(`evidence: invalid state ${item?.state || "<missing>"}.`);
  }
  const passportClaims = passport?.evidence;
  for (const [claim, state] of [
    ["DataHub context retrieved", "PASS"],
    ["Target field validated in schema", "PASS"],
    ["Entity-level downstream impact traced", "PASS"],
    ["Migration artifacts generated", "PASS"],
    ["Generated SQL executed in warehouse", "NOT_RUN"],
    ["Human scope approval recorded", "PASS"],
    ["DataHub write-back completed", "NOT_RUN"],
    ["Durable DataHub read-back verified", "NOT_RUN"]
  ]) {
    if (getClaim(passportClaims, claim)?.state !== state) errors.push(`writeback: passport claim "${claim}" must be ${state}.`);
  }
  if (getClaim(run.evidence, "DataHub write-back completed")?.state !== "PASS") errors.push("writeback: outer run must record completed write-back as PASS.");
  if (getClaim(run.evidence, "Durable DataHub read-back verified")?.state !== "PASS") errors.push("writeback: outer run must record durable read-back as PASS.");
  if (run.approval?.decision !== "APPROVE" || run.approval?.scopeAccepted !== true || passport?.approval?.decision !== "APPROVE") {
    errors.push("writeback: explicit scoped human approval is missing or inconsistent.");
  }

  const receipts = run.writeback?.mutationReceipts;
  if (!Array.isArray(receipts) || receipts.length !== MUTATION_TOOLS.length) errors.push("writeback: exactly three bounded mutation receipts are required.");
  for (const tool of MUTATION_TOOLS) {
    const receipt = receipts?.find((item) => item?.tool === tool);
    if (receipt?.status !== "PASS" || receipt?.result?.isError !== false || receipt?.result?.structuredContent?.success !== true) {
      errors.push(`writeback: ${tool} must preserve PASS, isError:false, and success:true.`);
    }
  }

  const readback = run.writeback?.readback;
  if (readback?.state !== "PASS" || readback?.targetUrn !== targetUrn || !Array.isArray(readback?.evidence) || readback.evidence.length === 0) {
    errors.push("writeback: post-mutation readback must be a non-empty PASS for the certified target.");
  }
  if (verificationState(readback?.verified?.structuredProperties) !== "PASS" || verificationState(readback?.verified?.description) !== "PASS") {
    errors.push("writeback: structured properties and description must be read back and verified.");
  }
  const relatedDocument = readback?.verified?.relatedDocument;
  if (verificationState(relatedDocument) !== "PASS") errors.push("writeback: exact saved-document retrieval must be PASS in committed proof.");
  const expectedDocumentTitle = `Change Passport ${passport?.passportId}`;
  const savedDocumentUrn = receipts?.find((item) => item?.tool === "save_document")?.result?.structuredContent?.urn;
  if (!savedDocumentUrn || relatedDocument?.urn !== savedDocumentUrn || relatedDocument?.title !== expectedDocumentTitle) {
    errors.push("writeback: saved-document receipt and readback identity/title do not match.");
  }
  for (const binding of ["passportId", "manifestHash", "targetUrn"]) {
    if (relatedDocument?.verified?.[binding] !== true) errors.push(`writeback: related document did not verify ${binding}.`);
  }
  const targetReadback = readback?.evidence?.find((item) => item?.tool === "get_entities" && item.arguments?.urns?.includes(targetUrn));
  if (targetReadback?.state !== "PASS" || !entityFromCalls([targetReadback], targetUrn)) errors.push("writeback: readback evidence does not contain a successful certified-target get_entities call.");
  const documentReads = (readback?.evidence || []).filter((item) => item?.tool === "grep_documents");
  if (documentReads.length !== 3 || documentReads.some((item) => item?.state !== "PASS" || item?.arguments?.urns?.length !== 1 || item.arguments.urns[0] !== savedDocumentUrn)) {
    errors.push("writeback: committed proof must preserve three successful hash/target document retrieval checks.");
  }
  for (const [binding, literal] of Object.entries({
    passportId: passport?.passportId,
    manifestHash: passport?.manifestHash,
    targetUrn
  })) {
    const exactBindingRead = documentReads.find((item) => {
      const results = Array.isArray(item?.payload?.results) ? item.payload.results : [];
      return results.some((result) => result?.urn === savedDocumentUrn && result?.title === expectedDocumentTitle)
        && literalPresentInMatches(item.payload, literal);
    });
    if (!exactBindingRead) errors.push(`writeback: document grep excerpt does not contain exact ${binding} literal.`);
  }

  const entity = finalRead.entity;
  const properties = propertyMap(entity);
  const expectedPropertyValues = new Map([
    ["io.contextseal.status", "CERTIFIED"],
    ["io.contextseal.riskScore", run.risk?.score],
    ["io.contextseal.passportId", passport?.passportId],
    ["io.contextseal.validUntil", passport?.validUntil?.slice(0, 10)]
  ]);
  const configuredProperties = policy?.writeback?.structuredProperties;
  if (!Array.isArray(configuredProperties) || configuredProperties.length === 0
      || new Set(configuredProperties).size !== configuredProperties.length) {
    errors.push("writeback: policy structured-property allowlist must be non-empty and unique.");
  } else {
    for (const name of configuredProperties) {
      if (!expectedPropertyValues.has(name)) errors.push(`writeback: policy contains unsupported structured property ${name}.`);
      else if (properties.get(name) !== expectedPropertyValues.get(name)) errors.push(`read: structured property ${name} does not match the certified value.`);
    }
  }
  if (!entity?.editableProperties?.description?.includes(passport?.passportId)) errors.push("read: target description does not contain the certified passport ID.");
  const title = expectedDocumentTitle;
  const documents = entity?.relatedDocuments?.documents;
  const documentFound = Array.isArray(documents) && documents.some((item) => item?.info?.title === title);
  if (!documentFound) errors.push("read: exact related passport document title was not found on the target entity.");

  const timestamps = [
    [run.createdAt, "writeback run.createdAt"],
    [run.liveEvidence?.observedAt, "writeback liveEvidence.observedAt"],
    [passport?.approval?.decidedAt, "writeback passport approval time"],
    [run.writeback?.startedAt, "writeback start time"],
    [run.writeback?.mutationsCompletedAt || run.writeback?.at, "writeback mutation-completion time"],
    [readback?.observedAt, "writeback readback time"],
    [run.writeback?.completedAt, "writeback completion time"],
    [readEvidence.observedAt, "read observedAt"],
    [envelope.exportedAt, "writeback exportedAt"]
  ];
  for (const [value, label] of timestamps) if (!Number.isFinite(Date.parse(value))) errors.push(`${label} is missing or invalid.`);
  const liveObservedAt = Date.parse(run.liveEvidence?.observedAt);
  const createdAt = Date.parse(run.createdAt);
  const decidedAt = Date.parse(passport?.approval?.decidedAt);
  const startedAt = Date.parse(run.writeback?.startedAt);
  const mutationsCompletedAt = Date.parse(run.writeback?.mutationsCompletedAt || run.writeback?.at);
  const readbackAt = Date.parse(readback?.observedAt);
  const completedAt = Date.parse(run.writeback?.completedAt);
  const capturedAt = Date.parse(readEvidence.observedAt);
  const exportedAt = Date.parse(envelope.exportedAt);
  if ([liveObservedAt, createdAt, decidedAt, startedAt, mutationsCompletedAt, readbackAt, completedAt].every(Number.isFinite)
      && !(liveObservedAt <= createdAt
        && createdAt <= decidedAt
        && decidedAt <= startedAt
        && startedAt <= mutationsCompletedAt
        && mutationsCompletedAt <= readbackAt
        && readbackAt <= completedAt)) {
    errors.push("writeback: observe/create/approve/start/mutate/readback/complete timestamps are out of order.");
  }
  if ([completedAt, capturedAt, exportedAt].every(Number.isFinite)
      && !(completedAt <= capturedAt && capturedAt <= exportedAt)) {
    errors.push("writeback: post-write capture/export timestamps are out of order.");
  }

  if (errors.length) throw new EvidenceValidationError(errors);
  return {
    targetUrn,
    downstreamAssets: expectedTargets.size,
    mcpCalls: run.liveEvidence.evidence.length,
    mutationReceipts: receipts.length,
    passportId: passport.passportId
  };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const [readEvidence, writebackEvidence, policy] = await Promise.all([
    readFile(path.join(root, "examples/outputs/live-datahub-read-evidence.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "examples/outputs/live-datahub-writeback-evidence.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "config/policy.json"), "utf8").then(JSON.parse)
  ]);
  const result = validateEvidenceBundle({ readEvidence, writebackEvidence, policy });
  console.log(`PASS live evidence: ${result.mcpCalls} MCP reads, ${result.downstreamAssets} downstream assets, ${result.mutationReceipts} verified mutations, ${result.passportId}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    if (error instanceof EvidenceValidationError) for (const detail of error.details) console.error(`FAIL ${detail}`);
    else console.error(`FAIL ${error.message}`);
    process.exitCode = 1;
  });
}
