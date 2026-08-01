import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function resolveOllamaCommand(env = process.env) {
  const candidates = [env.OLLAMA_BIN];
  if (process.platform === "win32") {
    candidates.push(
      env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs", "Ollama", "ollama.exe"),
      env.ProgramFiles && path.join(env.ProgramFiles, "Ollama", "ollama.exe")
    );
  }
  return candidates.find((candidate) => candidate && existsSync(candidate)) || "ollama";
}

const command = resolveOllamaCommand();
const version = spawnSync(command, ["--version"], { encoding: "utf8" });
if (version.error) {
  console.log("WARN local AI runtime unavailable: Ollama is not installed or not on PATH.");
  process.exit(0);
}

const list = spawnSync(command, ["list"], { encoding: "utf8" });
const versionText = (version.stdout || version.stderr || "").trim();
if (versionText) console.log(versionText);

if (list.status === 0) {
  const listText = (list.stdout || "").trim();
  console.log(listText || "No local models listed.");
  console.log("PASS local AI runtime available");
  process.exit(0);
}

const reason = (list.stderr || list.stdout || "").trim() || `ollama list exit ${list.status ?? "unknown"}`;
console.log(`WARN local AI runtime installed but not ready: ${reason}`);