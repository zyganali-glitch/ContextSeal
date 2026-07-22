import { appendFile, chmod, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const RUN_ID = /^[A-Za-z0-9_-]{1,128}$/;

export class RunStoreConflictError extends Error {
  constructor(message, { runId, expectedState = undefined, actualState = undefined } = {}) {
    super(message);
    this.name = "RunStoreConflictError";
    this.runId = runId;
    this.expectedState = expectedState;
    this.actualState = actualState;
  }
}

function copy(value) {
  return value == null ? value : structuredClone(value);
}

function assertRunId(runId) {
  if (typeof runId !== "string" || !RUN_ID.test(runId)) {
    throw new TypeError("Run ID must contain only letters, numbers, underscores, or hyphens.");
  }
}

function expectedStates(value) {
  return Array.isArray(value) ? value : [value];
}

export class RunStore {
  constructor(root = path.resolve(".contextseal")) {
    this.root = root;
    this.runRoot = path.join(root, "runs");
    this.locks = new Map();
    this.eventTail = Promise.resolve();
  }

  async initialize() {
    await mkdir(this.runRoot, { recursive: true, mode: 0o700 });
    await this.#restrict(this.root, 0o700);
    await this.#restrict(this.runRoot, 0o700);
  }

  async #restrict(file, mode) {
    try {
      await chmod(file, mode);
    } catch (error) {
      if (!["ENOSYS", "ENOTSUP", "EPERM", "EINVAL"].includes(error.code)) throw error;
    }
  }

  #runPath(runId) {
    assertRunId(runId);
    return path.join(this.runRoot, `${runId}.json`);
  }

  async #readPersisted(runId) {
    try {
      return JSON.parse(await readFile(this.#runPath(runId), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async #atomicWrite(run) {
    const destination = this.#runPath(run.runId);
    const temporary = path.join(this.runRoot, `.${run.runId}.${process.pid}.${randomUUID()}.tmp`);
    let handle = null;
    try {
      handle = await open(temporary, "wx", 0o600);
      await handle.writeFile(`${JSON.stringify(run, null, 2)}\n`, "utf8");
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(temporary, destination);
      await this.#restrict(destination, 0o600);
    } catch (error) {
      if (handle) await handle.close().catch(() => {});
      await rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  }

  async #appendEvent(event, run) {
    const entry = `${JSON.stringify({
      at: new Date().toISOString(),
      event,
      runId: run.runId,
      state: run.state
    })}\n`;
    const append = this.eventTail.catch(() => {}).then(async () => {
      const file = path.join(this.root, "events.jsonl");
      await appendFile(file, entry, { encoding: "utf8", mode: 0o600 });
      await this.#restrict(file, 0o600);
    });
    this.eventTail = append;
    await append;
  }

  async #withRunLock(runId, action) {
    assertRunId(runId);
    const previous = this.locks.get(runId) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const tail = previous.catch(() => {}).then(() => gate);
    this.locks.set(runId, tail);
    await previous.catch(() => {});
    try {
      return await action();
    } finally {
      release();
      if (this.locks.get(runId) === tail) this.locks.delete(runId);
    }
  }

  async #withRunLocks(runIds, action, index = 0) {
    const ids = [...new Set(runIds)].sort();
    const acquire = async (position) => {
      if (position === ids.length) return action();
      return this.#withRunLock(ids[position], () => acquire(position + 1));
    };
    return acquire(index);
  }

  #assertExpected(runId, current, expectedState) {
    if (expectedState === undefined) return;
    const actualState = current?.state ?? null;
    const allowed = expectedStates(expectedState);
    if (!allowed.includes(actualState)) {
      throw new RunStoreConflictError(
        `Run ${runId} changed state; expected ${allowed.join(" or ")}, found ${actualState ?? "missing"}.`,
        { runId, expectedState: copy(expectedState), actualState }
      );
    }
  }

  async save(run, event = "RUN_SAVED", { expectedState = undefined } = {}) {
    if (!run || typeof run !== "object" || Array.isArray(run)) throw new TypeError("Run must be an object.");
    assertRunId(run.runId);
    const snapshot = copy(run);
    return this.#withRunLock(snapshot.runId, async () => {
      const current = await this.#readPersisted(snapshot.runId);
      this.#assertExpected(snapshot.runId, current, expectedState);
      await this.#atomicWrite(snapshot);
      await this.#appendEvent(event, snapshot);
      return copy(snapshot);
    });
  }

  async supersede(runId, replacement, event = "LIVE_MCP_EVIDENCE_CAPTURED", {
    expectedState = "AWAITING_HUMAN",
    now = new Date()
  } = {}) {
    assertRunId(runId);
    if (!replacement || typeof replacement !== "object" || Array.isArray(replacement)) {
      throw new TypeError("Replacement run must be an object.");
    }
    assertRunId(replacement.runId);
    if (replacement.runId === runId) {
      throw new RunStoreConflictError("Refreshed evidence must produce a distinct run ID.", {
        runId,
        expectedState,
        actualState: expectedState
      });
    }
    const successor = { ...copy(replacement), supersedesRunId: runId };
    return this.#withRunLocks([runId, successor.runId], async () => {
      const current = await this.#readPersisted(runId);
      this.#assertExpected(runId, current, expectedState);
      const existingSuccessor = await this.#readPersisted(successor.runId);
      if (existingSuccessor) {
        throw new RunStoreConflictError(`Replacement run ${successor.runId} already exists.`, {
          runId: successor.runId,
          expectedState: null,
          actualState: existingSuccessor.state
        });
      }
      const superseded = {
        ...current,
        state: "SUPERSEDED",
        supersededAt: now.toISOString(),
        supersededByRunId: successor.runId
      };
      await this.#atomicWrite(superseded);
      await this.#appendEvent("RUN_SUPERSEDED", superseded);
      await this.#atomicWrite(successor);
      await this.#appendEvent(event, successor);
      return { superseded: copy(superseded), replacement: copy(successor) };
    });
  }

  async get(runId) {
    return this.#withRunLock(runId, async () => copy(await this.#readPersisted(runId)));
  }
}
