import { validateApproval, validateChangeRequest } from "./contracts.js";
import { sha256 } from "./hash.js";
import { traceImpact } from "./impact.js";
import { evaluateRisk } from "./risk.js";
import { buildArtifactManifest, generateArtifacts } from "./artifacts.js";
import { buildPassport } from "./passport.js";

function liveImpactInvariant(context, liveEvidence, impact, maxHops) {
  const summary = liveEvidence?.summary;
  const lineage = context?.provenance?.lineage;
  const schema = context?.provenance?.schema;
  const rawEvidence = liveEvidence?.evidence;
  const capturedTools = Array.isArray(rawEvidence)
    ? [...new Set(rawEvidence.map((item) => item?.tool).filter(Boolean))]
    : null;
  const schemaPageCount = Array.isArray(rawEvidence)
    ? rawEvidence.filter((item) => item?.tool === "list_schema_fields").length
    : null;
  const target = context?.assets?.find((item) => item?.urn === context?.targetUrn);
  const impactedUrns = (impact?.impacted || []).map((item) => item?.urn).filter(Boolean).sort();
  const downstreamUrns = Array.isArray(lineage?.downstreamUrns) ? [...lineage.downstreamUrns].sort() : null;

  return Number.isSafeInteger(maxHops) && maxHops > 0
    && Array.isArray(rawEvidence) && liveEvidence.rawEvidenceHash === sha256(rawEvidence)
    && Array.isArray(liveEvidence?.tools) && liveEvidence.tools.includes("list_schema_fields")
    && capturedTools !== null && sha256(capturedTools) === sha256(liveEvidence.tools)
    && sha256(liveEvidence.tools) === sha256(context?.provenance?.toolTypes)
    && summary?.toolCount === rawEvidence.length && summary?.targetEntityCount === 1
    && schema?.authority === "list_schema_fields" && schema.complete === true
    && schema.totalFieldCount === summary?.schemaFieldCount
    && schema.pageCount === summary?.schemaPageCount && schema.pageCount === schemaPageCount
    && target?.schemaFields?.length === schema.totalFieldCount
    && lineage?.maxHops === maxHops && summary?.maxHops === maxHops
    && lineage?.discoveredAssetCount === impact?.counts?.total
    && lineage?.pathTargetCount === impact?.counts?.total
    && lineage?.exactPathCount === summary?.pathCount
    && summary?.downstreamAssetCount === impact?.counts?.total
    && summary?.pathTargetCount === impact?.counts?.total
    && context?.provenance?.queryRecordsReported === summary?.queryCount
    && context?.provenance?.queryTextsAvailable === summary?.queryTextCount
    && downstreamUrns !== null && sha256(downstreamUrns) === sha256(impactedUrns)
    && impact.impacted.every((item) => Number.isSafeInteger(item.hops) && item.hops >= 1 && item.hops <= maxHops);
}

export function analyzeChange({
  request: rawRequest,
  context,
  policy,
  mode = "fixture",
  liveEvidence = null,
  now = new Date()
}) {
  const request = validateChangeRequest(rawRequest);
  const impact = traceImpact(context, request.targetUrn, policy.impactMaxHops);
  const liveContextVerified = mode === "datahub"
    && context?.evidenceBoundary === "LIVE_DATAHUB_MCP_NORMALIZED"
    && context?.targetUrn === request.targetUrn
    && liveEvidence?.targetUrn === request.targetUrn
    && liveEvidence?.rawEvidenceHash === context?.provenance?.rawEvidenceHash
    && liveImpactInvariant(context, liveEvidence, impact, policy.impactMaxHops);
  const risk = evaluateRisk({ request, context, impact, policy, now });
  const artifacts = generateArtifacts(request, impact, risk);
  const runId = `csr_${sha256({
    version: "contextseal-run-v2",
    mode,
    request,
    normalizedContext: context,
    rawEvidence: liveEvidence?.evidence || null,
    policy,
    artifactStrategy: artifacts.strategy
  }).slice(0, 32)}`;
  const contextState = mode === "datahub" ? (liveContextVerified ? "PASS" : "NOT_RUN") : "FIXTURE";
  const impactState = mode === "datahub"
    ? (liveContextVerified ? (impact.counts.total ? "PASS" : "WARN") : (context?.evidenceBoundary === "LIVE_DATAHUB_MCP_NORMALIZED" ? "NOT_RUN" : "FIXTURE"))
    : (impact.counts.total ? "PASS" : "WARN");
  const contextArtifact = liveContextVerified
    ? `${liveEvidence.summary.toolCount} MCP calls; ${liveEvidence.summary.downstreamAssetCount} downstream assets; ${liveEvidence.summary.pathCount} exact paths`
    : mode === "datahub" ? null : "fixture context snapshot";

  return {
    runId,
    state: "AWAITING_HUMAN",
    mode,
    createdAt: now.toISOString(),
    policyVersion: policy.policyVersion,
    policyHash: sha256(policy),
    request,
    context,
    impact,
    risk,
    artifacts,
    ...(liveEvidence ? { liveEvidence } : {}),
    evidence: [
      { claim: "DataHub context retrieved", state: contextState, artifact: contextArtifact },
      {
        claim: "Target field validated in schema",
        state: mode === "datahub" ? (liveContextVerified ? "PASS" : "NOT_RUN") : "FIXTURE",
        artifact: liveContextVerified ? request.sourceField : mode === "fixture" ? "fixture schema contract" : null
      },
      {
        claim: "Downstream impact paths traced",
        state: impactState,
        artifact: impactState === "PASS" || impactState === "WARN"
          ? `${impact.counts.total} assets across exact paths`
          : impactState === "FIXTURE" ? "fixture impact paths" : null
      },
      { claim: "Migration artifacts generated", state: "PASS", artifact: `${artifacts.files.length} generated files; grounding contract ${artifacts.grounding.contractVersion}` },
      { claim: "Generated SQL executed in warehouse", state: "NOT_RUN", artifact: null },
      { claim: "Human scope approval recorded", state: "NOT_RUN", artifact: null },
      { claim: "DataHub write-back completed", state: "NOT_RUN", artifact: null },
      { claim: "Durable DataHub read-back verified", state: "NOT_RUN", artifact: null }
    ]
  };
}

export function decideRun(run, rawApproval, now = new Date()) {
  if (run.state !== "AWAITING_HUMAN") throw new Error(`Run is not awaiting approval: ${run.state}`);
  const approval = validateApproval(rawApproval);
  const decidedAt = now.toISOString();
  const decidedApproval = { ...approval, decidedAt };
  const evidence = run.evidence.map((item) =>
    item.claim === "Human scope approval recorded" ? { ...item, state: "PASS", artifact: approval.reviewer } : item);
  const decided = {
    ...run,
    state: approval.decision === "APPROVE" ? "APPROVED_FOR_WRITEBACK" : "REJECTED",
    approval: decidedApproval,
    evidence
  };
  const passport = buildPassport(decided, decidedApproval, now);
  const manifest = buildArtifactManifest(decided, passport);
  return {
    ...decided,
    artifacts: { ...run.artifacts, manifest },
    passport,
    evidence
  };
}
