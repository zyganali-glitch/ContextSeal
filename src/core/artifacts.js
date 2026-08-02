import { sha256 } from "./hash.js";

const DIALECTS = new Map([
  ["snowflake", "snowflake"],
  ["duckdb", "duckdb"]
]);

function sqlIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return value;
}

function sqlType(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Unsafe SQL type: ${value}`);
  const normalized = value.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9_]*(\([0-9]+(?:\s*,\s*[0-9]+)?\))?$/.test(normalized)) {
    throw new Error(`Unsafe SQL type: ${value}`);
  }
  return normalized;
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

function schemaGrounding(request, impact) {
  const schemaFields = Array.isArray(impact.target?.schemaFields) ? impact.target.schemaFields : [];
  const sourceField = schemaFields.find((field) => field?.fieldPath === request.sourceField) || null;
  const generatedTests = [
    ...(sourceField?.nullable === false ? ["not_null"] : []),
    ...(sourceField?.unique === true ? ["unique"] : [])
  ];
  const capturedSchemaFields = schemaFields.map((field) => ({
    fieldPath: field.fieldPath,
    nativeDataType: field.nativeDataType || null,
    nullable: field.nullable ?? null,
    unique: field.unique === true
  }));
  return {
    sourceFieldSchema: sourceField ? {
      fieldPath: sourceField.fieldPath,
      nativeDataType: sourceField.nativeDataType || null,
      nullable: sourceField.nullable ?? null,
      unique: sourceField.unique === true
    } : null,
    capturedSchemaFields,
    capturedFieldCount: schemaFields.length,
    generatedTests,
    safeClaim: sourceField
      ? "Generated tests are derived from the captured source-field schema constraint; not_null is emitted only when nullable is explicitly false."
      : "No source-field nullability constraint was captured, so the generator does not invent a not_null test."
  };
}

function dialect(impact) {
  const platform = String(impact.target?.platform || "").toLowerCase();
  const resolved = DIALECTS.get(platform);
  if (!resolved) throw new Error(`Unsupported generated artifact dialect for platform: ${impact.target?.platform || "missing"}`);
  return { platform, name: resolved };
}

function explicitColumns(impact, request, destination = null) {
  const fields = Array.isArray(impact.target?.schemaFields) ? impact.target.schemaFields : [];
  const columns = fields.map((field) => sqlIdentifier(field?.fieldPath));
  if (!columns.length || !columns.includes(request.sourceField) || new Set(columns).size !== columns.length) {
    throw new Error("Generated artifacts require a unique authoritative schema snapshot containing the source field.");
  }
  if (destination && columns.includes(destination)) {
    throw new Error(`Generated compatibility field already exists in the authoritative schema snapshot: ${destination}`);
  }
  return columns;
}

function selectProjection(columns, sourceModel, compatibility = null) {
  const projected = [...columns, ...(compatibility ? [`${compatibility.expression || compatibility.source} as ${compatibility.destination}`] : [])];
  return `select\n${projected.map((column) => `  ${column}`).join(",\n")}\nfrom {{ ref('${sourceModel}') }}\n`;
}

function generationMetadata(request, impact, migration, dialectInfo, metadata) {
  return {
    contextsealRunId: metadata.runId || "UNBOUND",
    policyVersion: metadata.policyVersion || "UNBOUND",
    policyHash: metadata.policyHash || "UNBOUND",
    migrationStrategy: migration.strategy,
    targetPlatform: dialectInfo.platform,
    dialect: dialectInfo.name,
    intendedDeprecationWindow: "Retain the source field until every known downstream consumer migrates and a later scoped approval authorizes removal."
  };
}

function yamlMetadata(metadata) {
  return [
    "    meta:",
    "      contextseal:",
    `        run_id: ${metadata.contextsealRunId}`,
    `        policy_version: ${metadata.policyVersion}`,
    `        policy_hash: ${metadata.policyHash}`,
    `        migration_strategy: ${metadata.migrationStrategy}`,
    `        target_platform: ${metadata.targetPlatform}`,
    `        dialect: ${metadata.dialect}`,
    `        intended_deprecation_window: ${JSON.stringify(metadata.intendedDeprecationWindow)}`
  ].join("\n");
}

function buildArtifactGrounding(request, impact, risk, migration) {
  const groundedSchema = schemaGrounding(request, impact);
  const dialectInfo = dialect(impact);
  return {
    contractVersion: "1.0",
    target: {
      urn: request.targetUrn,
      entityName: request.entityName,
      type: impact.target?.type || "UNKNOWN",
      platform: dialectInfo.platform,
      dialect: dialectInfo.name
    },
    schemaInputs: {
      sourceField: request.sourceField,
      destinationField: request.destinationField || null,
      destinationType: request.destinationType || null,
      generatedModelName: migration.generatedModelName,
      ...groundedSchema
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
    case "DBT_DATA_TEST":
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
    deliveryMetadata: {
      contextsealRunId: run.runId,
      passportId: passport.passportId,
      policyVersion: run.policyVersion,
      policyHash: run.policyHash,
      migrationStrategy: run.artifacts.strategy,
      targetPlatform: run.artifacts.generation.targetPlatform,
      dialect: run.artifacts.generation.dialect,
      intendedDeprecationWindow: run.artifacts.generation.intendedDeprecationWindow
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

function safeMigration(request, impact) {
  const source = sqlIdentifier(request.sourceField);
  const destination = sqlIdentifier(request.destinationField || `${source}_v2`);
  const entity = sqlIdentifier(request.entityName);
  const generatedModelName = `${entity}_contextseal`;
  const columns = explicitColumns(impact, request, request.changeType === "drop_column" ? null : destination);
  if (request.changeType === "rename_column") {
    return {
      ruleId: "RENAME_COLUMN_REQUIRES_COMPATIBILITY_FIELD",
      strategy: "EXPAND_MIGRATE_CONTRACT",
      summary: `Add ${destination}, backfill from ${source}, migrate consumers, then deprecate ${source}.`,
      safeClaim: "Direct rename requests are converted into a compatibility-field migration so downstream consumers can move before removal.",
      generatedModelName,
      sql: `-- ContextSeal safe expansion: keep the old field during consumer migration\n${selectProjection(columns, entity, { source, destination })}`,
      rollback: `-- Rollback keeps the original field authoritative\n${selectProjection(columns, generatedModelName)}`,
      parityTest: `-- ContextSeal rename parity test: returns rows only when compatibility values diverge\nselect\n  ${source} as source_value,\n  ${destination} as compatibility_value\nfrom {{ ref('${generatedModelName}') }}\nwhere ${source} is distinct from ${destination}\n`
    };
  }
  if (request.changeType === "type_change") {
    const destinationType = sqlType(request.destinationType);
    return {
      ruleId: "TYPE_CHANGE_REQUIRES_PARALLEL_TYPED_FIELD",
      strategy: "PARALLEL_TYPED_FIELD",
      summary: `Create a parallel typed field and retain ${source} until validation completes.`,
      safeClaim: "Type changes create a parallel typed column so the original field stays authoritative during validation.",
      generatedModelName,
      sql: selectProjection(columns, entity, {
        expression: `try_cast(${source} as ${destinationType})`,
        destination: `${source}_typed`
      }),
      rollback: selectProjection(columns, generatedModelName)
    };
  }
  if (request.changeType === "drop_column") {
    return {
      ruleId: "DROP_REQUIRES_DEPRECATION_BEFORE_REMOVAL",
      strategy: "DEPRECATE_BEFORE_DROP",
      summary: `Mark ${source} deprecated, migrate every known consumer, and drop it only in a later approved change.`,
      safeClaim: "Direct drops are refused; the generator preserves the field and emits a later-drop migration note instead.",
      generatedModelName,
      sql: `-- Deliberately preserves ${source}; direct destructive removal is not generated.\n${selectProjection(columns, entity)}`,
      rollback: `-- No destructive operation was generated; rollback preserves the authoritative snapshot.\n${selectProjection(columns, generatedModelName)}`
    };
  }
  throw new Error(`Unsupported change type: ${request.changeType}`);
}
export function generateArtifacts(request, impact, risk, metadata = {}) {
  const migration = safeMigration(request, impact);
  const dialectInfo = dialect(impact);
  const generation = generationMetadata(request, impact, migration, dialectInfo, metadata);
  const field = request.changeType === "rename_column"
    ? request.destinationField
    : request.changeType === "type_change"
      ? `${request.sourceField}_typed`
      : request.sourceField;
  const generatedTests = schemaGrounding(request, impact).generatedTests;
  const testsYaml = generatedTests.length
    ? `\n        tests:\n${generatedTests.map((test) => `          - ${test}`).join("\n")}`
    : "";
  const schema = `version: 2\nmodels:\n  - name: ${migration.generatedModelName}\n    description: "ContextSeal migration candidate; strategy ${migration.strategy}."\n${yamlMetadata(generation)}\n    columns:\n      - name: ${request.sourceField}${testsYaml}\n      - name: ${field}\n`;
  const ownerBrief = [
    "# Impacted owner briefing",
    "",
    `ContextSeal run: \`${generation.contextsealRunId}\``,
    `Policy: \`${generation.policyVersion}\` / \`${generation.policyHash}\``,
    `Dialect contract: \`${generation.targetPlatform}\` / \`${generation.dialect}\``,
    `Deprecation window: ${generation.intendedDeprecationWindow}`,
    "",
    `Risk verdict: **${risk.verdict}** (${risk.score}/100)`,
    `Migration strategy: **${migration.strategy}**`,
    "",
    ...impact.impacted.map((asset) => `- ${asset.name} (${asset.type}) — owners: ${(asset.owners || []).join(", ") || "UNASSIGNED"}`)
  ].join("\n");

  return {
    grounding: buildArtifactGrounding(request, impact, risk, migration),
    generation,
    strategy: migration.strategy,
    summary: migration.summary,
    files: [
      { path: `generated/models/${migration.generatedModelName}.sql`, kind: "DBT_MODEL", content: migration.sql },
      { path: `generated/models/${migration.generatedModelName}.yml`, kind: "DBT_TESTS", content: schema },
      ...(migration.parityTest ? [{ path: `generated/tests/${migration.generatedModelName}_rename_parity.sql`, kind: "DBT_DATA_TEST", content: migration.parityTest }] : []),
      { path: `generated/rollback/${request.entityName}.sql`, kind: "ROLLBACK", content: migration.rollback },
      { path: "generated/IMPACTED_OWNERS.md", kind: "OWNER_BRIEF", content: ownerBrief }
    ]
  };
}
