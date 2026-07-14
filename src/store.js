import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";

export class RunStore {
  constructor(root = path.resolve(".contextseal")) {
    this.root = root;
    this.runs = new Map();
  }

  async initialize() {
    await mkdir(path.join(this.root, "runs"), { recursive: true });
  }

  async save(run, event = "RUN_SAVED") {
    this.runs.set(run.runId, run);
    await writeFile(path.join(this.root, "runs", `${run.runId}.json`), JSON.stringify(run, null, 2));
    await appendFile(path.join(this.root, "events.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), event, runId: run.runId, state: run.state })}\n`);
    return run;
  }

  async get(runId) {
    if (this.runs.has(runId)) return this.runs.get(runId);
    try {
      const run = JSON.parse(await readFile(path.join(this.root, "runs", `${runId}.json`), "utf8"));
      this.runs.set(runId, run);
      return run;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }
}
