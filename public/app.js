import { createProofDashboard } from "./dashboard-proof.js";

const $ = (selector) => document.querySelector(selector);
let currentRun = null;
let staticDemo = null;
const staticMode = location.hostname.endsWith("github.io") || location.protocol === "file:";

function text(selector, value) { $(selector).textContent = String(value ?? "—"); }

function createNode(tagName, className, textValue) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (textValue != null) element.textContent = textValue;
  return element;
}

function formatChangeType(changeType) {
  return String(changeType || "change")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMachineLabel(value) {
  return String(value || "").replaceAll("_", " ");
}

function formatStrategy(strategy) {
  return formatMachineLabel(strategy || "SAFE_PACKAGE");
}

function formatWorkflowState(state) {
  const normalized = String(state || "PENDING");
  const labels = {
    AWAITING_HUMAN: "AWAITING HUMAN",
    APPROVED_FOR_WRITEBACK: "APPROVED FOR WRITE-BACK",
    ANALYSIS_PENDING: "ANALYSIS PENDING"
  };
  return labels[normalized] || formatMachineLabel(normalized);
}

function evidenceState(run, claim) {
  return run?.evidence?.find((item) => item.claim === claim)?.state || "NOT_RUN";
}

const EVIDENCE_GROUPS = [
  {
    key: "fixture-read",
    title: "Fixture and read evidence",
    claims: new Set(["DataHub context retrieved", "Target field validated in schema"])
  },
  {
    key: "deterministic",
    title: "Deterministic computation",
    claims: new Set(["Downstream impact paths traced"])
  },
  {
    key: "artifacts",
    title: "Generated artifacts",
    claims: new Set(["Migration artifacts generated"])
  },
  {
    key: "approval",
    title: "Human approval",
    claims: new Set(["Human scope approval recorded"])
  },
  {
    key: "warehouse",
    title: "Warehouse execution",
    claims: new Set(["Generated SQL executed in warehouse"])
  },
  {
    key: "writeback",
    title: "Write-back and read-back",
    claims: new Set(["DataHub write-back completed", "Durable DataHub read-back verified"])
  }
];

const { renderArtifacts, renderAgentTrace, renderRecordedProof } = createProofDashboard({
  select: $,
  text,
  evidenceState,
  formatChangeType,
  formatStrategy
});

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

  const targetCard = createNode("section", "impact-target");
  const targetHeader = createNode("div", "impact-target-header");
  targetHeader.append(
    createNode("span", "kicker", "TARGET ASSET"),
    createNode("strong", "impact-target-name", run.impact.target.name),
    createNode(
      "p",
      "impact-target-copy",
      `${formatMachineLabel(run.impact.target.type)} · ${run.impact.target.platform || "platform not recorded"} · ${run.impact.target.criticality}`
    )
  );

  const targetMeta = createNode("dl", "impact-meta-list");
  for (const [label, value] of [
    ["Field", run.request.sourceField],
    ["Tags", run.impact.target.tags?.join(", ") || "No tags recorded"],
    ["Terms", run.impact.target.terms?.join(", ") || "No glossary terms recorded"]
  ]) {
    const row = createNode("div", "impact-meta-row");
    row.append(createNode("dt", null, label), createNode("dd", null, value));
    targetMeta.append(row);
  }
  targetCard.append(targetHeader, targetMeta);

  const lane = createNode("ol", "impact-list");
  for (const [index, asset] of run.impact.impacted.entries()) {
    const row = createNode("li", "impact-row");
    const step = createNode("span", "impact-step", String(index + 1).padStart(2, "0"));
    const copy = createNode("div", "impact-row-copy");
    copy.append(
      createNode("strong", null, asset.name),
      createNode(
        "p",
        "impact-row-meta",
        `${formatMachineLabel(asset.type)} · ${asset.hops} hop${asset.hops === 1 ? "" : "s"} · ${asset.criticality}`
      )
    );
    const state = createNode("span", "impact-row-status", asset.criticality);
    state.dataset.tone = asset.criticality === "HIGH" ? "critical" : "standard";
    row.append(step, copy, state);
    lane.append(row);
  }

  graph.append(
    targetCard,
    lane,
    createNode(
      "p",
      "impact-footnote muted",
      `${run.impact.counts.total} downstream assets remain fixture-rendered in the public judge path.`
    )
  );
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
    ? "Fixture replay shows the public judge graph from DataHub-shaped context and query evidence."
    : run.liveEvidence?.captureStage === "PRE_ANALYSIS"
      ? "Raw live MCP reads were captured before the deterministic safe package was proposed; displayed impact paths remain fixture-derived."
      : "Raw live MCP reads were captured after analysis; displayed impact paths remain fixture-derived.");

  text("#loopActState", actState);
  $("#loopActState").dataset.state = actState;
  text("#loopActCopy", `${artifactCount} review files and a safe staged migration replace the destructive request.`);

  text("#loopWritebackState", writebackState);
  $("#loopWritebackState").dataset.state = writebackState;
  text("#loopWritebackCopy", writebackState === "PASS"
    ? "Certified metadata was written back and read back successfully in the bounded live path."
    : "Fixture replay keeps write-back NOT_RUN; separate live-local evidence proves the bounded mutation and read-back path.");

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
    const row = createNode("div", "finding");
    row.className = "finding";
    row.dataset.severity = item.severity;
    const dot = createNode("span", "finding-severity");
    const copy = createNode("div", "finding-copy");
    const title = createNode("strong", null, item.code.replaceAll("_", " "));
    const message = createNode("p", null, item.message);
    copy.append(title, message);
    const score = createNode("code", null, `+${item.weight}`);
    row.append(dot, copy, score);
    list.append(row);
  }
}

function renderEvidence(evidence) {
  const list = $("#evidence");
  list.replaceChildren();

  const grouped = new Map(EVIDENCE_GROUPS.map((group) => [group.key, []]));
  for (const item of evidence) {
    const matched = EVIDENCE_GROUPS.find((group) => group.claims.has(item.claim))?.key || "deterministic";
    grouped.get(matched).push(item);
  }

  for (const group of EVIDENCE_GROUPS) {
    const items = grouped.get(group.key);
    if (!items?.length) continue;

    const section = createNode("section", "evidence-group");
    section.append(createNode("h3", null, group.title));
    const entries = createNode("div", "evidence-group-list");

    for (const item of items) {
      const row = createNode("div", "evidence-row");
      const state = createNode("span", "evidence-state", item.state);
      state.dataset.state = item.state;
      const copy = createNode("div", "evidence-content");
      copy.append(createNode("strong", null, item.claim));
      if (item.artifact) copy.append(createNode("p", "evidence-note", item.artifact));
      row.append(state, copy);
      entries.append(row);
    }

    section.append(entries);
    list.append(section);
  }
}

function setPassportDetails(values) {
  const nodes = $("#passportDetails").querySelectorAll("dd");
  values.forEach((value, index) => {
    if (nodes[index]) nodes[index].textContent = value;
  });
}

function passportEvidenceSummary(run) {
  return [
    `Context ${evidenceState(run, "DataHub context retrieved")}`,
    `Artifacts ${evidenceState(run, "Migration artifacts generated")}`,
    `Approval ${evidenceState(run, "Human scope approval recorded")}`,
    `Write-back ${evidenceState(run, "DataHub write-back completed")}`
  ].join(" · ");
}

function renderAi(run) {
  const statusEl = $("#aiStatus");
  const labelEl = $("#aiProofLabel");
  const reasonEl = $("#aiReason");
  const boundaryEl = $("#aiBoundaryNote");
  const container = $("#aiCompanion");
  container.replaceChildren();

  const recordedAiProof = staticMode ? staticDemo?.recordedAiProof || null : null;
  const usingRecordedProof = recordedAiProof?.status === "PASS";
  const ai = usingRecordedProof ? recordedAiProof : run.ai;
  const aiStatus = ai?.status || "NOT_RUN";
  text("#aiStatus", aiStatus.replaceAll("_", " "));
  statusEl.dataset.aiState = aiStatus;

  if (!ai) {
    labelEl.hidden = true;
    boundaryEl.textContent = "Explanation only. Deterministic ContextSeal evidence remains authoritative.";
    reasonEl.textContent = "The local AI layer has not been attached to this run.";
    return;
  }

  if (usingRecordedProof) {
    labelEl.hidden = false;
    labelEl.textContent = recordedAiProof.boundary?.label || "RECORDED LOCAL OLLAMA PROOF";
    reasonEl.textContent = recordedAiProof.boundary?.hostedDemo || "Not live inference on GitHub Pages.";
    boundaryEl.textContent = recordedAiProof.boundary?.authority || ai.disclaimer || "Deterministic ContextSeal evidence remains authoritative.";
  } else {
    labelEl.hidden = true;
    reasonEl.textContent = ai.reason || ai.disclaimer || "The local AI layer produced a bounded explanation.";
    boundaryEl.textContent = ai.disclaimer || "Explanation only. Deterministic ContextSeal evidence remains authoritative.";
  }

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
  $("#requestState").dataset.state = run.state;
  text("#riskScore", run.risk.score);
  text("#riskVerdict", run.risk.verdict);
  text("#impactCount", run.impact.counts.total);
  text("#criticalCount", `${run.impact.counts.highCriticality} critical`);
  text("#queryCount", run.context.queries?.length || 0);
  text("#strategy", run.artifacts.strategy.replaceAll("_", " "));
  renderGraph(run);
  renderFindings(run.risk.findings);
  renderArtifacts(run.artifacts.files, run);
  renderAgentTrace(run);
  renderAi(run);
  renderEvidence(run.evidence);
  if (run.passport) renderPassport(run);
  else renderPendingPassport();
  $("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderPendingPassport() {
  const run = currentRun;
  text("#passportTitle", "Awaiting scoped approval");
  text("#passportStatus", "PENDING");
  $("#passportStatus").className = "seal waiting";
  $("#passportStatus").dataset.state = "PENDING";
  setPassportDetails([
    "PENDING",
    "—",
    "—",
    "Awaiting reviewer approval",
    run ? formatStrategy(run.artifacts?.strategy) : "—",
    "Generated safe scope only",
    run ? passportEvidenceSummary(run) : "—"
  ]);
  $("#writebackButton").disabled = true;
  $("#approveButton").disabled = false;
  text("#writebackMessage", "");
}

function renderPassport(run) {
  const passport = run.passport;
  text("#passportTitle", passport.status === "CERTIFIED" ? "Certified safe migration" : "Rejected change");
  text("#passportStatus", passport.status);
  $("#passportStatus").className = `seal ${passport.status === "CERTIFIED" ? "certified" : "waiting"}`;
  $("#passportStatus").dataset.state = passport.status;
  setPassportDetails([
    passport.status,
    passport.passportId,
    passport.manifestHash,
    new Date(passport.validUntil).toLocaleString(),
    formatStrategy(run.artifacts?.strategy),
    run.approval?.scopeAccepted ? "Generated safe scope only" : "Awaiting reviewer scope",
    passportEvidenceSummary(run)
  ]);
  $("#writebackButton").disabled = passport.status !== "CERTIFIED";
  $("#approveButton").disabled = true;
  text("#writebackMessage", "");
}

async function analyze() {
  $("#analyzeButton").disabled = true;
  $("#analyzeButton").textContent = "Analyzing context...";
  try {
    const run = staticMode
      ? (staticDemo ||= await api("./demo-data.json")).analyzed
      : await api("/api/analyze", { method: "POST", body: JSON.stringify(await api("/api/demo")) });
    renderRun(run);
  } catch (error) {
    alert(error.message);
  } finally {
    $("#analyzeButton").disabled = false;
    $("#analyzeButton").textContent = "Analyze change";
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
      text("#writebackMessage", `Fixture replay prepared ${result.operations.length} write-back operations. DataHub was not modified.`);
    } else {
      renderRun(result);
      text("#writebackMessage", "PASS: certified metadata was written back to DataHub.");
    }
  } catch (error) {
    text("#writebackMessage", error.message);
  }
}

try {
  renderRecordedProof((await ensureDemoData()).recordedLiveProof);
} catch {
  renderRecordedProof(null);
}

try {
  const health = staticMode ? { mode: "fixture" } : await api("/api/health");
  text("#modeBadge", health.mode === "datahub" ? "LIVE DATAHUB MCP" : "FIXTURE REPLAY");
  $("#modeBadge").className = `badge ${health.mode === "datahub" ? "badge-live" : "badge-fixture"}`;
} catch {
  text("#modeBadge", "SERVER OFFLINE");
}

$("#analyzeButton").addEventListener("click", analyze);
$("#approveButton").addEventListener("click", approve);
$("#writebackButton").addEventListener("click", writeback);
