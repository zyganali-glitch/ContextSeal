import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedScript = path.join(root, "scripts", "seed-datahub.py");
const venvPython = path.join(root, ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python");

function pythonCandidates() {
  const candidates = [];
  if (process.env.CONTEXTSEAL_PYTHON) candidates.push({ command: process.env.CONTEXTSEAL_PYTHON, argsPrefix: [] });
  candidates.push({ command: venvPython, argsPrefix: [] });
  if (process.platform === "win32") candidates.push({ command: "py", argsPrefix: ["-3.11"] });
  candidates.push({ command: "python", argsPrefix: [] });
  return candidates;
}

function hasDataHubSdk(candidate) {
  const result = spawnSync(candidate.command, [
    ...candidate.argsPrefix,
    "-c",
    "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('datahub.sdk') else 1)"
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    shell: false
  });
  return result.status === 0;
}

const candidate = pythonCandidates().find(hasDataHubSdk);

if (!candidate) {
  console.error("FAIL datahub seed: no Python interpreter with datahub.sdk is available.");
  console.error("Expected one of: CONTEXTSEAL_PYTHON, .venv, py -3.11, or python with acryl-datahub installed.");
  process.exit(1);
}

const run = spawnSync(candidate.command, [...candidate.argsPrefix, seedScript], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: false
});

if (run.error) {
  console.error(`FAIL datahub seed: ${run.error.message}`);
  process.exit(1);
}

process.exit(run.status ?? 1);