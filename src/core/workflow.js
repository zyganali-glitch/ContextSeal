import { validateApproval, validateChangeRequest } from "./contracts.js";
import { sha256 } from "./hash.js";
import { traceImpact } from "./impact.js";
import { evaluateRisk } from "./risk.js";
import { generateArtifacts } from "./artifacts.js";
import { buildPassport } from "./passport.js";

export function analyzeChange({ request: rawRequest, context, policy, mode = "fixture", now = new Date() }) {
  const request = validateChangeRequest(rawRequest);
  const impact = traceImpact(context, request.targetUrn, policy.impactMaxHops);
  const risk = evaluateRisk({ request, context, impact, policy, now });
  const artifacts = generateArtifacts(request, impact, risk);
  const runId = `csr_${sha256({ request, observedAt: context.observedAt, strategy: artifacts.strategy }).slice(0, 16)}`;
  const contextState = mode === "datahub" ? "NOT_RUN" : "FIXTURE";
  const impactState = mode === "datahub" && context.evidenceBoundary !== "LIVE_DATAHUB_MCP_NORMALIZED"
    ? "FIXTURE"
    : impact.counts.total ? "PASS" : "WARN";
  return {
    runId,
    state: "AWAITING_HUMAN",
    mode,
    createdAt: now.toISOString(),
    request,
    context,
    impact,
    risk,
    artifacts,
    evidence: [
      { claim: "DataHub context retrieved", state: contextState, artifact: mode === "datahub" ? null : "fixture context snapshot" },
      { claim: "Column-level impact traced", state: impactState, artifact: impactState === "FIXTURE" ? "fixture impact paths" : "impact paths" },
      { claim: "Migration artifacts generated", state: "PASS", artifact: `${artifacts.files.length} generated files` },
      { claim: "Generated SQL executed in warehouse", state: "NOT_RUN", artifact: null },
      { claim: "Human scope approval recorded", state: "NOT_RUN", artifact: null },
      { claim: "DataHub write-back completed", state: "NOT_RUN", artifact: null }
    ]
  };
}

export function decideRun(run, rawApproval, now = new Date()) {
  if (run.state !== "AWAITING_HUMAN") throw new Error(`Run is not awaiting approval: ${run.state}`);
  const approval = validateApproval(rawApproval);
  const passport = buildPassport(run, approval, now);
  const evidence = run.evidence.map((item) =>
    item.claim === "Human scope approval recorded" ? { ...item, state: "PASS", artifact: approval.reviewer } : item);
  return {
    ...run,
    state: approval.decision === "APPROVE" ? "APPROVED_FOR_WRITEBACK" : "REJECTED",
    approval,
    passport,
    evidence
  };
}
