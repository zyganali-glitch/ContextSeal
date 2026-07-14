function finding(code, severity, weight, message, evidence) {
  return { code, severity, weight, message, evidence };
}

export function evaluateRisk({ request, context, impact, policy, now = new Date() }) {
  const findings = [];
  const target = impact.target;
  const weights = policy.riskWeights;
  const isBreaking = ["drop_column", "rename_column", "type_change"].includes(request.changeType);

  if ((target.incidents || []).some((item) => item.state === "ACTIVE")) {
    findings.push(finding("ACTIVE_INCIDENT", "BLOCKER", weights.activeIncident,
      "The target has an active DataHub incident; changing it can hide or amplify an unresolved failure.",
      target.incidents.filter((item) => item.state === "ACTIVE").map((item) => item.urn)));
  }
  if (isBreaking && impact.counts.total > 0) {
    findings.push(finding("BREAKING_LINEAGE", "HIGH", weights.breakingDownstream,
      `A breaking change reaches ${impact.counts.total} downstream assets.`, impact.impacted.map((item) => item.urn)));
  }
  const sensitiveSignals = [...(target.tags || []), ...(target.terms || [])]
    .filter((item) => /pii|personal|email|sensitive/i.test(item));
  if (sensitiveSignals.length) {
    findings.push(finding("SENSITIVE_DATA", "HIGH", weights.sensitiveData,
      "The target contains privacy or sensitive-data governance signals.", sensitiveSignals));
  }
  const queryHits = (context.queries || []).filter((query) =>
    query.datasetUrn === request.targetUrn && query.sql.toLowerCase().includes(request.sourceField.toLowerCase()));
  if (queryHits.length) {
    findings.push(finding("LIVE_QUERY_USAGE", "HIGH", weights.queryUsage,
      `${queryHits.length} observed queries reference the field.`, queryHits.map((item) => item.id)));
  }
  const ownerless = [target, ...impact.impacted].filter((asset) => !(asset.owners || []).length);
  if (ownerless.length) {
    findings.push(finding("MISSING_OWNER", "MEDIUM", weights.missingOwner,
      `${ownerless.length} affected assets have no accountable owner.`, ownerless.map((item) => item.urn)));
  }
  if (!(target.assertions || []).length) {
    findings.push(finding("NO_ASSERTION_COVERAGE", "MEDIUM", weights.missingAssertions,
      "No DataHub assertion protects the target before and after the migration.", [request.targetUrn]));
  }
  const observedAt = new Date(context.observedAt);
  const ageHours = (now.getTime() - observedAt.getTime()) / 3_600_000;
  if (!Number.isFinite(ageHours) || ageHours > policy.contextMaxAgeHours) {
    findings.push(finding("STALE_CONTEXT", "HIGH", weights.staleContext,
      `DataHub context is older than the ${policy.contextMaxAgeHours}-hour policy.`, [context.observedAt]));
  }

  const score = Math.min(100, findings.reduce((sum, item) => sum + item.weight, 0));
  const hasBlocker = findings.some((item) => item.severity === "BLOCKER");
  const verdict = hasBlocker || score >= policy.blockedScore
    ? "BLOCKED"
    : score >= policy.approvalRequiredScore ? "REVIEW_REQUIRED" : "LOW_RISK";

  return { score, verdict, findings, contextAgeHours: Number.isFinite(ageHours) ? Math.max(0, ageHours) : null };
}
