import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_OPTIONS = {
  approvedRunPath: "examples/outputs/demo-certification.json",
  manifestPath: "examples/outputs/generated/ARTIFACT_MANIFEST.json",
  sandboxEvidencePath: "examples/outputs/sandbox/generated-sandbox-evidence.json",
  aiNotePath: "examples/outputs/generated/ai/contextseal-ai-output.md",
  outputDir: "examples/outputs/pr",
  baseBranch: "main"
};

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };
  const aliases = new Map([
    ["--run", "approvedRunPath"],
    ["--manifest", "manifestPath"],
    ["--sandbox", "sandboxEvidencePath"],
    ["--ai-note", "aiNotePath"],
    ["--output-dir", "outputDir"],
    ["--base-branch", "baseBranch"]
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const key = aliases.get(flag);
    if (!key) throw new Error(`Unknown argument: ${flag}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`Missing value for argument: ${flag}`);
    options[key] = value;
    index += 1;
  }

  return options;
}

function toPosixPath(value) {
  return value.replaceAll("\\", "/");
}

function toKebabCase(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "change";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(root, relativePath, label) {
  const absolutePath = path.join(root, relativePath);
  const content = await readFile(absolutePath, "utf8");
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Unable to parse ${label} at ${relativePath}: ${error.message}`);
  }
}

async function readOptionalText(root, relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

function deriveBranchName(changeType, entityName, runId) {
  return `contextseal/${toKebabCase(changeType)}/${toKebabCase(entityName)}-${runId}`;
}

function deriveTitle(request) {
  const changeType = toKebabCase(request.changeType);
  if (changeType === "rename-column") {
    return `ContextSeal: staged rename for ${request.entityName}.${request.sourceField} -> ${request.destinationField}`;
  }
  if (changeType === "type-change") {
    return `ContextSeal: staged type migration for ${request.entityName}.${request.sourceField}`;
  }
  if (changeType === "drop-column") {
    return `ContextSeal: staged deprecation for ${request.entityName}.${request.sourceField}`;
  }
  return `ContextSeal: staged compatibility change for ${request.entityName}`;
}

function buildAssetNameMap(run) {
  const pairs = [];
  if (run.impact?.target?.urn) pairs.push([run.impact.target.urn, run.impact.target.name || run.request?.entityName || run.impact.target.urn]);
  for (const item of run.impact?.impacted || []) {
    pairs.push([item.urn, item.name || item.urn]);
  }
  return new Map(pairs);
}

function formatRepresentativePath(pathSegments, assetNameMap) {
  return (pathSegments || [])
    .map((segment) => assetNameMap.get(segment) || segment)
    .join(" -> ");
}

function buildBody({
  run,
  manifest,
  sandbox,
  generatedFiles,
  evidenceFiles,
  aiNoteIncluded,
  approvedRunPath,
  branchName,
  title
}) {
  const request = run.request || {};
  const passport = run.passport || {};
  const lineage = manifest.grounding?.lineageInputs || {};
  const policy = manifest.grounding?.policyInputs || {};
  const migration = manifest.grounding?.migrationRule || {};
  const assetNameMap = buildAssetNameMap(run);
  const representativePaths = lineage.representativePaths || [];

  const lines = [
    "## Summary",
    "",
    `- Run ID: ${run.runId}`,
    `- Passport ID: ${passport.passportId}`,
    `- Target entity: ${request.entityName}`,
    `- Change type: ${toKebabCase(request.changeType)}`,
    `- PR title: ${title}`,
    `- Branch name: ${branchName}`,
    `- Safe staged strategy: ${migration.summary || "Generate a compatibility-preserving staged migration instead of the blocked destructive request."}`,
    "",
    "## Blocked original request",
    "",
    `- Requested operation: ${request.changeType} on ${request.entityName}.${request.sourceField}${request.destinationField ? ` -> ${request.destinationField}` : ""}`,
    `- Deterministic verdict: ${policy.verdict || passport.risk?.verdict || "UNKNOWN"}`,
    `- Risk score: ${policy.score ?? passport.risk?.score ?? "UNKNOWN"}`,
    `- Finding codes: ${(policy.findingCodes || passport.risk?.findingCodes || []).join(", ") || "None recorded"}`,
    "",
    "## Safe generated plan",
    "",
    `- Migration rule ID: ${migration.ruleId || passport.artifactGroundingRuleId || "UNKNOWN"}`,
    `- Migration strategy: ${migration.strategy || passport.migrationStrategy || "UNKNOWN"}`,
    `- Strategy summary: ${migration.summary || "No migration summary recorded."}`,
    "- Compatibility boundary: The generated change preserves compatibility until downstream consumers migrate.",
    "",
    "## Grounding from DataHub",
    "",
    `- Approved run record: ${approvedRunPath} (${run.mode || "unknown"} mode)`,
    `- Impacted asset count: ${lineage.impactedAssetCount ?? run.impact?.counts?.total ?? 0}`,
    `- High-criticality assets: ${lineage.highCriticalityAssetCount ?? run.impact?.counts?.highCriticality ?? 0}`,
    `- Downstream owners: ${(lineage.downstreamOwners || []).join(", ") || "None recorded"}`
  ];

  if (representativePaths.length) {
    lines.push("- Representative grounded paths:");
    for (const item of representativePaths) {
      lines.push(`  - ${item.assetName || item.assetUrn}: ${formatRepresentativePath(item.path, assetNameMap)}`);
    }
  } else {
    lines.push("- Representative grounded paths: None recorded");
  }

  lines.push(
    "",
    "## Changed files",
    "",
    "The generated compatibility bundle proposes these exact manifest-backed files for review:",
    ""
  );
  for (const file of generatedFiles) {
    lines.push(`- ${file}`);
  }

  lines.push("", "## Validation evidence", "");
  for (const file of evidenceFiles) {
    lines.push(`- ${file}`);
  }
  lines.push(`- Sandbox status: ${sandbox.status}`);
  if (aiNoteIncluded) {
    lines.push("- AI reviewer note artifact is included as optional non-authoritative context only.");
  }

  lines.push(
    "",
    "## Reviewer decision boundary",
    "",
    "- Approval covers only the safe generated compatibility change, not the blocked destructive request.",
    "- Deterministic evidence remains authoritative over any AI-generated explanation text.",
    "- Write-back and merge remain separate human-governed actions outside this packet.",
    "",
    "## Manual follow-up after merge",
    "",
    "- Migrate downstream consumers from the source field to the staged compatibility field.",
    "- Deprecate and remove the source field in a later separately approved change after consumer migration completes.",
    "- Rerun validation in the target repository before any deployment or write-back step."
  );

  return `${lines.join("\n")}\n`;
}

function buildChecklist() {
  return [
    "# PR Review Checklist",
    "",
    "- [ ] Confirm the PR describes the safe generated change rather than the blocked destructive request.",
    "- [ ] Confirm the generated file list matches `ARTIFACT_MANIFEST.json`.",
    "- [ ] Confirm the sandbox evidence artifact is `PASS` and references the same run and passport context.",
    "- [ ] Confirm the owner brief matches the impacted downstream owners.",
    "- [ ] Confirm no token, credential, or source data row appears in the packet.",
    "- [ ] Confirm merge does not imply immediate source-field removal.",
    "- [ ] Confirm any write-back or deployment step remains outside the PR packet."
  ].join("\n").concat("\n");
}

function buildPayload({ run, manifest, sandbox, generatedFiles, evidenceFiles, bodyPath, checklistPath, branchName, title, baseBranch, draftPrSupported }) {
  const request = run.request || {};
  return {
    runId: run.runId,
    passportId: run.passport?.passportId || manifest.passportContext?.passportId || null,
    baseBranch,
    branchName,
    title,
    bodyPath,
    checklistPath,
    changeType: request.changeType || null,
    entityName: request.entityName || null,
    sourceField: request.sourceField || null,
    destinationField: request.destinationField || null,
    generatedFiles,
    evidenceFiles,
    sandboxStatus: sandbox.status,
    draftPrSupported,
    requiresTokenForDraftCreation: true,
    manualReviewerActions: [
      "Review the safe generated compatibility change against the approved run record.",
      "Open a human-governed PR using the generated title, branch name, body, and checklist.",
      "Keep downstream migration and eventual source-field removal outside this PR."
    ]
  };
}

const options = parseArgs(process.argv.slice(2));
const root = path.resolve(".");
const approvedRunPath = toPosixPath(options.approvedRunPath);
const manifestPath = toPosixPath(options.manifestPath);
const sandboxEvidencePath = toPosixPath(options.sandboxEvidencePath);
const aiNotePath = toPosixPath(options.aiNotePath);
const outputDir = toPosixPath(options.outputDir);
const baseBranch = options.baseBranch;

const run = await readJson(root, approvedRunPath, "approved run record");
const manifest = await readJson(root, manifestPath, "artifact manifest");
const sandbox = await readJson(root, sandboxEvidencePath, "sandbox evidence");
const aiNote = await readOptionalText(root, aiNotePath);

assert(run.state === "APPROVED_FOR_WRITEBACK", `Approved run must be in APPROVED_FOR_WRITEBACK, received ${run.state}`);
assert(manifest.generatedFromRunId === run.runId, `Manifest run ID ${manifest.generatedFromRunId} does not match approved run ${run.runId}`);
assert(sandbox.generatedFromRunId === run.runId, `Sandbox run ID ${sandbox.generatedFromRunId} does not match approved run ${run.runId}`);
assert(sandbox.status === "PASS", `Sandbox evidence must be PASS, received ${sandbox.status}`);
assert(manifest.passportContext?.passportId === run.passport?.passportId, "Manifest passport context does not match the approved run passport ID");
assert(Array.isArray(manifest.artifacts) && manifest.artifacts.length > 0, "Manifest must contain at least one generated artifact");

const generatedFiles = manifest.artifacts.map((item) => item.path);
const evidenceFiles = [approvedRunPath, manifestPath, sandboxEvidencePath];
if (aiNote) evidenceFiles.push(aiNotePath);

const branchName = deriveBranchName(run.request?.changeType, run.request?.entityName, run.runId);
const title = deriveTitle(run.request || {});

const bodyPath = `${outputDir}/pr-body.md`;
const checklistPath = `${outputDir}/pr-checklist.md`;
const payloadPath = `${outputDir}/pr-payload.json`;

await mkdir(path.join(root, outputDir), { recursive: true });

const body = buildBody({
  run,
  manifest,
  sandbox,
  generatedFiles,
  evidenceFiles,
  aiNoteIncluded: Boolean(aiNote),
  approvedRunPath,
  branchName,
  title
});
const checklist = buildChecklist();
const payload = buildPayload({
  run,
  manifest,
  sandbox,
  generatedFiles,
  evidenceFiles,
  bodyPath,
  checklistPath,
  branchName,
  title,
  baseBranch,
  draftPrSupported: true
});

await writeFile(path.join(root, bodyPath), body);
await writeFile(path.join(root, checklistPath), checklist);
await writeFile(path.join(root, payloadPath), `${JSON.stringify(payload, null, 2)}\n`);

console.log(`PASS pr-bundle ${run.runId}: wrote ${bodyPath}, ${checklistPath}, and ${payloadPath}`);