const $ = (selector) => document.querySelector(selector);
let currentRun = null;
let staticDemo = null;
const staticMode = location.hostname.endsWith("github.io") || location.protocol === "file:";

function text(selector, value) { $(selector).textContent = String(value ?? "—"); }

function formatChangeType(changeType) {
  return String(changeType || "change")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStrategy(strategy) {
  return String(strategy || "SAFE_PACKAGE").replaceAll("_", " ");
}

function formatWorkflowState(state) {
  const normalized = String(state || "PENDING");
  const labels = {
    AWAITING_HUMAN: "AWAITING HUMAN",
    APPROVED_FOR_WRITEBACK: "APPROVED FOR WRITE-BACK",
    ANALYSIS_PENDING: "ANALYSIS PENDING"
  };
  return labels[normalized] || normalized.replaceAll("_", " ");
}

function evidenceState(run, claim) {
  return run?.evidence?.find((item) => item.claim === claim)?.state || "NOT_RUN";
}

async function ensureDemoData() {
  return staticDemo ||= await api("./demo-data.json");
}

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

function renderHeroSnapshot(run) {
  if (!run) return;

  const passport = run.passport || null;
  const request = run.request || {};
  const artifactCount = run.artifacts?.manifest?.artifacts?.length ?? run.artifacts?.files?.length ?? 0;
  const queryCount = run.context?.queries?.length ?? 0;
  const impactCount = run.impact?.counts?.total ?? 0;
  const criticalCount = run.impact?.counts?.highCriticality ?? 0;

  text("#heroRiskPill", `${run.risk?.score ?? "—"}/100 ${run.risk?.verdict || "BLOCKED"}`);
  text("#heroImpactPill", `${impactCount} downstream`);
  text("#heroPackagePill", `${artifactCount} review files`);
  const snapshotState = passport?.status || run.risk?.verdict || run.state || "PENDING";
  text("#heroSnapshotState", snapshotState);
  $("#heroSnapshotState").dataset.state = passport?.status || run.risk?.verdict || run.state || "PENDING";
  text("#heroRequest", `${formatChangeType(request.changeType)} ${request.sourceField || "field"} -> ${request.destinationField || "safe target"}`);
  text("#heroImpactSummary", `${impactCount} downstream assets, ${criticalCount} critical, ${queryCount} observed queries.`);
  text("#heroPackageCount", `${artifactCount} review files`);
  text("#heroStrategy", formatStrategy(run.artifacts?.strategy));

  if (passport) {
    text("#heroPassport", passport.passportId);
    text("#heroPassportNote", "Scoped approval turns the safe package into a durable DataHub change passport.");
  } else {
    text("#heroPassport", "Pending approval");
    text("#heroPassportNote", "A scoped human approval unlocks the durable change passport.");
  }
}

function renderInheritanceLoop(run) {
  if (!run) return;

  const artifactCount = run.artifacts?.manifest?.artifacts?.length ?? run.artifacts?.files?.length ?? 0;
  const readState = evidenceState(run, "DataHub context retrieved");
  const actState = evidenceState(run, "Migration artifacts generated");
  const writebackState = evidenceState(run, "DataHub write-back completed");
  const inheritState = run.passport?.status || "PENDING";

  text("#loopReadState", readState);
  $("#loopReadState").dataset.state = readState;
  text("#loopReadCopy", readState === "FIXTURE"
    ? "Fixture mode shows the public judge graph from DataHub-shaped context and query evidence."
    : "Live MCP reads grounded the request before any safe package was proposed.");

  text("#loopActState", actState);
  $("#loopActState").dataset.state = actState;
  text("#loopActCopy", `${artifactCount} review files and a safe staged migration replace the destructive request.`);

  text("#loopWritebackState", writebackState);
  $("#loopWritebackState").dataset.state = writebackState;
  text("#loopWritebackCopy", writebackState === "PASS"
    ? "Certified metadata was written back and read back successfully in the bounded live path."
    : "Fixture mode keeps write-back NOT_RUN; separate live-local evidence proves the bounded mutation and read-back path.");

  text("#loopInheritState", inheritState);
  $("#loopInheritState").dataset.state = inheritState;
  text("#loopInheritCopy", run.passport
    ? `The next human or agent can inherit passport ${run.passport.passportId} instead of starting from an empty chat.`
    : "Inheritance starts only after scoped approval certifies the passport.");
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

function renderAi(run) {
  const statusEl = $("#aiStatus");
  const reasonEl = $("#aiReason");
  const container = $("#aiCompanion");
  container.replaceChildren();

  const ai = run.ai;
  const aiStatus = ai?.status || "NOT_RUN";
  text("#aiStatus", aiStatus.replaceAll("_", " "));
  statusEl.dataset.aiState = aiStatus;

  if (!ai) {
    reasonEl.textContent = "The local AI layer has not been attached to this run.";
    return;
  }

  reasonEl.textContent = ai.reason || ai.disclaimer || "The local AI layer produced a bounded explanation.";

  if (!ai.output) return;

  const sections = [
    [ai.output.ownerAlert?.title || "Owner alert", ai.output.ownerAlert?.summary, ai.output.ownerAlert?.bullets || []],
    ["Migration rationale", ai.output.migrationRationale?.summary, ai.output.migrationRationale?.safeguards || []],
    [ai.output.reviewerNoteDraft?.subject || "Reviewer note draft", ai.output.reviewerNoteDraft?.body, []],
    ["Next step guidance", null, [
      ...(ai.output.nextStepGuidance?.immediateActions || []),
      ...(ai.output.nextStepGuidance?.afterApproval || [])
    ]]
  ];

  for (const [titleText, bodyText, bullets] of sections) {
    const block = document.createElement("section");
    block.className = "ai-block";
    const title = document.createElement("strong");
    title.textContent = titleText;
    block.append(title);

    if (bodyText) {
      const body = document.createElement("p");
      body.textContent = bodyText;
      block.append(body);
    }

    if (bullets.length) {
      const list = document.createElement("ul");
      list.className = "ai-bullets";
      for (const item of bullets) {
        const li = document.createElement("li");
        li.textContent = item;
        list.append(li);
      }
      block.append(list);
    }

    container.append(block);
  }
}

function renderRun(run) {
  currentRun = run;
  $("#workspace").classList.remove("hidden");
  renderHeroSnapshot(run);
  renderInheritanceLoop(run);
  text("#requestTitle", run.request.entityName);
  text("#sourceField", run.request.sourceField);
  text("#destinationField", run.request.destinationField || `${run.request.sourceField}_typed`);
  text("#requestRationale", run.request.rationale);
  text("#requestState", formatWorkflowState(run.state));
  $("#requestState").dataset.state = run.risk?.verdict || run.state;
  text("#riskScore", run.risk.score);
  text("#riskVerdict", run.risk.verdict);
  text("#impactCount", run.impact.counts.total);
  text("#criticalCount", `${run.impact.counts.highCriticality} critical`);
  text("#queryCount", run.context.queries?.length || 0);
  text("#strategy", run.artifacts.strategy.replaceAll("_", " "));
  renderGraph(run);
  renderFindings(run.risk.findings);
  renderArtifacts(run.artifacts.files);
  renderAi(run);
  renderEvidence(run.evidence);
  if (run.passport) renderPassport(run.passport);
  else renderPendingPassport();
  $("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderPendingPassport() {
  text("#passportTitle", "Waiting for approval");
  text("#passportStatus", "PENDING");
  $("#passportStatus").className = "seal waiting";
  $("#passportStatus").dataset.state = "PENDING";
  for (const value of $("#passportDetails").querySelectorAll("dd")) value.textContent = "—";
  $("#writebackButton").disabled = true;
  $("#approveButton").disabled = false;
  text("#writebackMessage", "");
}

function renderPassport(passport) {
  text("#passportTitle", passport.status === "CERTIFIED" ? "Certified safe migration" : "Rejected change");
  text("#passportStatus", passport.status);
  $("#passportStatus").className = `seal ${passport.status === "CERTIFIED" ? "certified" : "waiting"}`;
  $("#passportStatus").dataset.state = passport.status;
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
