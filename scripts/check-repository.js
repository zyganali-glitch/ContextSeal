import path from "node:path";
import { access, readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { credentialSignatures } from "../src/security/credential-scan.js";

const execFileAsync = promisify(execFile);
const root = path.resolve(".");
const required = [
  "LICENSE", "README.md", "README.tr.md", "SECURITY.md", "AGENTS.md", "AGENT_OS_STATUS.md", ".env.example",
  "package.json", "package-lock.json", "Dockerfile", "compose.yaml",
  ".github/workflows/ci.yml", ".github/workflows/pages.yml",
  ".agent/workflows/session-bootstrap.md", ".agent/workflows/continue.md",
  "AGENT_OS_RULES.md", "AGENT_OS_PLAN_TEMPLATE.md", "AGENT_MEMORY_AND_LESSONS.md",
  "AGENT_ARCHITECTURE_AND_PATTERNS.md", "AGENT_ENVIRONMENT_AND_API.md", "AGENT_USER_PREFERENCES.md",
  "docs/ARCHITECTURE.md", "docs/EVIDENCE_BOUNDARY.md", "docs/THREAT_MODEL.md",
  "docs/JUDGING_MAP.md", "docs/JUDGE_TEST_PATH.md", "docs/EVIDENCE_MANIFEST.md", "docs/DEVPOST_SUBMISSION.md",
  "docs/DEMO_SCRIPT.md", "docs/LIVE_DATAHUB_SETUP.md", "docs/BUILD_PERIOD_DISCLOSURE.md",
  "docs/CLAIM_AUDIT.md", "docs/COMPETITION_REQUIREMENT_MATRIX.md", "docs/AI_RUNTIME_DECISION.md",
  "docs/BRANCH_RECONCILIATION_MATRIX.md", "docs/DATAHUB_SKILL_CONTRIBUTION.md", "docs/PR_REVIEW_PACKET.md",
  "docs/PRE_SUBMISSION_CHECKLIST.md", "docs/UI_REVIEW.md", "docs/VISUAL_DIRECTION.md",
  "docs/tr/DEVPOST_BASVURU_REHBERI.md", "docs/tr/DEMO_VIDEO_CEKIM_REHBERI.md", "docs/tr/CANLI_DATAHUB_KURULUMU.md", "docs/tr/SORUN_COZME_REHBERI.md",
  "plans/PLAN_20260721_contextseal_hackathon_win.md", "plans/completed/README.md",
  "skills/contextseal-change-certification/SKILL.md", "skills/datahub-schema-change-certification/SKILL.md",
  "scripts/check-repository.js", "scripts/run-demo.js", "scripts/run-generated-sandbox.py",
  "scripts/build-pr-bundle.js", "scripts/create-draft-pr.js", "scripts/seed-datahub.py",
  "scripts/datahub_mutation_safety.py", "scripts/upsert-datahub-properties.py", "scripts/capture-live-evidence.js",
  "scripts/export-live-run.js", "scripts/validate-evidence.js", "scripts/smoke-server.js",
  "src/security/credential-scan.js", "tests/credential-scan.test.js", "tests/live-pipeline.test.js",
  "tests/server-integration.test.js", "tests/store.test.js", "tests/artifacts.test.js", "tests/evidence-validator.test.js", "tests_py/test_datahub_mutation_safety.py",
  "examples/outputs/demo-certification.json", "examples/outputs/generated/ARTIFACT_MANIFEST.json",
  "examples/outputs/generated/ai/contextseal-ai-input.json", "examples/outputs/generated/ai/contextseal-ai-output.json", "examples/outputs/generated/ai/contextseal-ai-output.md",
  "examples/outputs/pr/pr-body.md", "examples/outputs/pr/pr-payload.json", "examples/outputs/pr/pr-checklist.md", "examples/outputs/pr/draft-pr-dry-run.json",
  "examples/outputs/sandbox/generated-sandbox-evidence.json",
  "examples/outputs/live-datahub-read-evidence.json", "examples/outputs/live-datahub-writeback-evidence.json"
];

const failures = [];
for (const file of required) {
  try { await access(path.join(root, file)); }
  catch { failures.push(`required surface is missing: ${file}`); }
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (packageJson.license !== "Apache-2.0") failures.push("package.json must declare Apache-2.0.");
if (packageJson.private !== true) failures.push("package.json must remain private to prevent accidental registry publication.");
if (packageJson.engines?.node !== ">=20") failures.push("package.json must support the declared Node.js >=20 judge path.");

for (const script of [
  "check", "evidence:check", "test", "demo", "demo:generate", "demo:check",
  "sandbox", "sandbox:generate", "sandbox:check", "pr:bundle", "pr:bundle:check",
  "pr:draft", "smoke", "validate", "datahub:seed", "datahub:seed:apply", "datahub:seed:scope",
  "datahub:properties", "datahub:properties:apply", "datahub:properties:scope", "datahub:safety:test"
]) {
  if (!packageJson.scripts?.[script]) failures.push(`package.json script is missing: ${script}`);
}
if (packageJson.scripts?.demo !== "npm run demo:generate") failures.push("demo must remain an explicit generate alias.");
if (packageJson.scripts?.sandbox !== "npm run sandbox:generate") failures.push("sandbox must remain an explicit generate alias.");
if (!packageJson.scripts?.["demo:check"]?.includes("run-demo.js --check")) failures.push("demo:check must compare committed demo artifacts without writing.");
if (!packageJson.scripts?.["sandbox:check"]?.includes("run-generated-sandbox.py --check")) failures.push("sandbox:check must compare committed sandbox evidence without writing.");
if (!packageJson.scripts?.["pr:bundle:check"]?.includes("build-pr-bundle.js --check")) failures.push("pr:bundle:check must compare committed PR artifacts without writing.");
if (!packageJson.scripts?.validate?.includes("npm run demo:check")) failures.push("validate must use demo:check.");
if (!packageJson.scripts?.validate?.includes("npm run sandbox:check")) failures.push("validate must use sandbox:check.");
if (!packageJson.scripts?.validate?.includes("npm run pr:bundle:check")) failures.push("validate must use pr:bundle:check.");
if (!packageJson.scripts?.["datahub:seed"]?.includes('uv run --with acryl-datahub==1.6.0.14')) failures.push("datahub:seed must use the pinned acryl-datahub helper path.");
if (!packageJson.scripts?.["datahub:properties"]?.includes('uv run --with acryl-datahub==1.6.0.14')) failures.push("datahub:properties must use the pinned acryl-datahub helper path.");
if (!packageJson.scripts?.["datahub:seed"]?.includes("--preflight")) failures.push("datahub:seed must remain read-only preflight by default.");
if (!packageJson.scripts?.["datahub:properties"]?.includes("--preflight")) failures.push("datahub:properties must remain read-only preflight by default.");
if (!packageJson.scripts?.["datahub:seed:apply"]?.includes("--apply")) failures.push("datahub:seed:apply must be an explicitly named apply command.");
if (!packageJson.scripts?.["datahub:properties:apply"]?.includes("--apply")) failures.push("datahub:properties:apply must be an explicitly named apply command.");
if (!packageJson.scripts?.["datahub:safety:test"]?.includes("unittest")) failures.push("datahub:safety:test must run the standard-library Python safety suite.");

const env = await readFile(path.join(root, ".env.example"), "utf8");
for (const pattern of [
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /(?:datahub_pat_|dh_pat_|dhp_|acryl_pat_)[A-Za-z0-9._-]{20,}/i
]) {
  if (pattern.test(env)) failures.push("possible credential material in .env.example.");
}
for (const name of [
  "CONTEXTSEAL_AI_ENABLED",
  "CONTEXTSEAL_AI_RUNTIME",
  "CONTEXTSEAL_AI_MODEL",
  "CONTEXTSEAL_AI_BASE_URL",
  "CONTEXTSEAL_AI_TIMEOUT_MS",
  "CONTEXTSEAL_HOST",
  "CONTEXTSEAL_OPERATOR_TOKEN",
  "CONTEXTSEAL_ALLOWED_TARGET_URNS",
  "CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION",
  "CONTEXTSEAL_SEED_CONFIRMATION",
  "CONTEXTSEAL_PROPERTIES_CONFIRMATION",
  "CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256",
  "CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP",
  "CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS",
  "CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
  "CONTEXTSEAL_REMOTE_DATAHUB_PROPERTY_URNS",
  "GITHUB_DELIVERY_ENABLED",
  "GITHUB_REPOSITORY"
]) {
  if (!env.includes(`${name}=`)) failures.push(`.env.example must declare ${name}.`);
}
if (!/^CONTEXTSEAL_MODE=fixture\s*$/m.test(env)) failures.push(".env.example must default to fixture mode.");
if (!/^CONTEXTSEAL_HOST=127\.0\.0\.1\s*$/m.test(env)) failures.push(".env.example must default to loopback binding.");
if (!/^CONTEXTSEAL_OPERATOR_TOKEN=\s*$/m.test(env)) failures.push(".env.example must keep CONTEXTSEAL_OPERATOR_TOKEN blank.");
if (!/^CONTEXTSEAL_ALLOWED_TARGET_URNS=\[\]\s*$/m.test(env)) failures.push(".env.example must keep the live target allowlist empty.");
if (!/^DATAHUB_GMS_TOKEN=\s*$/m.test(env)) failures.push(".env.example must keep DATAHUB_GMS_TOKEN blank.");
if (!/^DATAHUB_MCP_MUTATIONS_ENABLED=false\s*$/m.test(env)) failures.push(".env.example must default the mutation gate to false.");
if (!/^GITHUB_DELIVERY_ENABLED=false\s*$/m.test(env)) failures.push(".env.example must default GitHub delivery to false.");
if (!/^GITHUB_REPOSITORY=\s*$/m.test(env)) failures.push(".env.example must keep GITHUB_REPOSITORY blank.");
for (const variable of [
  "CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION",
  "CONTEXTSEAL_SEED_CONFIRMATION",
  "CONTEXTSEAL_PROPERTIES_CONFIRMATION",
  "CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256",
  "CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP"
]) {
  if (!new RegExp(`^${variable}=\\s*$`, "m").test(env)) failures.push(`.env.example must keep ${variable} blank.`);
}
for (const variable of [
  "CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS",
  "CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
  "CONTEXTSEAL_REMOTE_DATAHUB_PROPERTY_URNS"
]) {
  if (!new RegExp(`^${variable}=\\[\\]\\s*$`, "m").test(env)) failures.push(`.env.example must keep ${variable} empty.`);
}

let repositoryFiles = [];
try {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "buffer", maxBuffer: 5_000_000 }
  );
  repositoryFiles = stdout.toString("utf8").split("\0").filter(Boolean);
} catch (error) {
  failures.push(`could not enumerate tracked and untracked repository files: ${error.message}`);
}

for (const file of repositoryFiles) {
  let content;
  try { content = await readFile(path.join(root, file), "utf8"); }
  catch { continue; }
  const signatures = credentialSignatures(content);
  if (signatures.length) failures.push(`possible committed credential material (${signatures.join(", ")}): ${file}`);
}

const markdownFiles = repositoryFiles.filter((file) => file.toLowerCase().endsWith(".md"));
const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;
for (const file of markdownFiles) {
  let content;
  try { content = await readFile(path.join(root, file), "utf8"); }
  catch (error) {
    if (error.code === "ENOENT") continue;
    failures.push(`could not read Markdown file ${file}: ${error.message}`);
    continue;
  }
  for (const match of content.matchAll(markdownLink)) {
    let target = match[1].trim().replace(/^<|>$/g, "");
    if (!target || /^(?:https?:|mailto:|#)/i.test(target)) continue;
    target = target.split("#", 1)[0].split("?", 1)[0];
    try { target = decodeURIComponent(target); }
    catch { failures.push(`invalid URL encoding in ${file}: ${match[1]}`); continue; }
    const resolved = target.startsWith("/")
      ? path.join(root, target.replace(/^[/\\]+/, ""))
      : path.resolve(root, path.dirname(file), target);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      failures.push(`local Markdown link escapes the repository in ${file}: ${match[1]}`);
      continue;
    }
    try { await access(resolved); }
    catch { failures.push(`broken local Markdown link in ${file}: ${match[1]}`); }
  }
}

async function listFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await listFiles(absolute));
    else if (entry.isFile()) found.push(path.relative(root, absolute).split(path.sep).join("/"));
  }
  return found;
}

try {
  const demo = JSON.parse(await readFile(path.join(root, "examples/outputs/demo-certification.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(root, "examples/outputs/generated/ARTIFACT_MANIFEST.json"), "utf8"));
  const sandbox = JSON.parse(await readFile(path.join(root, "examples/outputs/sandbox/generated-sandbox-evidence.json"), "utf8"));
  const prPayload = JSON.parse(await readFile(path.join(root, "examples/outputs/pr/pr-payload.json"), "utf8"));

  if (demo.state !== "APPROVED_FOR_WRITEBACK") failures.push("demo certification must remain in APPROVED_FOR_WRITEBACK state.");
  if (manifest.generatedFromRunId !== demo.runId) failures.push("artifact manifest must bind the committed demo run ID.");
  if (sandbox.generatedFromRunId !== demo.runId) failures.push("sandbox evidence must bind the committed demo run ID.");
  if (sandbox.status !== "PASS") failures.push("sandbox evidence must remain PASS.");
  if (prPayload.runId !== demo.runId) failures.push("PR payload must bind the committed demo run ID.");
  if (prPayload.passportId !== demo.passport?.passportId) failures.push("PR payload must bind the committed passport ID.");

  const declaredArtifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  const expectedGenerated = new Set([
    "examples/outputs/generated/ARTIFACT_MANIFEST.json",
    "examples/outputs/generated/ai/contextseal-ai-input.json",
    "examples/outputs/generated/ai/contextseal-ai-output.json",
    "examples/outputs/generated/ai/contextseal-ai-output.md",
    ...declaredArtifacts.map((item) => `examples/outputs/${String(item?.path || "").replaceAll("\\", "/")}`)
  ]);
  const actualGenerated = await listFiles(path.join(root, "examples/outputs/generated"));
  for (const file of expectedGenerated) {
    if (!actualGenerated.includes(file)) failures.push(`declared generated artifact is missing: ${file}`);
  }
  for (const file of actualGenerated) {
    if (!expectedGenerated.has(file)) failures.push(`orphaned generated artifact is not declared by the demo bundle: ${file}`);
  }
} catch (error) {
  failures.push(`could not verify generated, sandbox, and PR artifacts: ${error.message}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS repository integrity: ${required.length} required surfaces, ${markdownFiles.length} Markdown files, no intended-tree credential signatures or orphaned artifacts`);
}
