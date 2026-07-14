import { ContractError } from "../core/contracts.js";
import { sha256 } from "../core/hash.js";
import { traceImpact } from "../core/impact.js";
import { containsRuntimeCredential } from "../security/credential-scan.js";

const REQUIRED_TOOL_TYPES = ["get_entities", "list_schema_fields", "get_lineage", "get_lineage_paths_between", "get_dataset_queries"];
const DEFAULT_SCHEMA_PAGE_SIZE = 100;
const DEFAULT_MAX_SCHEMA_FIELDS = 10_000;
const DEFAULT_MAX_LIVE_EVIDENCE_BYTES = 32 * 1024 * 1024;

export class LiveContextError extends ContractError {
  constructor(message, details = []) {
    super(message, details);
    this.name = "LiveContextError";
  }
}

export function contentPayload(result) {
  if (!result) throw new LiveContextError("DataHub MCP returned an empty tool result.");
  if (result.structuredContent != null) return result.structuredContent;
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) return result;
  try {
    return JSON.parse(text);
  } catch {
    throw new LiveContextError("DataHub MCP returned non-JSON text where structured metadata was required.");
  }
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LiveContextError(`${label} must be an object.`);
  }
  return value;
}

function urn(value) {
  return typeof value === "string" && value.startsWith("urn:li:") ? value : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function nonNegativeCount(value, label) {
  if (value == null || value === "") throw new LiveContextError(`${label} is missing.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new LiveContextError(`${label} must be a non-negative integer.`);
  return parsed;
}

function positiveCount(value, label) {
  const parsed = nonNegativeCount(value, label);
  if (parsed === 0) throw new LiveContextError(`${label} must be greater than zero.`);
  return parsed;
}

function assertBooleanMetadata(value, label) {
  if (value != null && typeof value !== "boolean") throw new LiveContextError(`${label} must be a boolean when present.`);
}

function entityType(entity) {
  if (typeof entity.type === "string" && entity.type) return entity.type.toUpperCase();
  const match = String(entity.urn || "").match(/^urn:li:([^:(]+)/);
  const type = match?.[1] || "entity";
  return type.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
}

function ownerUrns(entity) {
  const values = Array.isArray(entity.owners) ? entity.owners : entity.ownership?.owners || [];
  return unique(values.map((item) => {
    if (typeof item === "string") return item;
    return item?.owner?.urn || item?.urn;
  }));
}

function tagNames(entity) {
  const values = Array.isArray(entity.tags) ? entity.tags : entity.tags?.tags || [];
  return unique(values.map((item) => {
    const value = typeof item === "string" ? item : item?.tag?.urn || item?.urn || item?.name;
    return value?.startsWith("urn:li:tag:") ? value.slice("urn:li:tag:".length) : value;
  }));
}

function termNames(entity) {
  const values = Array.isArray(entity.terms) ? entity.terms : entity.glossaryTerms?.terms || [];
  return unique(values.map((item) => {
    const value = typeof item === "string" ? item : item?.term?.urn || item?.urn || item?.name;
    return value?.startsWith("urn:li:glossaryTerm:") ? value.slice("urn:li:glossaryTerm:".length) : value;
  }));
}

function assertionUrns(entity) {
  const values = Array.isArray(entity.assertions) ? entity.assertions : entity.assertions?.assertions || [];
  return unique(values.map((item) => typeof item === "string" ? item : item?.assertion?.urn || item?.urn));
}

function incidents(entity) {
  const explicit = Array.isArray(entity.incidents) ? entity.incidents : entity.incidents?.incidents || [];
  const normalized = explicit.map((item, index) => ({
    urn: item?.urn || item?.incident?.urn || `datahub-incident-${index + 1}`,
    state: String(item?.state || item?.status || "UNKNOWN").toUpperCase()
  }));
  const incidentHealth = (entity.health || []).filter((item) => item?.type === "INCIDENTS" && item?.status && item.status !== "PASS");
  normalized.push(...incidentHealth.map((item, index) => ({
    urn: `datahub-health-incident-${index + 1}`,
    state: "ACTIVE"
  })));
  return normalized;
}

function schemaFields(entity) {
  return (entity.schemaMetadata?.fields || []).filter((item) => typeof item?.fieldPath === "string").map((item) => ({
    fieldPath: item.fieldPath,
    nativeDataType: item.nativeDataType || null,
    nullable: item.nullable ?? null
  }));
}

function schemaField(field, label) {
  if (!field || typeof field !== "object" || Array.isArray(field)
      || typeof field.fieldPath !== "string" || !field.fieldPath.trim()) {
    throw new LiveContextError(`${label} must contain an inspectable non-empty fieldPath.`);
  }
  return {
    fieldPath: field.fieldPath,
    nativeDataType: field.nativeDataType || field.type || null,
    nullable: field.nullable ?? null
  };
}

// Official mcp-server-datahub v0.6.0 returns these exact pagination fields:
// urn, fields, totalFields, returned, remainingCount, matchingCount, and offset.
// A result wrapper is also accepted because MCP structured-content adapters may
// preserve the same official dictionary beneath `result`.
function schemaPage(payload, args, targetUrn) {
  const value = record(payload, "list_schema_fields payload");
  const container = value.result && typeof value.result === "object" && !Array.isArray(value.result)
    && ("fields" in value.result || "totalFields" in value.result)
    ? record(value.result, "list_schema_fields payload.result")
    : value;
  if (args?.urn !== targetUrn || container.urn !== targetUrn) {
    throw new LiveContextError("A list_schema_fields page is not bound to the requested target URN.");
  }
  if (args.keywords != null) {
    throw new LiveContextError("Authoritative schema enumeration must not use keyword filtering.");
  }
  const requestedLimit = positiveCount(args?.limit, "list_schema_fields requested limit");
  const requestedOffset = nonNegativeCount(args?.offset, "list_schema_fields requested offset");
  const totalFields = nonNegativeCount(container.totalFields, "list_schema_fields totalFields");
  const returned = nonNegativeCount(container.returned, "list_schema_fields returned");
  const remainingCount = nonNegativeCount(container.remainingCount, "list_schema_fields remainingCount");
  const responseOffset = nonNegativeCount(container.offset, "list_schema_fields offset");
  if (container.matchingCount !== null) {
    throw new LiveContextError("Unfiltered list_schema_fields evidence must report matchingCount as null.");
  }
  if (!Array.isArray(container.fields)) {
    throw new LiveContextError("list_schema_fields fields must be an inspectable array.");
  }
  const fields = container.fields.map((field, index) => schemaField(field, `list_schema_fields field ${index + 1}`));
  if (responseOffset !== requestedOffset) {
    throw new LiveContextError("list_schema_fields response offset does not match its request.");
  }
  if (returned !== fields.length || returned > requestedLimit) {
    throw new LiveContextError("list_schema_fields returned metadata does not match its field array or requested limit.");
  }
  if (requestedOffset > totalFields || requestedOffset + returned > totalFields
      || remainingCount !== totalFields - requestedOffset - returned) {
    throw new LiveContextError("list_schema_fields count metadata is inconsistent.");
  }
  if (remainingCount > 0 && returned === 0) {
    throw new LiveContextError("list_schema_fields made no pagination progress while fields remain; schema evidence is truncated.");
  }
  return { fields, totalFields, returned, remainingCount, offset: responseOffset, limit: requestedLimit };
}

function completeSchemaFields(schemaCalls, targetUrn) {
  if (!Array.isArray(schemaCalls) || schemaCalls.length === 0) {
    throw new LiveContextError("Live evidence requires at least one unfiltered list_schema_fields page.");
  }
  const fields = [];
  const fieldPaths = new Set();
  let expectedOffset = 0;
  let totalFields = null;
  let pageLimit = null;
  for (const call of schemaCalls) {
    const page = schemaPage(call.payload, call.arguments, targetUrn);
    if (page.offset !== expectedOffset) {
      throw new LiveContextError("list_schema_fields pages are missing, duplicated, or out of order.");
    }
    if (totalFields === null) totalFields = page.totalFields;
    else if (page.totalFields !== totalFields) {
      throw new LiveContextError("list_schema_fields totalFields changed during pagination.");
    }
    if (pageLimit === null) pageLimit = page.limit;
    else if (page.limit !== pageLimit) {
      throw new LiveContextError("list_schema_fields page limits changed during authoritative enumeration.");
    }
    for (const field of page.fields) {
      if (fieldPaths.has(field.fieldPath)) {
        throw new LiveContextError(`list_schema_fields returned a duplicate fieldPath: ${field.fieldPath}`);
      }
      fieldPaths.add(field.fieldPath);
      fields.push(field);
    }
    expectedOffset += page.returned;
    if (page.remainingCount === 0 && call !== schemaCalls.at(-1)) {
      throw new LiveContextError("list_schema_fields evidence contains pages after the complete schema was returned.");
    }
  }
  if (expectedOffset !== totalFields || schemaPage(schemaCalls.at(-1).payload, schemaCalls.at(-1).arguments, targetUrn).remainingCount !== 0) {
    throw new LiveContextError("list_schema_fields pagination is incomplete; ContextSeal refuses to infer field absence.");
  }
  return { fields, totalFields, pageCount: schemaCalls.length };
}

function normalizeEntity(entity) {
  const entityUrn = urn(entity?.urn);
  if (!entityUrn) throw new LiveContextError("DataHub entity is missing a valid URN.");
  const tags = tagNames(entity);
  return {
    urn: entityUrn,
    name: entity.name || entity.properties?.name || entityUrn,
    type: entityType(entity),
    platform: entity.platform?.name || entity.platform?.urn || null,
    criticality: tags.some((item) => /tier.?1|critical/i.test(item)) ? "HIGH" : "MEDIUM",
    owners: ownerUrns(entity),
    tags,
    terms: termNames(entity),
    assertions: assertionUrns(entity),
    incidents: incidents(entity),
    schemaFields: schemaFields(entity)
  };
}

export function extractEntities(payload, label = "get_entities payload") {
  const value = record(payload, label);
  const candidates = [value.result, value.entities, value.results, value.searchResults];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map((item) => item?.entity || item).filter(Boolean);
  }
  if (value.result && typeof value.result === "object") {
    return extractEntities(value.result, `${label}.result`);
  }
  throw new LiveContextError(`${label} does not contain an entity array.`);
}

function lineageResults(payload) {
  const value = record(payload, "get_lineage payload");
  const downstreams = value.downstreams || value.result?.downstreams || value;
  const results = downstreams.searchResults || downstreams.results || downstreams.entities;
  assertBooleanMetadata(downstreams.hasMore, "get_lineage hasMore");
  if (!Array.isArray(results)) {
    const total = nonNegativeCount(downstreams.total, "get_lineage total");
    if (total === 0 && downstreams.hasMore !== true
        && (downstreams.returned == null || nonNegativeCount(downstreams.returned, "get_lineage returned") === 0)
        && (downstreams.offset == null || nonNegativeCount(downstreams.offset, "get_lineage offset") === 0)) return [];
    throw new LiveContextError("get_lineage reported downstream assets without returning structured results.");
  }
  const total = nonNegativeCount(downstreams.total, "get_lineage total");
  if (downstreams.offset != null && nonNegativeCount(downstreams.offset, "get_lineage offset") !== 0) {
    throw new LiveContextError("get_lineage did not start at offset zero; impact evidence is incomplete.");
  }
  if (downstreams.returned != null && nonNegativeCount(downstreams.returned, "get_lineage returned") !== results.length) {
    throw new LiveContextError("get_lineage returned-count metadata does not match its structured results.");
  }
  if (total !== results.length) {
    throw new LiveContextError("get_lineage total does not match the complete returned result set.", [
      `reported total ${total}`,
      `returned records ${results.length}`
    ]);
  }
  if (downstreams.hasMore === true) {
    throw new LiveContextError("get_lineage results were truncated; ContextSeal refuses to certify incomplete impact evidence.");
  }
  const normalized = results.map((item) => ({ entity: item?.entity || item, degree: Number(item?.degree ?? 0) }));
  const returnedUrns = normalized.map((item) => urn(item.entity?.urn));
  if (returnedUrns.some((item) => !item) || new Set(returnedUrns).size !== returnedUrns.length) {
    throw new LiveContextError("get_lineage returned missing or duplicate downstream URNs.");
  }
  return normalized;
}

function pathResult(payload, expectedSource, expectedTarget, maxHops) {
  const value = record(payload, "get_lineage_paths_between payload");
  const rawSource = value.source || value.sourceUrn || value.source_urn;
  const rawTarget = value.target || value.targetUrn || value.target_urn;
  const source = typeof rawSource === "string" ? rawSource : rawSource?.urn;
  const target = typeof rawTarget === "string" ? rawTarget : rawTarget?.urn;
  if (source !== expectedSource || target !== expectedTarget) {
    throw new LiveContextError("A lineage-path response did not match its requested endpoints.", [
      `expected ${expectedSource} -> ${expectedTarget}`,
      `received ${source || "missing"} -> ${target || "missing"}`
    ]);
  }
  if (!Array.isArray(value.paths) || value.paths.length === 0) {
    throw new LiveContextError(`No exact lineage path was returned for downstream asset ${expectedTarget}.`);
  }
  assertBooleanMetadata(value.hasMore, "get_lineage_paths_between hasMore");
  if (value.hasMore === true) {
    throw new LiveContextError(`Lineage paths were truncated for downstream asset ${expectedTarget}.`);
  }
  const paths = value.paths.map((entry) => {
    const nodes = Array.isArray(entry) ? entry : entry?.path;
    if (!Array.isArray(nodes) || nodes.length < 2) {
      throw new LiveContextError(`Malformed lineage path for downstream asset ${expectedTarget}.`);
    }
    const normalized = nodes.map((node) => ({ urn: urn(typeof node === "string" ? node : node?.urn), type: node?.type || null }));
    if (normalized.some((node) => !node.urn) || normalized[0].urn !== expectedSource || normalized.at(-1).urn !== expectedTarget) {
      throw new LiveContextError(`Lineage path endpoints do not match ${expectedSource} -> ${expectedTarget}.`);
    }
    if (normalized.length - 1 > maxHops) {
      throw new LiveContextError(`Lineage path for ${expectedTarget} exceeds requested maxHops ${maxHops}.`);
    }
    if (new Set(normalized.map((node) => node.urn)).size !== normalized.length) {
      throw new LiveContextError(`Lineage path for ${expectedTarget} contains a cycle or repeated node.`);
    }
    return normalized;
  });
  if (!Number.isSafeInteger(Number(value.pathCount)) || Number(value.pathCount) !== paths.length) {
    throw new LiveContextError(`Lineage path count is inconsistent for downstream asset ${expectedTarget}.`);
  }
  if (value.total != null && Number(value.total) !== paths.length) {
    throw new LiveContextError(`Lineage path total is inconsistent for downstream asset ${expectedTarget}.`);
  }
  if (value.returned != null && Number(value.returned) !== paths.length) {
    throw new LiveContextError(`Lineage path returned-count is inconsistent for downstream asset ${expectedTarget}.`);
  }
  return paths;
}

function queryItems(payload, targetUrn) {
  const value = record(payload, "get_dataset_queries payload");
  const container = value.result && typeof value.result === "object" && !Array.isArray(value.result) ? value.result : value;
  const candidates = [container.queries, container.results, container.searchResults];
  const returned = candidates.find(Array.isArray);
  assertBooleanMetadata(container.hasMore, "get_dataset_queries hasMore");
  const reportedTotal = nonNegativeCount(container.total, "get_dataset_queries total");
  if (container.start != null && nonNegativeCount(container.start, "get_dataset_queries start") !== 0) {
    throw new LiveContextError("get_dataset_queries did not start at offset zero; query evidence is incomplete.");
  }
  if (container.hasMore === true) {
    throw new LiveContextError("get_dataset_queries results were truncated; ContextSeal refuses to certify incomplete query evidence.");
  }
  if (!returned && reportedTotal > 0) {
    throw new LiveContextError("get_dataset_queries reported queries without returning structured query records.");
  }
  const items = returned || [];
  if (container.returned != null && nonNegativeCount(container.returned, "get_dataset_queries returned") !== items.length) {
    throw new LiveContextError("get_dataset_queries returned-count metadata does not match its query records.");
  }
  if (reportedTotal !== items.length) {
    throw new LiveContextError("get_dataset_queries total does not match the complete returned query set.", [
      `reported total ${reportedTotal}`,
      `returned records ${items.length}`
    ]);
  }
  const normalized = items.map((item, index) => {
    const explicitDatasetUrn = item?.datasetUrn || item?.dataset_urn;
    const subjects = Array.isArray(item?.subjects)
      ? item.subjects.map((subject) => typeof subject === "string" ? subject : subject?.urn || subject?.entity?.urn).filter(Boolean)
      : null;
    if (explicitDatasetUrn && explicitDatasetUrn !== targetUrn) {
      throw new LiveContextError(`A query record was returned for a different dataset: ${explicitDatasetUrn}`);
    }
    if (subjects && !subjects.includes(targetUrn)) {
      throw new LiveContextError(`A query record is not bound to the requested dataset: ${item?.urn || index + 1}`);
    }
    if (!explicitDatasetUrn && !subjects) {
      throw new LiveContextError(`Query record ${index + 1} has no inspectable dataset subject binding.`);
    }
    const sql = typeof item?.sql === "string" ? item.sql
      : typeof item?.query === "string" ? item.query
        : typeof item?.queryText === "string" ? item.queryText
          : typeof item?.statement === "string" ? item.statement
            : typeof item?.query?.sql === "string" ? item.query.sql
              : typeof item?.properties?.statement === "string" ? item.properties.statement
                : typeof item?.properties?.statement?.value === "string" ? item.properties.statement.value : null;
    if (!sql) {
      throw new LiveContextError(`Query record ${index + 1} cannot be inspected because its SQL text is missing.`);
    }
    return {
      id: String(item.id || item.queryId || item.query_id || item.urn || `datahub-query-${index + 1}`),
      datasetUrn: targetUrn,
      sql,
      source: item?.properties?.source?.value ?? item?.properties?.source ?? item?.source ?? null
    };
  });
  return { reportedTotal, queries: normalized };
}

function evidenceFor(evidence, tool) {
  return evidence.filter((item) => item.tool === tool);
}

export function normalizeLiveContext({
  targetUrn,
  sourceField,
  changeType,
  destinationField = null,
  maxHops,
  observedAt,
  evidence,
  rawEvidenceHash = sha256(evidence)
}) {
  if (!urn(targetUrn)) throw new LiveContextError("Live evidence targetUrn is invalid.");
  const requestedMaxHops = positiveCount(maxHops, "Live evidence maxHops");
  if (!Number.isFinite(Date.parse(observedAt))) throw new LiveContextError("Live evidence observedAt is invalid.");
  if (!Array.isArray(evidence)) throw new LiveContextError("Live evidence must contain MCP call records.");
  if (rawEvidenceHash !== sha256(evidence)) {
    throw new LiveContextError("Live evidence rawEvidenceHash does not match the captured MCP call array.");
  }

  const entityCalls = evidenceFor(evidence, "get_entities");
  const schemaCalls = evidenceFor(evidence, "list_schema_fields");
  const lineageCalls = evidenceFor(evidence, "get_lineage");
  const pathCalls = evidenceFor(evidence, "get_lineage_paths_between");
  const queryCalls = evidenceFor(evidence, "get_dataset_queries");
  if (entityCalls.length !== 1 || lineageCalls.length !== 1 || queryCalls.length !== 1) {
    throw new LiveContextError("Live evidence requires exactly one target entity, lineage discovery, and query call.");
  }
  if (entityCalls[0].arguments?.urns?.length !== 1 || entityCalls[0].arguments.urns[0] !== targetUrn) {
    throw new LiveContextError("get_entities evidence is not bound to the requested target URN.");
  }
  if (lineageCalls[0].arguments?.urn !== targetUrn || lineageCalls[0].arguments?.upstream !== false) {
    throw new LiveContextError("get_lineage evidence is not a downstream lookup for the requested target URN.");
  }
  if (lineageCalls[0].arguments?.max_hops !== requestedMaxHops) {
    throw new LiveContextError("get_lineage max_hops does not match the requested normalization bound.");
  }
  const requestedMaxResults = positiveCount(lineageCalls[0].arguments?.max_results, "get_lineage max_results");
  if (queryCalls[0].arguments?.urn !== targetUrn) {
    throw new LiveContextError("get_dataset_queries evidence is not bound to the requested target URN.");
  }

  const returnedTargetEntities = extractEntities(entityCalls[0].payload);
  const targetEntities = returnedTargetEntities.filter((item) => item?.urn === targetUrn);
  if (returnedTargetEntities.length !== 1 || targetEntities.length !== 1) {
    throw new LiveContextError("get_entities must return exactly the requested target entity.");
  }
  if (typeof sourceField !== "string" || !sourceField.trim()) {
    throw new LiveContextError("Live context normalization requires the requested source field.");
  }
  const completeSchema = completeSchemaFields(schemaCalls, targetUrn);
  const targetSchemaFields = completeSchema.fields.map((item) => item.fieldPath);
  if (!targetSchemaFields.includes(sourceField)) {
    throw new LiveContextError(`Requested source field is absent from the live target schema: ${sourceField}`, [
      `available fields: ${targetSchemaFields.join(", ") || "none returned"}`
    ]);
  }
  if (!new Set(["rename_column", "drop_column", "type_change"]).has(changeType)) {
    throw new LiveContextError(`Live context normalization received an unsupported change type: ${changeType || "missing"}`);
  }
  const normalizedSchemaFields = new Set(targetSchemaFields.map((item) => item.toLocaleLowerCase("en-US")));
  const normalizedSource = sourceField.toLocaleLowerCase("en-US");
  if (changeType === "rename_column") {
    if (typeof destinationField !== "string" || !destinationField.trim()) {
      throw new LiveContextError("A rename requires a non-empty destination field before live certification.");
    }
    const normalizedDestination = destinationField.trim().toLocaleLowerCase("en-US");
    if (normalizedDestination === normalizedSource) {
      throw new LiveContextError("Rename destination must differ from the source field.");
    }
    if (normalizedSchemaFields.has(normalizedDestination)) {
      throw new LiveContextError(`Rename destination already exists in the live target schema: ${destinationField}`);
    }
  }
  if (changeType === "type_change") {
    const generatedDestination = `${sourceField}_typed`;
    if (normalizedSchemaFields.has(generatedDestination.toLocaleLowerCase("en-US"))) {
      throw new LiveContextError(`Generated type-change destination already exists in the live target schema: ${generatedDestination}`);
    }
  }
  const discovery = lineageResults(lineageCalls[0].payload);
  if (discovery.length > requestedMaxResults) {
    throw new LiveContextError("get_lineage returned more downstream assets than its requested max_results bound.");
  }
  const discoveredByUrn = new Map();
  for (const item of discovery) {
    const entityUrn = urn(item.entity?.urn);
    if (!entityUrn || entityUrn === targetUrn) throw new LiveContextError("get_lineage returned an invalid downstream entity.");
    discoveredByUrn.set(entityUrn, item);
  }
  if (pathCalls.length !== discoveredByUrn.size) {
    throw new LiveContextError("Exact lineage-path coverage does not match the discovered downstream asset set.");
  }

  const allPaths = [];
  const covered = new Set();
  for (const call of pathCalls) {
    const source = call.arguments?.source_urn;
    const target = call.arguments?.target_urn;
    if (source !== targetUrn || !discoveredByUrn.has(target) || call.arguments?.direction !== "downstream" || covered.has(target)) {
      throw new LiveContextError("A lineage-path call is duplicated, unbound, or outside the discovered downstream set.");
    }
    const paths = pathResult(call.payload, targetUrn, target, requestedMaxHops);
    allPaths.push(...paths);
    covered.add(target);
  }

  const assetsByUrn = new Map();
  assetsByUrn.set(targetUrn, { ...normalizeEntity(targetEntities[0]), schemaFields: completeSchema.fields });
  for (const [entityUrn, item] of discoveredByUrn) {
    assetsByUrn.set(entityUrn, { ...normalizeEntity(item.entity), reportedDegree: item.degree || null });
  }
  for (const path of allPaths) {
    for (const node of path) {
      if (!assetsByUrn.has(node.urn)) {
        assetsByUrn.set(node.urn, normalizeEntity({ urn: node.urn, type: node.type, name: node.urn }));
      }
    }
  }
  const edgeKeys = new Set();
  const edges = [];
  for (const path of allPaths) {
    for (let index = 0; index < path.length - 1; index += 1) {
      const from = path[index].urn;
      const to = path[index + 1].urn;
      const key = `${from}\u0000${to}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ from, to, scope: "ENTITY" });
    }
  }
  const queryData = queryItems(queryCalls[0].payload, targetUrn);
  const toolTypes = unique(evidence.map((item) => item.tool));
  for (const required of REQUIRED_TOOL_TYPES) {
    if (!toolTypes.includes(required) && !(required === "get_lineage_paths_between" && discoveredByUrn.size === 0)) {
      throw new LiveContextError(`Required live evidence tool is missing: ${required}`);
    }
  }

  const normalizedContext = {
    source: "DataHub MCP live",
    observedAt,
    evidenceBoundary: "LIVE_DATAHUB_MCP_NORMALIZED",
    targetUrn,
    assets: [...assetsByUrn.values()],
    edges,
    queries: queryData.queries,
    provenance: {
      rawEvidenceHash,
      toolTypes,
      schema: {
        authority: "list_schema_fields",
        complete: true,
        totalFieldCount: completeSchema.totalFields,
        pageCount: completeSchema.pageCount
      },
      lineage: {
        discoveredAssetCount: discoveredByUrn.size,
        exactPathCount: allPaths.length,
        pathTargetCount: covered.size,
        downstreamUrns: [...discoveredByUrn.keys()].sort(),
        maxHops: requestedMaxHops,
        scope: "ENTITY"
      },
      queryRecordsReported: queryData.reportedTotal,
      queryTextsAvailable: queryData.queries.length
    }
  };
  const normalizedImpact = traceImpact(normalizedContext, targetUrn, requestedMaxHops);
  const impactedUrns = new Set(normalizedImpact.impacted.map((item) => item.urn));
  if (impactedUrns.size !== discoveredByUrn.size
      || [...discoveredByUrn.keys()].some((entityUrn) => !impactedUrns.has(entityUrn))
      || normalizedImpact.impacted.some((item) => !Number.isSafeInteger(item.hops) || item.hops < 1 || item.hops > requestedMaxHops)) {
    throw new LiveContextError("Normalized traceImpact scope and hop bounds do not exactly match the discovered downstream endpoint set.");
  }
  return {
    normalizedContext,
    summary: {
      toolCount: evidence.length,
      targetEntityCount: 1,
      schemaFieldCount: completeSchema.totalFields,
      schemaPageCount: completeSchema.pageCount,
      downstreamAssetCount: discoveredByUrn.size,
      queryCount: queryData.reportedTotal,
      queryTextCount: queryData.queries.length,
      pathCount: allPaths.length,
      pathTargetCount: covered.size,
      maxHops: requestedMaxHops
    },
    toolTypes
  };
}

export async function collectLiveEvidence(client, request, {
  maxHops = 5,
  maxResults = 100,
  schemaPageSize = DEFAULT_SCHEMA_PAGE_SIZE,
  maxSchemaFields = DEFAULT_MAX_SCHEMA_FIELDS,
  maxEvidenceBytes = DEFAULT_MAX_LIVE_EVIDENCE_BYTES,
  now = new Date()
} = {}) {
  const requestedMaxHops = positiveCount(maxHops, "collector maxHops");
  const requestedMaxResults = positiveCount(maxResults, "collector maxResults");
  const requestedSchemaPageSize = positiveCount(schemaPageSize, "collector schemaPageSize");
  const requestedMaxSchemaFields = positiveCount(maxSchemaFields, "collector maxSchemaFields");
  const requestedMaxEvidenceBytes = positiveCount(maxEvidenceBytes, "collector maxEvidenceBytes");
  const initialization = await client.initialize();
  const mcp = {
    protocolVersion: initialization?.protocolVersion || null,
    serverInfo: initialization?.serverInfo ? {
      name: initialization.serverInfo.name || null,
      version: initialization.serverInfo.version || null
    } : null,
    launcher: typeof client.provenance === "function"
      ? client.provenance()
      : { transport: "UNATTESTED", launcherPackage: null }
  };
  if (containsRuntimeCredential(JSON.stringify(mcp))) {
    throw new LiveContextError("DataHub MCP provenance contained credential-like material and was rejected.");
  }
  const observedAt = now.toISOString();
  const evidence = [];
  let evidenceBytes = 0;
  const call = async (tool, args) => {
    const result = await client.callTool(tool, args);
    const payload = contentPayload(result);
    const record = { tool, arguments: args, payload };
    let serialized;
    try { serialized = JSON.stringify(record); }
    catch { throw new LiveContextError("DataHub MCP evidence was not safely serializable and was rejected."); }
    if (containsRuntimeCredential(serialized)) {
      throw new LiveContextError("DataHub MCP evidence contained credential-like material and was rejected.");
    }
    evidenceBytes += Buffer.byteLength(serialized, "utf8");
    if (evidenceBytes > requestedMaxEvidenceBytes) {
      throw new LiveContextError("DataHub MCP evidence exceeded the fail-closed aggregate size limit.");
    }
    evidence.push(record);
    return payload;
  };

  await call("get_entities", { urns: [request.targetUrn] });
  let schemaOffset = 0;
  let schemaTotal = null;
  do {
    const args = { urn: request.targetUrn, limit: requestedSchemaPageSize, offset: schemaOffset };
    const page = schemaPage(await call("list_schema_fields", args), args, request.targetUrn);
    if (schemaTotal === null) {
      schemaTotal = page.totalFields;
      if (schemaTotal > requestedMaxSchemaFields) {
        throw new LiveContextError(`Target schema reports ${schemaTotal} fields, exceeding the fail-closed collector bound ${requestedMaxSchemaFields}.`);
      }
    } else if (page.totalFields !== schemaTotal) {
      throw new LiveContextError("Target schema changed while list_schema_fields pagination was in progress.");
    }
    schemaOffset += page.returned;
    if (page.remainingCount === 0) break;
  } while (schemaOffset <= requestedMaxSchemaFields);
  if (schemaTotal === null || schemaOffset !== schemaTotal) {
    throw new LiveContextError("Target schema pagination did not complete within the fail-closed collector bound.");
  }
  const lineagePayload = await call("get_lineage", {
    urn: request.targetUrn,
    upstream: false,
    max_hops: requestedMaxHops,
    max_results: requestedMaxResults
  });
  const downstreamUrns = unique(lineageResults(lineagePayload).map((item) => item.entity?.urn));
  for (const targetUrn of downstreamUrns) {
    await call("get_lineage_paths_between", {
      source_urn: request.targetUrn,
      target_urn: targetUrn,
      direction: "downstream"
    });
  }
  await call("get_dataset_queries", { urn: request.targetUrn });

  const rawEvidenceHash = sha256(evidence);
  const normalized = normalizeLiveContext({
    targetUrn: request.targetUrn,
    sourceField: request.sourceField,
    changeType: request.changeType,
    destinationField: request.destinationField,
    maxHops: requestedMaxHops,
    observedAt,
    evidence,
    rawEvidenceHash
  });
  return {
    observedAt,
    targetUrn: request.targetUrn,
    rawEvidenceHash,
    mcp,
    summary: normalized.summary,
    tools: normalized.toolTypes,
    evidence,
    evidenceBoundary: "Raw MCP responses are hash-bound; complete paginated target schema and exact bounded entity-level lineage paths are normalized for deterministic analysis.",
    normalizedContext: normalized.normalizedContext
  };
}
