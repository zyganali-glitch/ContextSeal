import path from "node:path";
import { access, readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { credentialSignatures } from "../src/security/credential-scan.js";

const execFileAsync = promisify(execFile);
const root = path.resolve(".");
const required = [
  "LICENSE", "README.md", "README.tr.md", "SECURITY.md", "AGENTS.md", ".env.example",
  "package.json", "package-lock.json", "Dockerfile", "compose.yaml",
  ".github/workflows/ci.yml", ".github/workflows/pages.yml",
  "docs/ARCHITECTURE.md", "docs/EVIDENCE_BOUNDARY.md", "docs/THREAT_MODEL.md",
  "docs/JUDGING_MAP.md", "docs/JUDGE_TEST_PATH.md", "docs/EVIDENCE_MANIFEST.md",
  "docs/DEVPOST_SUBMISSION.md", "docs/DEMO_SCRIPT.md", "docs/LIVE_DATAHUB_SETUP.md",
  "docs/BUILD_PERIOD_DISCLOSURE.md", "docs/PRE_SUBMISSION_CHECKLIST.md",
  "docs/tr/DEVPOST_BASVURU_REHBERI.md", "docs/tr/DEMO_VIDEO_CEKIM_REHBERI.md",
  "skills/datahub-schema-change-certification/SKILL.md", "scripts/seed-datahub.py",
  "scripts/datahub_mutation_safety.py", "scripts/upsert-datahub-properties.py",
  "tests_py/test_datahub_mutation_safety.py",
  "scripts/run-demo.js", "scripts/capture-live-evidence.js", "scripts/export-live-run.js",
  "scripts/validate-evidence.js", "scripts/smoke-server.js",
  "examples/outputs/live-datahub-read-evidence.json",
  "examples/outputs/live-datahub-writeback-evidence.json"
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
for (const script of ["check", "evidence:check", "test", "demo:generate", "demo:check", "smoke", "validate"]) {
  if (!packageJson.scripts?.[script]) failures.push(`package.json script is missing: ${script}`);
}
if (!packageJson.scripts?.["datahub:seed"]?.includes("--preflight")) failures.push("datahub:seed must remain read-only preflight by default.");
if (!packageJson.scripts?.["datahub:properties"]?.includes("--preflight")) failures.push("datahub:properties must remain read-only preflight by default.");
if (!packageJson.scripts?.["datahub:seed:apply"]?.includes("--apply")) failures.push("datahub:seed:apply must be an explicitly named apply command.");
if (!packageJson.scripts?.["datahub:properties:apply"]?.includes("--apply")) failures.push("datahub:properties:apply must be an explicitly named apply command.");
if (!packageJson.scripts?.["datahub:safety:test"]?.includes("unittest")) failures.push("datahub:safety:test must run the standard-library Python safety suite.");

const env = await readFile(path.join(root, ".env.example"), "utf8");
if (!/^DATAHUB_GMS_TOKEN=\s*$/m.test(env)) failures.push(".env.example must keep DATAHUB_GMS_TOKEN blank.");
if (!/^CONTEXTSEAL_OPERATOR_TOKEN=\s*$/m.test(env)) failures.push(".env.example must keep CONTEXTSEAL_OPERATOR_TOKEN blank.");
if (!/^CONTEXTSEAL_ALLOWED_TARGET_URNS=\[\]\s*$/m.test(env)) failures.push(".env.example must keep the live target allowlist empty.");
if (!/^CONTEXTSEAL_HOST=127\.0\.0\.1\s*$/m.test(env)) failures.push(".env.example must default to loopback binding.");
if (!/^DATAHUB_MCP_MUTATIONS_ENABLED=false\s*$/m.test(env)) failures.push(".env.example must default the mutation gate to false.");
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
if (!/^CONTEXTSEAL_MODE=fixture\s*$/m.test(env)) failures.push(".env.example must default to fixture mode.");

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
  const declared = demo?.artifacts?.files;
  if (!Array.isArray(declared) || declared.length !== 4) {
    failures.push("generated demo must declare exactly four bounded artifact files.");
  } else {
    const expected = [...new Set(declared.map((item) => `examples/outputs/${String(item?.path || "").replaceAll("\\", "/")}`))].sort();
    const actual = (await listFiles(path.join(root, "examples/outputs/generated"))).sort();
    if (expected.length !== declared.length || expected.some((file) => !file.startsWith("examples/outputs/generated/"))) {
      failures.push("generated demo artifact paths must be unique and remain under examples/outputs/generated/.");
    }
    const missing = expected.filter((file) => !actual.includes(file));
    const orphaned = actual.filter((file) => !expected.includes(file));
    for (const file of missing) failures.push(`declared generated artifact is missing: ${file}`);
    for (const file of orphaned) failures.push(`orphaned generated artifact is not declared by the demo: ${file}`);
  }
} catch (error) {
  failures.push(`could not verify the generated artifact allowlist: ${error.message}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS repository integrity: ${required.length} required surfaces, ${markdownFiles.length} Markdown files, no intended-tree credential signatures or orphaned artifacts`);
}
