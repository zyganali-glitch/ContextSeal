const $ = (selector) => document.querySelector(selector);
let currentRun = null;
let staticDemo = null;
const staticMode = location.hostname.endsWith("github.io") || location.protocol === "file:";

function text(selector, value) { $(selector).textContent = String(value ?? "—"); }

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload;
}

function renderGraph(run) {
  const graph = $("#impactGraph");
  graph.replaceChildren();
  const assets = [run.impact.target, ...run.impact.impacted];
  for (const [index, asset] of assets.entries()) {
    const node = document.createElement("div");
    node.className = `asset-node${index === 0 ? " target" : ""}`;
    const type = document.createElement("span");
    type.className = "node-type";
    type.textContent = index === 0 ? "CHANGE TARGET" : asset.type;
    const name = document.createElement("strong");
    name.textContent = asset.name;
    const detail = document.createElement("small");
    detail.textContent = index === 0 ? "PII · Tier 1" : `${asset.hops} hop${asset.hops === 1 ? "" : "s"} · ${asset.criticality}`;
    node.append(type, name, detail);
    graph.append(node);
  }
}

function renderFindings(findings) {
  const list = $("#findings");
  list.replaceChildren();
  for (const item of findings) {
    const row = document.createElement("div");
    row.className = "finding";
    row.dataset.severity = item.severity;
    const dot = document.createElement("span");
    dot.className = "finding-severity";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.code.replaceAll("_", " ");
    const message = document.createElement("p");
    message.textContent = item.message;
    copy.append(title, message);
    const score = document.createElement("code");
    score.textContent = `+${item.weight}`;
    row.append(dot, copy, score);
    list.append(row);
  }
}

function renderArtifacts(files) {
  const list = $("#artifacts");
  list.replaceChildren();
  for (const file of files) {
    const row = document.createElement("div");
    row.className = "artifact";
    const icon = document.createElement("span");
    icon.className = "artifact-icon";
    icon.textContent = "✓";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = file.path;
    const kind = document.createElement("p");
    kind.textContent = file.kind;
    copy.append(title, kind);
    row.append(icon, copy);
    list.append(row);
  }
}

function renderEvidence(evidence) {
  const list = $("#evidence");
  list.replaceChildren();
  for (const item of evidence) {
    const row = document.createElement("div");
    row.className = "evidence-row";
    const state = document.createElement("span");
    state.className = "evidence-state";
    state.dataset.state = item.state;
    state.textContent = item.state;
    const claim = document.createElement("span");
    claim.textContent = item.claim;
    row.append(state, claim);
    list.append(row);
  }
}

function renderRun(run) {
  currentRun = run;
  $("#workspace").classList.remove("hidden");
  text("#requestTitle", run.request.entityName);
  text("#sourceField", run.request.sourceField);
  text("#destinationField", run.request.destinationField || `${run.request.sourceField}_typed`);
  text("#requestRationale", run.request.rationale);
  text("#requestState", run.state);
  text("#riskScore", run.risk.score);
  text("#riskVerdict", run.risk.verdict);
  text("#impactCount", run.impact.counts.total);
  text("#criticalCount", `${run.impact.counts.highCriticality} critical`);
  text("#queryCount", run.context.queries?.length || 0);
  text("#strategy", run.artifacts.strategy.replaceAll("_", " "));
  renderGraph(run);
  renderFindings(run.risk.findings);
  renderArtifacts(run.artifacts.files);
  renderEvidence(run.evidence);
  if (run.passport) renderPassport(run.passport);
  $("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderPassport(passport) {
  text("#passportTitle", passport.status === "CERTIFIED" ? "Certified safe migration" : "Rejected change");
  text("#passportStatus", passport.status);
  $("#passportStatus").className = `seal ${passport.status === "CERTIFIED" ? "certified" : "waiting"}`;
  const values = $("#passportDetails").querySelectorAll("dd");
  values[0].textContent = passport.passportId;
  values[1].textContent = passport.manifestHash.slice(0, 24) + "…";
  values[2].textContent = new Date(passport.validUntil).toLocaleString();
  $("#writebackButton").disabled = passport.status !== "CERTIFIED";
  $("#approveButton").disabled = true;
}

async function analyze() {
  $("#analyzeButton").disabled = true;
  $("#analyzeButton").textContent = "Tracing DataHub context…";
  try {
    const run = staticMode
      ? (staticDemo ||= await api("./demo-data.json")).analyzed
      : await api("/api/analyze", { method: "POST", body: JSON.stringify(await api("/api/demo")) });
    renderRun(run);
  } catch (error) {
    alert(error.message);
  } finally {
    $("#analyzeButton").disabled = false;
    $("#analyzeButton").textContent = "Analyze again";
  }
}

async function approve() {
  if (!currentRun) return;
  $("#approveButton").disabled = true;
  try {
    const run = staticMode ? (staticDemo ||= await api("./demo-data.json")).approved : await api(`/api/runs/${encodeURIComponent(currentRun.runId)}/decision`, {
      method: "POST",
      body: JSON.stringify({
        decision: "APPROVE",
        reviewer: $("#reviewer").value,
        note: $("#decisionNote").value,
        scopeAccepted: true
      })
    });
    renderRun(run);
  } catch (error) {
    alert(error.message);
    $("#approveButton").disabled = false;
  }
}

async function writeback() {
  if (!currentRun) return;
  $("#writebackButton").disabled = true;
  try {
    const result = staticMode
      ? { status: "FIXTURE_ONLY", operations: [{}, {}, {}] }
      : await api(`/api/runs/${encodeURIComponent(currentRun.runId)}/writeback`, { method: "POST", body: "{}" });
    if (result.status === "FIXTURE_ONLY") {
      text("#writebackMessage", `Fixture safety: ${result.operations.length} operations prepared; DataHub was not modified.`);
    } else {
      renderRun(result);
      text("#writebackMessage", "PASS: certified metadata was written back to DataHub.");
    }
  } catch (error) {
    text("#writebackMessage", error.message);
  }
}

try {
  const health = staticMode ? { mode: "fixture" } : await api("/api/health");
  text("#modeBadge", health.mode === "datahub" ? "LIVE DATAHUB MCP" : "FIXTURE · SAFE DEMO");
  $("#modeBadge").className = `badge ${health.mode === "datahub" ? "badge-live" : "badge-fixture"}`;
} catch {
  text("#modeBadge", "SERVER OFFLINE");
}

$("#analyzeButton").addEventListener("click", analyze);
$("#approveButton").addEventListener("click", approve);
$("#writebackButton").addEventListener("click", writeback);
