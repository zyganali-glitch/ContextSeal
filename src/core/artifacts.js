function sqlIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return value;
}

function safeMigration(request) {
  const source = sqlIdentifier(request.sourceField);
  const destination = sqlIdentifier(request.destinationField || `${source}_v2`);
  const entity = sqlIdentifier(request.entityName);
  if (request.changeType === "rename_column") {
    return {
      strategy: "EXPAND_MIGRATE_CONTRACT",
      summary: `Add ${destination}, backfill from ${source}, migrate consumers, then deprecate ${source}.`,
      sql: `-- ContextSeal safe expansion: keep the old field during consumer migration\nselect\n  *,\n  ${source} as ${destination}\nfrom {{ ref('${entity}') }}\n`,
      rollback: `-- Rollback keeps the original field authoritative\nselect * exclude (${destination}) from {{ ref('${entity}_compat') }};\n`
    };
  }
  if (request.changeType === "type_change") {
    const destinationType = String(request.destinationType).replace(/[^a-zA-Z0-9_(), ]/g, "");
    return {
      strategy: "PARALLEL_TYPED_FIELD",
      summary: `Create a parallel typed field and retain ${source} until validation completes.`,
      sql: `select\n  *,\n  try_cast(${source} as ${destinationType}) as ${source}_typed\nfrom {{ ref('${entity}') }}\n`,
      rollback: `select * exclude (${source}_typed) from {{ ref('${entity}_typed') }};\n`
    };
  }
  return {
    strategy: "DEPRECATE_BEFORE_DROP",
    summary: `Mark ${source} deprecated, migrate every known consumer, and drop it only in a later approved change.`,
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
