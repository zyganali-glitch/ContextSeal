import { sha256 } from "./hash.js";
import { normalizeLiveContext } from "../datahub/live-context.js";

export class PassportVerificationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "PassportVerificationError";
    this.details = details;
  }
}

function artifactHashes(run) {
  return run.artifacts.files.map((file) => ({ path: file.path, sha256: sha256(file.content) }));
}

function liveEvidenceBinding(run) {
  if (run.mode !== "datahub") return null;
  return {
    rawEvidenceHash: run.liveEvidence?.rawEvidenceHash || null,
    observedAt: run.liveEvidence?.observedAt || null,
    targetUrn: run.liveEvidence?.targetUrn || null,
    mcp: run.liveEvidence?.mcp || null,
    tools: run.liveEvidence?.tools || [],
    summary: run.liveEvidence?.summary || null
  };
}

function riskBinding(run) {
  return {
    verdict: run.risk.verdict,
    score: run.risk.score,
    findingCodes: run.risk.findings.map((item) => item.code),
    sha256: sha256(run.risk)
  };
}

function approvalBinding(run, fallbackApproval = null, now = new Date()) {
  const approval = run.approval || fallbackApproval || {};
  return {
    reviewer: approval.reviewer,
    note: approval.note,
    decision: approval.decision,
    scopeAccepted: approval.scopeAccepted === true,
    decidedAt: approval.decidedAt || now.toISOString()
  };
}

export function buildPassport(run, approval, now = new Date()) {
  const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const body = {
    passportVersion: "2.0",
    runId: run.runId,
    createdAt: run.createdAt,
    status: approval.decision === "APPROVE" ? "CERTIFIED" : "REJECTED",
    mode: run.mode,
    targetUrn: run.request.targetUrn,
    requestHash: sha256(run.request),
    contextHash: sha256(run.context),
    policy: { version: run.policyVersion || null, sha256: run.policyHash || null },
    liveEvidence: liveEvidenceBinding(run),
    risk: riskBinding(run),
    impact: run.impact.counts,
    impactHash: sha256(run.impact),
    migrationStrategy: run.artifacts.strategy,
    migrationSummary: run.artifacts.summary,
    artifactGroundingContractVersion: run.artifacts.grounding?.contractVersion || null,
    artifactGroundingRuleId: run.artifacts.grounding?.migrationRule?.ruleId || null,
    artifactHashes: artifactHashes(run),
    evidence: run.evidence,
    approval: approvalBinding(run, approval, now),
    validUntil
  };
  const manifestHash = sha256(body);
  return { ...body, passportId: `csp_${manifestHash.slice(0, 20)}`, manifestHash };
}

export function verifyPassport(run, policy, now = new Date()) {
  const errors = [];
  const passport = run?.passport;
  if (!passport || typeof passport !== "object") {
    throw new PassportVerificationError("Certified passport is missing.", ["passport must be an object"]);
  }

  const { passportId, manifestHash, ...body } = passport;
  const expectedManifestHash = sha256(body);
  if (manifestHash !== expectedManifestHash) errors.push("passport manifest hash does not match its body");
  if (passportId !== `csp_${expectedManifestHash.slice(0, 20)}`) errors.push("passport ID does not match its manifest hash");
  if (run.state !== "APPROVED_FOR_WRITEBACK") errors.push(`run state is ${run.state}, not APPROVED_FOR_WRITEBACK`);
  if (passport.status !== "CERTIFIED" || run.approval?.decision !== "APPROVE") errors.push("run lacks a certified APPROVE decision");
  if (passport.runId !== run.runId) errors.push("passport run ID does not match the certified run");
  if (passport.createdAt !== run.createdAt) errors.push("passport creation provenance does not match the certified run");
  if (passport.mode !== run.mode) errors.push("passport mode does not match the certified run");
  if (passport.targetUrn !== run.request?.targetUrn) errors.push("passport target does not match the change request");
  if (passport.requestHash !== sha256(run.request)) errors.push("change request hash has changed since certification");
  if (passport.contextHash !== sha256(run.context)) errors.push("normalized context hash has changed since certification");
  if (policy && (passport.policy?.version !== policy.policyVersion || passport.policy?.sha256 !== sha256(policy))) {
    errors.push("policy version or hash does not match the active policy");
  }
  if (sha256(passport.artifactHashes) !== sha256(artifactHashes(run))) errors.push("generated artifact hashes have changed since certification");
  if (sha256(passport.risk) !== sha256(riskBinding(run))) errors.push("risk verdict, score, or findings have changed since certification");
  if (sha256(passport.impact) !== sha256(run.impact?.counts)) errors.push("impact counts have changed since certification");
  if (passport.impactHash !== sha256(run.impact)) errors.push("impact paths have changed since certification");
  if (passport.migrationStrategy !== run.artifacts?.strategy || passport.migrationSummary !== run.artifacts?.summary) {
    errors.push("migration strategy or summary has changed since certification");
  }
  if (passport.artifactGroundingContractVersion !== run.artifacts?.grounding?.contractVersion) {
    errors.push("artifact grounding contract version has changed since certification");
  }
  if (passport.artifactGroundingRuleId !== run.artifacts?.grounding?.migrationRule?.ruleId) {
    errors.push("artifact grounding rule ID has changed since certification");
  }
  if (sha256(passport.evidence) !== sha256(run.evidence)) errors.push("evidence manifest has changed since certification");
  if (sha256(passport.approval) !== sha256(approvalBinding(run, null, now))) {
    errors.push("approval record does not match the certified passport");
  }
  const humanEvidence = passport.evidence?.find((item) => item.claim === "Human scope approval recorded");
  if (humanEvidence?.state !== "PASS") errors.push("human approval evidence is not PASS inside the passport");

  const validUntil = Date.parse(passport.validUntil);
  if (!Number.isFinite(validUntil) || validUntil <= now.getTime()) errors.push("passport is expired or has an invalid expiry");
  const observedAt = Date.parse(run.context?.observedAt);
  const contextAgeMs = now.getTime() - observedAt;
  if (policy && (!Number.isFinite(observedAt) || contextAgeMs > policy.contextMaxAgeHours * 3_600_000 || contextAgeMs < -5 * 60_000)) {
    errors.push("certified context is stale, invalid, or unreasonably future-dated");
  }

  if (run.mode === "datahub") {
    const live = run.liveEvidence;
    const binding = passport.liveEvidence;
    if (!live || !Array.isArray(live.evidence)) errors.push("raw live MCP evidence is missing");
    else if (live.rawEvidenceHash !== sha256(live.evidence)) errors.push("raw live MCP evidence hash is invalid");
    if (sha256(binding) !== sha256(liveEvidenceBinding(run))) errors.push("passport does not bind the complete live evidence summary and provenance");
    if (binding?.targetUrn !== run.request.targetUrn || live?.targetUrn !== run.request.targetUrn) errors.push("live evidence target does not match the request");
    if (binding?.observedAt !== run.context?.observedAt || live?.observedAt !== run.context?.observedAt) {
      errors.push("live evidence timestamp does not match normalized context");
    }
    if (run.context?.evidenceBoundary !== "LIVE_DATAHUB_MCP_NORMALIZED") {
      errors.push("run context is not verified live MCP normalization");
    }
    if (run.context?.provenance?.rawEvidenceHash !== live?.rawEvidenceHash) {
      errors.push("normalized live context provenance does not bind raw MCP evidence");
    }
    if (live && Array.isArray(live.evidence) && policy) {
      try {
        const recomputed = normalizeLiveContext({
          targetUrn: run.request.targetUrn,
          sourceField: run.request.sourceField,
          changeType: run.request.changeType,
          destinationField: run.request.destinationField,
          maxHops: policy.impactMaxHops,
          observedAt: live.observedAt,
          evidence: live.evidence,
          rawEvidenceHash: live.rawEvidenceHash
        });
        if (sha256(recomputed.normalizedContext) !== sha256(run.context)) {
          errors.push("normalized live context does not exactly match the raw MCP evidence");
        }
        if (sha256(recomputed.summary) !== sha256(live.summary)
            || sha256(recomputed.toolTypes) !== sha256(live.tools)) {
          errors.push("live evidence summary or tool list does not match normalized raw MCP evidence");
        }
      } catch (error) {
        errors.push(`raw MCP evidence cannot be deterministically normalized: ${error.message}`);
      }
    }
  } else if (passport.liveEvidence !== null) {
    errors.push("fixture passport unexpectedly claims live evidence");
  }

  return { valid: errors.length === 0, errors, manifestHash: expectedManifestHash };
}

export function assertPassportValid(run, policy, now = new Date()) {
  const verification = verifyPassport(run, policy, now);
  if (!verification.valid) {
    throw new PassportVerificationError("Passport verification failed; DataHub mutations were not attempted.", verification.errors);
  }
  return verification;
}
