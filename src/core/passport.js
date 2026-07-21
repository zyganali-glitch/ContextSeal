import { sha256 } from "./hash.js";

export function buildPassport(run, approval, now = new Date()) {
  const artifactHashes = run.artifacts.files.map((file) => ({ path: file.path, sha256: sha256(file.content) }));
  const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const body = {
    passportVersion: "1.0",
    runId: run.runId,
    status: approval.decision === "APPROVE" ? "CERTIFIED" : "REJECTED",
    mode: run.mode,
    targetUrn: run.request.targetUrn,
    requestHash: sha256(run.request),
    contextHash: sha256(run.context),
    risk: { verdict: run.risk.verdict, score: run.risk.score, findingCodes: run.risk.findings.map((item) => item.code) },
    impact: run.impact.counts,
    migrationStrategy: run.artifacts.strategy,
    artifactGroundingContractVersion: run.artifacts.grounding?.contractVersion || null,
    artifactGroundingRuleId: run.artifacts.grounding?.migrationRule?.ruleId || null,
    artifactHashes,
    evidence: run.evidence,
    approval: { reviewer: approval.reviewer, note: approval.note, decision: approval.decision, decidedAt: now.toISOString() },
    validUntil
  };
  return { ...body, passportId: `csp_${sha256(body).slice(0, 20)}`, manifestHash: sha256(body) };
}
