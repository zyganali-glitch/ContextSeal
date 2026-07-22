import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RunStore, RunStoreConflictError } from "../src/store.js";

async function temporaryStore(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "contextseal-store-"));
  const store = new RunStore(root);
  await store.initialize();
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  return { root, store };
}

test("RunStore atomically replaces restrictive run snapshots and returns defensive copies", async (t) => {
  const { root, store } = await temporaryStore(t);
  const input = { runId: "csr_atomic", state: "AWAITING_HUMAN", nested: { score: 90 } };
  await store.save(input, "CREATED", { expectedState: null });
  input.nested.score = 0;
  const loaded = await store.get(input.runId);
  loaded.nested.score = 1;
  assert.equal((await store.get(input.runId)).nested.score, 90);
  assert.deepEqual((await readdir(path.join(root, "runs"))).filter((name) => name.endsWith(".tmp")), []);
  const persisted = await readFile(path.join(root, "runs", `${input.runId}.json`), "utf8");
  assert.doesNotThrow(() => JSON.parse(persisted));
  if (process.platform !== "win32") {
    assert.equal((await stat(path.join(root, "runs", `${input.runId}.json`))).mode & 0o777, 0o600);
  }
});

test("RunStore compare-and-save serializes competing decisions", async (t) => {
  const { store } = await temporaryStore(t);
  await store.save({ runId: "csr_race", state: "AWAITING_HUMAN" }, "CREATED", { expectedState: null });
  const results = await Promise.allSettled([
    store.save({ runId: "csr_race", state: "APPROVED_FOR_WRITEBACK" }, "APPROVED", { expectedState: "AWAITING_HUMAN" }),
    store.save({ runId: "csr_race", state: "REJECTED" }, "REJECTED", { expectedState: "AWAITING_HUMAN" })
  ]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  const rejection = results.find((item) => item.status === "rejected");
  assert.equal(rejection.reason instanceof RunStoreConflictError, true);
  assert.ok(["APPROVED_FOR_WRITEBACK", "REJECTED"].includes((await store.get("csr_race")).state));
});

test("RunStore persists an in-progress claim across store instances to block replay", async (t) => {
  const { root, store } = await temporaryStore(t);
  await store.save({ runId: "csr_replay", state: "APPROVED_FOR_WRITEBACK" }, "APPROVED", { expectedState: null });
  await store.save({ runId: "csr_replay", state: "WRITEBACK_IN_PROGRESS" }, "STARTED", {
    expectedState: "APPROVED_FOR_WRITEBACK"
  });
  const restarted = new RunStore(root);
  await restarted.initialize();
  await assert.rejects(
    () => restarted.save({ runId: "csr_replay", state: "WRITEBACK_IN_PROGRESS" }, "STARTED", {
      expectedState: "APPROVED_FOR_WRITEBACK"
    }),
    (error) => error instanceof RunStoreConflictError && error.actualState === "WRITEBACK_IN_PROGRESS"
  );
});

test("RunStore supersede transition invalidates stale evidence before exposing its replacement", async (t) => {
  const { store } = await temporaryStore(t);
  await store.save({ runId: "csr_old", state: "AWAITING_HUMAN", context: { generation: 1 } }, "CREATED", { expectedState: null });
  const result = await store.supersede(
    "csr_old",
    { runId: "csr_new", state: "AWAITING_HUMAN", context: { generation: 2 } },
    "REFRESHED",
    { now: new Date("2026-07-14T12:00:00.000Z") }
  );
  assert.equal(result.superseded.state, "SUPERSEDED");
  assert.equal(result.superseded.supersededByRunId, "csr_new");
  assert.equal(result.replacement.supersedesRunId, "csr_old");
  await assert.rejects(
    () => store.save({ ...result.superseded, state: "APPROVED_FOR_WRITEBACK" }, "APPROVED", {
      expectedState: "AWAITING_HUMAN"
    }),
    RunStoreConflictError
  );
  assert.equal((await store.get("csr_old")).state, "SUPERSEDED");
  assert.equal((await store.get("csr_new")).state, "AWAITING_HUMAN");
});