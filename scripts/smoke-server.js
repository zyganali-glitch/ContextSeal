import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.CONTEXTSEAL_SMOKE_PORT || (45_000 + (process.pid % 10_000)));
const origin = `http://127.0.0.1:${port}`;
const output = [];
const child = spawn(process.execPath, ["src/server.js"], {
  cwd: root,
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    CONTEXTSEAL_MODE: "fixture",
    DATAHUB_MCP_MUTATIONS_ENABLED: "false"
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});
child.stdout.on("data", (chunk) => output.push(chunk.toString()));
child.stderr.on("data", (chunk) => output.push(chunk.toString()));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function requestJson(pathname, options) {
  const response = await fetch(`${origin}${pathname}`, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(`${options?.method || "GET"} ${pathname} returned ${response.status}: ${payload.error || "unknown error"}`);
  return { response, payload };
}

async function waitForServer() {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited before becoming healthy (${child.exitCode}).`);
    try { return await requestJson("/api/health"); }
    catch { await new Promise((resolve) => setTimeout(resolve, 75)); }
  }
  throw new Error("Server did not become healthy within 8 seconds.");
}

try {
  const { payload: health } = await waitForServer();
  assert(health.status === "ok", "Health response did not report ok.");
  assert(health.mode === "fixture", "Smoke server escaped fixture mode.");
  assert(health.mutationsEnabled === false, "Mutation gate must remain disabled in smoke tests.");
  assert(/^FIXTURE:/.test(health.evidenceBoundary), "Fixture health response must preserve its honest evidence boundary.");

  const [page, demo] = await Promise.all([
    fetch(`${origin}/`),
    requestJson("/api/demo").then((result) => result.payload)
  ]);
  assert(page.ok && (page.headers.get("content-type") || "").startsWith("text/html"), "Dashboard did not serve HTML.");

  const { response: analyzedResponse, payload: analyzed } = await requestJson("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(demo)
  });
  assert(analyzedResponse.status === 201, "Analyze endpoint did not create a run.");
  assert(analyzed.state === "AWAITING_HUMAN", "Analyzed fixture run has an unexpected state.");
  assert(analyzed.evidence?.find((item) => item.claim === "DataHub context retrieved")?.state === "FIXTURE", "Fixture analysis overstated live DataHub evidence.");
  assert(analyzed.impact?.counts?.total === 5, "Fixture judge path must preserve five downstream assets.");
  assert(Math.max(...analyzed.impact.impacted.map((item) => item.hops)) === 4, "Fixture judge path must preserve a deepest path of four hops.");
  assert(analyzed.risk?.score === 80 && analyzed.risk?.verdict === "BLOCKED", "Fixture judge path must deterministically block at risk 80.");
  assert(analyzed.artifacts?.files?.length === 4, "Fixture analysis did not produce four bounded artifacts.");

  const { payload: approved } = await requestJson(`/api/runs/${analyzed.runId}/decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      decision: "APPROVE",
      reviewer: "ci-smoke-reviewer",
      note: "Approve only the generated staged migration plan.",
      scopeAccepted: true
    })
  });
  assert(approved.state === "APPROVED_FOR_WRITEBACK", "Decision endpoint did not record scoped approval.");
  assert(approved.passport?.status === "CERTIFIED", "Approval did not issue a certified passport.");

  const { payload: prepared } = await requestJson(`/api/runs/${analyzed.runId}/writeback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  });
  assert(prepared.status === "FIXTURE_ONLY", "Fixture write-back must be preparation-only.");
  assert(prepared.evidenceState === "NOT_RUN", "Fixture write-back must remain NOT_RUN.");
  assert(prepared.operations?.length === 3, "Fixture write-back did not prepare exactly three bounded operations.");
  console.log(`PASS server smoke: health, dashboard, analyze, approval, and ${prepared.operations.length} fixture-only operations`);
} catch (error) {
  const serverOutput = output.join("").trim();
  if (serverOutput) console.error(serverOutput);
  throw error;
} finally {
  if (child.exitCode === null) child.kill();
}
