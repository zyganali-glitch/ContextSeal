import { sha256 } from "./hash.js";

function sqlIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return value;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function representativePaths(impact) {
  return impact.impacted.slice(0, 3).map((asset) => ({
    assetUrn: asset.urn,
    assetName: asset.name,
    assetType: asset.type,
    hops: asset.hops,
    path: asset.path
  }));
}

function buildArtifactGrounding(request, impact, risk, migration) {
  return {
    contractVersion: "1.0",
    target: {
      urn: request.targetUrn,
      entityName: request.entityName,
      type: impact.target?.type || "UNKNOWN",
      platform: impact.target?.platform || null
    },
    schemaInputs: {
      sourceField: request.sourceField,
      destinationField: request.destinationField || null,
      destinationType: request.destinationType || null,
      safeClaim: "Generated code currently uses the requested field names and target model identity. It does not yet ingest a full DataHub field-schema snapshot into the generator."
    },
    lineageInputs: {
      impactedAssetCount: impact.counts.total,
      highCriticalityAssetCount: impact.counts.highCriticality,
      impactedAssetTypes: impact.counts.byType,
      downstreamOwners: unique(impact.impacted.flatMap((asset) => asset.owners || [])).slice(0, 12),
      representativePaths: representativePaths(impact)
    },
    policyInputs: {
      verdict: risk.verdict,
      score: risk.score,
      findingCodes: risk.findings.map((item) => item.code)
    },
    migrationRule: {
      ruleId: migration.ruleId,
      strategy: migration.strategy,
      summary: migration.summary,
      safeClaim: migration.safeClaim
    },
    nonInputs: [
      "AI output does not generate or rewrite the dbt, rollback, or owner-brief artifacts.",
      "Warehouse execution state does not alter generated content before approval.",
      "Live query proof can raise deterministic risk, but it does not directly rewrite the staged migration rule."
    ]
  };
}

function groundingRefsForKind(kind) {
  switch (kind) {
    case "DBT_MODEL":
      return ["target", "schemaInputs", "policyInputs", "migrationRule"];
    case "DBT_TESTS":
      return ["target", "schemaInputs", "migrationRule"];
    case "ROLLBACK":
      return ["target", "schemaInputs", "migrationRule"];
    case "OWNER_BRIEF":
      return ["lineageInputs", "policyInputs", "migrationRule"];
    default:
      return ["migrationRule"];
  }
}

export function buildArtifactManifest(run, passport) {
  const passportHashes = new Map(passport.artifactHashes.map((item) => [item.path, item.sha256]));
  return {
    manifestVersion: "1.0",
    generatedFromRunId: run.runId,
    passportContext: {
      passportId: passport.passportId,
      manifestHash: passport.manifestHash,
      validUntil: passport.validUntil,
      status: passport.status,
      artifactGroundingContractVersion: passport.artifactGroundingContractVersion,
      artifactGroundingRuleId: passport.artifactGroundingRuleId
    },
    grounding: run.artifacts.grounding,
    artifacts: run.artifacts.files.map((file) => ({
      path: file.path,
      kind: file.kind,
      sha256: passportHashes.get(file.path) || sha256(file.content),
      groundingRefs: groundingRefsForKind(file.kind)
    }))
  };
}

function safeMigration(request) {
  const source = sqlIdentifier(request.sourceField);
  const destination = sqlIdentifier(request.destinationField || `${source}_v2`);
  const entity = sqlIdentifier(request.entityName);
  if (request.changeType === "rename_column") {
    return {
      ruleId: "RENAME_COLUMN_REQUIRES_COMPATIBILITY_FIELD",
      strategy: "EXPAND_MIGRATE_CONTRACT",
      summary: `Add ${destination}, backfill from ${source}, migrate consumers, then deprecate ${source}.`,
      safeClaim: "Direct rename requests are converted into a compatibility-field migration so downstream consumers can move before removal.",
      sql: `-- ContextSeal safe expansion: keep the old field during consumer migration\nselect\n  *,\n  ${source} as ${destination}\nfrom {{ ref('${entity}') }}\n`,
      rollback: `-- Rollback keeps the original field authoritative\nselect * exclude (${destination}) from {{ ref('${entity}_compat') }};\n`
    };
  }
  if (request.changeType === "type_change") {
    const destinationType = String(request.destinationType).replace(/[^a-zA-Z0-9_(), ]/g, "");
    return {
      ruleId: "TYPE_CHANGE_REQUIRES_PARALLEL_TYPED_FIELD",
      strategy: "PARALLEL_TYPED_FIELD",
      summary: `Create a parallel typed field and retain ${source} until validation completes.`,
      safeClaim: "Type changes create a parallel typed column so the original field stays authoritative during validation.",
      sql: `select\n  *,\n  try_cast(${source} as ${destinationType}) as ${source}_typed\nfrom {{ ref('${entity}') }}\n`,
      rollback: `select * exclude (${source}_typed) from {{ ref('${entity}_typed') }};\n`
    };
  }
  return {
    ruleId: "DROP_REQUIRES_DEPRECATION_BEFORE_REMOVAL",
    strategy: "DEPRECATE_BEFORE_DROP",
    summary: `Mark ${source} deprecated, migrate every known consumer, and drop it only in a later approved change.`,
    safeClaim: "Direct drops are refused; the generator preserves the field and emits a later-drop migration note instead.",
    sql: `-- Deliberately preserves ${source}; direct destructive removal is not generated.\nselect * from {{ ref('${entity}') }}\n`,
    rollback: `-- No destructive operation was generated; rollback is a no-op.\nselect 1;\n`
  };
}
export function generateArtifacts(request, impact, risk) {
  const migration = safeMigration(request);
  const field = request.destinationField || `${request.sourceField}_typed`;
  const schema = `version: 2\nmodels:\n  - name: ${request.entityName}_contextseal\n    description: "ContextSeal migration candidate; strategy ${migration.strategy}."\n    columns:\n      - name: ${field}\n        tests:\n          - not_null\n`;
  const ownerBrief = [
    "# Impacted owner briefing",
    "",
    `Risk verdict: **${risk.verdict}** (${risk.score}/100)`,
    `Migration strategy: **${migration.strategy}**`,
    "",
    ...impact.impacted.map((asset) => `- ${asset.name} (${asset.type}) — owners: ${(asset.owners || []).join(", ") || "UNASSIGNED"}`)
  ].join("\n");

  return {
    grounding: buildArtifactGrounding(request, impact, risk, migration),
    strategy: migration.strategy,
    summary: migration.summary,
    files: [
      { path: `generated/models/${request.entityName}_contextseal.sql`, kind: "DBT_MODEL", content: migration.sql },
      { path: `generated/models/${request.entityName}_contextseal.yml`, kind: "DBT_TESTS", content: schema },
      { path: `generated/rollback/${request.entityName}.sql`, kind: "ROLLBACK", content: migration.rollback },
      { path: "generated/IMPACTED_OWNERS.md", kind: "OWNER_BRIEF", content: ownerBrief }
    ]
  };
}
