import { access, readFile } from "node:fs/promises";

const required = [
  "LICENSE", "README.md", "README.tr.md", "SECURITY.md", "AGENTS.md", ".env.example",
  "AGENT_OS_RULES.md", "AGENT_OS_PLAN_TEMPLATE.md", "AGENT_MEMORY_AND_LESSONS.md",
  "AGENT_ARCHITECTURE_AND_PATTERNS.md", "AGENT_ENVIRONMENT_AND_API.md", "AGENT_USER_PREFERENCES.md",
  "docs/ARCHITECTURE.md", "docs/EVIDENCE_BOUNDARY.md", "docs/JUDGING_MAP.md",
  "docs/CLAIM_AUDIT.md", "docs/COMPETITION_REQUIREMENT_MATRIX.md", "docs/AI_RUNTIME_DECISION.md",
  "docs/PR_REVIEW_PACKET.md",
  "docs/tr/DEVPOST_BASVURU_REHBERI.md", "docs/tr/DEMO_VIDEO_CEKIM_REHBERI.md",
  "plans/PLAN_20260721_contextseal_hackathon_win.md",
  "skills/contextseal-change-certification/SKILL.md", "scripts/seed-datahub.py",
  "examples/outputs/live-datahub-read-evidence.json",
  "examples/outputs/live-datahub-writeback-evidence.json",
  "examples/outputs/sandbox/generated-sandbox-evidence.json",
  "examples/outputs/generated/ai/contextseal-ai-input.json",
  "examples/outputs/generated/ai/contextseal-ai-output.json",
  "examples/outputs/generated/ai/contextseal-ai-output.md"
];
for (const file of required) await access(file);
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.license !== "Apache-2.0") throw new Error("package.json must declare Apache-2.0.");
const env = await readFile(".env.example", "utf8");
if (/gh[pousr]_[A-Za-z0-9_]{20,}/.test(env)) throw new Error("Possible GitHub token in .env.example.");
for (const name of [
  "CONTEXTSEAL_AI_ENABLED",
  "CONTEXTSEAL_AI_RUNTIME",
  "CONTEXTSEAL_AI_MODEL",
  "CONTEXTSEAL_AI_BASE_URL",
  "CONTEXTSEAL_AI_TIMEOUT_MS"
]) {
  if (!env.includes(`${name}=`)) throw new Error(`.env.example must declare ${name}.`);
}
console.log(`PASS repository integrity: ${required.length} required surfaces present`);
