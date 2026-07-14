function sqlIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return value;
}

function sqlType(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  const safeType = /^[a-zA-Z][a-zA-Z0-9_]*(?:\(\s*\d+\s*(?:,\s*\d+\s*)?\))?(?: [a-zA-Z][a-zA-Z0-9_]*)*$/;
  if (!safeType.test(normalized)) throw new Error(`Unsafe SQL type: ${value}`);
  return normalized;
}

function safeMigration(request) {
  const source = sqlIdentifier(request.sourceField);
  const destination = sqlIdentifier(request.destinationField || `${source}_v2`);
  const entity = sqlIdentifier(request.entityName);
  const generatedModel = `${entity}_contextseal`;
  if (request.changeType === "rename_column") {
    return {
      strategy: "EXPAND_MIGRATE_CONTRACT",
      summary: `Add ${destination}, backfill from ${source}, migrate consumers, then deprecate ${source}.`,
      testField: destination,
      sql: `-- ContextSeal safe expansion: keep the old field during consumer migration\nselect\n  *,\n  ${source} as ${destination}\nfrom {{ ref('${entity}') }}\n`,
      rollback: `-- Roll back the generated expansion while the original field remains authoritative.\nselect * exclude (${destination}) from {{ ref('${generatedModel}') }};\n`
    };
  }
  if (request.changeType === "type_change") {
    const destinationType = sqlType(request.destinationType);
    const typedField = `${source}_typed`;
    return {
      strategy: "PARALLEL_TYPED_FIELD",
      summary: `Create a parallel typed field and retain ${source} until validation completes.`,
      testField: typedField,
      sql: `-- ContextSeal parallel type migration: preserve the source while validating the cast.\nselect\n  *,\n  try_cast(${source} as ${destinationType}) as ${typedField}\nfrom {{ ref('${entity}') }}\n`,
      rollback: `-- Remove only the generated typed field; the source field was never changed.\nselect * exclude (${typedField}) from {{ ref('${generatedModel}') }};\n`
    };
  }
  if (request.changeType === "drop_column") {
    return {
      strategy: "DEPRECATE_BEFORE_DROP",
      summary: `Mark ${source} deprecated, migrate every known consumer, and drop it only in a later approved change.`,
      testField: source,
      sql: `-- Deliberately preserves ${source}; direct destructive removal is not generated.\nselect * from {{ ref('${entity}') }}\n`,
      rollback: `-- No destructive operation was generated; keep selecting the unchanged source model.\nselect * from {{ ref('${entity}') }};\n`
    };
  }
  throw new Error(`Unsupported change type: ${request.changeType}`);
}
export function generateArtifacts(request, impact, risk) {
  const migration = safeMigration(request);
  const schema = `version: 2\nmodels:\n  - name: ${request.entityName}_contextseal\n    description: "ContextSeal migration candidate; strategy ${migration.strategy}."\n    columns:\n      - name: ${migration.testField}\n        tests:\n          - not_null\n`;
  const ownerBrief = [
    "# Impacted owner briefing",
    "",
    `Risk verdict: **${risk.verdict}** (${risk.score}/100)`,
    `Migration strategy: **${migration.strategy}**`,
    "",
    ...impact.impacted.map((asset) => `- ${asset.name} (${asset.type}) — owners: ${(asset.owners || []).join(", ") || "UNASSIGNED"}`)
  ].join("\n");

  return {
    strategy: migration.strategy,
    summary: migration.summary,
    files: [
      { path: `generated/models/${request.entityName}_contextseal.sql`, kind: "DBT_MODEL", content: migration.sql },
      { path: `generated/models/${request.entityName}_contextseal.yml`, kind: "DBT_TESTS", content: schema },
      { path: `generated/rollback/${request.entityName}_contextseal_rollback.sql`, kind: "ROLLBACK", content: migration.rollback },
      { path: "generated/IMPACTED_OWNERS.md", kind: "OWNER_BRIEF", content: ownerBrief }
    ]
  };
}
