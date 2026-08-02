import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function resolveOllamaCommand(env = process.env) {
  const candidates = [env.OLLAMA_BIN];
  if (process.platform === "win32") {
    candidates.push(
      env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Programs", "Ollama", "ollama.exe"),
      env.ProgramFiles && path.join(env.ProgramFiles, "Ollama", "ollama.exe")
    );
  }
  return candidates.find((candidate) => candidate && existsSync(candidate)) || "ollama";
}

function parseOllamaModels(listText) {
  return String(listText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^name\s+/i.test(line))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
}

export function readOllamaRuntimeProvenance(env = process.env) {
  const command = resolveOllamaCommand(env);
  const version = spawnSync(command, ["--version"], { encoding: "utf8" });
  if (version.error) {
    return {
      available: false,
      launcher: "ollama",
      transport: "native-http",
      reason: "Ollama is not installed or not on PATH.",
      ollamaVersion: "unknown",
      availableModels: []
    };
  }

  const list = spawnSync(command, ["list"], { encoding: "utf8" });
  const versionText = (version.stdout || version.stderr || "").trim() || "unknown";
  const listText = (list.stdout || "").trim();
  const availableModels = parseOllamaModels(listText);

  if (list.status === 0) {
    return {
      available: true,
      launcher: "ollama",
      transport: "native-http",
      ollamaVersion: versionText,
      availableModels,
      listText
    };
  }

  const reason = (list.stderr || list.stdout || "").trim() || `ollama list exit ${list.status ?? "unknown"}`;
  return {
    available: false,
    launcher: "ollama",
    transport: "native-http",
    ollamaVersion: versionText,
    availableModels,
    reason,
    listText
  };
}

function main() {
  const runtime = readOllamaRuntimeProvenance();
  if (runtime.ollamaVersion && runtime.ollamaVersion !== "unknown") console.log(runtime.ollamaVersion);
  if (runtime.listText) console.log(runtime.listText);

  if (runtime.available) {
    if (!runtime.listText) console.log("No local models listed.");
    console.log("PASS local AI runtime available");
    return;
  }

  console.log(runtime.ollamaVersion === "unknown"
    ? "WARN local AI runtime unavailable: Ollama is not installed or not on PATH."
    : `WARN local AI runtime installed but not ready: ${runtime.reason}`);
}

main();