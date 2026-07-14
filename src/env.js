import path from "node:path";
import { readFile } from "node:fs/promises";

export async function loadEnvFile(root, env = process.env) {
  try {
    const content = await readFile(path.join(root, ".env"), "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (env[key] == null) env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return env;
}
