import { access, readFile } from "node:fs/promises";

const required = [
  "LICENSE", "README.md", "README.tr.md", "SECURITY.md", "AGENTS.md", ".env.example",
  "docs/ARCHITECTURE.md", "docs/EVIDENCE_BOUNDARY.md", "docs/JUDGING_MAP.md",
  "docs/tr/DEVPOST_BASVURU_REHBERI.md", "docs/tr/DEMO_VIDEO_CEKIM_REHBERI.md",
  "skills/contextseal-change-certification/SKILL.md", "scripts/seed-datahub.py",
  "examples/outputs/live-datahub-read-evidence.json",
  "examples/outputs/live-datahub-writeback-evidence.json"
];
for (const file of required) await access(file);
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.license !== "Apache-2.0") throw new Error("package.json must declare Apache-2.0.");
const env = await readFile(".env.example", "utf8");
if (/gh[pousr]_[A-Za-z0-9_]{20,}/.test(env)) throw new Error("Possible GitHub token in .env.example.");
console.log(`PASS repository integrity: ${required.length} required surfaces present`);
