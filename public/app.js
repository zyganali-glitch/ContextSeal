const $ = (selector) => document.querySelector(selector);

const STATIC_HOST = location.hostname.endsWith("github.io") || location.protocol === "file:";
const LIVE_BOUNDARY = "LIVE_DATAHUB_MCP_NORMALIZED";
const EVIDENCE_STATES = new Set(["PASS", "WARN", "FAIL", "NOT_RUN", "STALE", "FIXTURE"]);

let currentRun = null;
let staticDemo = null;
let runtime = { kind: "pending", health: null };
let activeArtifact = null;
let operatorToken = "";

function text(selector, value) {
  const element = $(selector);
  if (element) element.textContent = String(value ?? "—");
}

function buttonLabel(selector, value) {
  const button = $(selector);
  if (button?.getAttribute("aria-busy") === "true") {
    button.dataset.label = value;
    return;
  }
  const label = button?.querySelector("span");
  if (label) label.textContent = value;
  else if (button) button.textContent = value;
}

function plainButtonLabel(button, value) {
  if (button.getAttribute("aria-busy") === "true") button.dataset.label = value;
  else button.textContent = value;
}

function humanize(value) {
  return String(value || "—").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function compactHash(value, length = 22) {
  if (!value) return "—";
  const hash = String(value);
  return hash.length > length ? `${hash.slice(0, length)}…` : hash;
}

function safeFileName(value, fallback = "contextseal-artifact.txt") {
  const leaf = String(value || "").split(/[\\/]/).pop();
  return (leaf || fallback).replace(/[^a-zA-Z0-9._-]/g, "-");
}

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function api(url, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (!STATIC_HOST && String(options.method || "GET").toUpperCase() === "POST" && operatorToken) {
    headers.authorization = `Bearer ${operatorToken}`;
  }
  const response = await fetch(url, {
    ...options,
    headers
  });
  const raw = await response.text();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; }
  catch { payload = { error: raw || `Request failed: ${response.status}` }; }
  if (!response.ok) throw new ApiError(payload.error || `Request failed: ${response.status}`, response.status, payload);
  return payload;
}

function notify(message, type = "info") {
  const region = $("#notificationRegion");
  region.setAttribute("role", type === "error" ? "alert" : "status");
  region.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  region.classList.remove("error", "success");
  if (type === "error") region.classList.add("error");
  if (type === "success") region.classList.add("success");
  text("#notificationText", message);
  region.classList.remove("hidden");
}

function clearNotification() {
  $("#notificationRegion").classList.add("hidden");
}

function setBusy(button, busy, busyText) {
  if (!button) return;
  const label = button.querySelector("span") || button;
  if (busy) {
    button.dataset.label = label.textContent;
    label.textContent = busyText;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  } else {
    if (button.dataset.label) label.textContent = button.dataset.label;
    button.removeAttribute("aria-busy");
  }
}

function setRuntime(kind, details = {}) {
  const previousKind = runtime.kind;
  runtime = { ...runtime, kind, ...details };
  const banner = $("#runtimeBanner");
  const badge = $("#modeBadge");
  const reviewer = $("#reviewer");
  const note = $("#decisionNote");
  const operatorForm = $("#operatorAuthForm");

  if (kind.startsWith("datahub-") && !String(previousKind).startsWith("datahub-")) {
    reviewer.value = "";
    note.value = "";
  }

  banner.className = "runtime-banner";
  badge.className = "badge";
  operatorForm.classList.toggle("hidden", kind !== "datahub-unverified" && kind !== "datahub-verified");

  if (kind === "hosted") {
    operatorToken = "";
    banner.classList.add("runtime-hosted");
    badge.classList.add("badge-fixture");
    badge.innerHTML = '<span class="badge-dot" aria-hidden="true"></span>Generated fixture walkthrough';
    text("#runtimeLabel", "HOSTED EXPERIENCE");
    text("#runtimeTitle", "Generated fixture walkthrough");
    text("#runtimeCopy", "This GitHub Pages experience replays a committed, deterministic snapshot. It does not run a backend, contact DataHub, or accept new decisions.");
    text("#runtimeBoundary", "FIXTURE");
    buttonLabel("#analyzeButton", "Open committed analysis");
    text("#heroHint", "Snapshot replay only · no live systems are contacted.");
    reviewer.disabled = true;
    note.disabled = true;
    text("#decisionModeNote", "Read-only replay: the recorded fixture reviewer and note will be revealed unchanged.");
  } else if (kind === "fixture") {
    operatorToken = "";
    banner.classList.add("runtime-fixture");
    badge.classList.add("badge-fixture");
    badge.innerHTML = '<span class="badge-dot" aria-hidden="true"></span>Local fixture · connected';
    text("#runtimeLabel", "LOCAL EXECUTION");
    text("#runtimeTitle", "Local fixture execution");
    text("#runtimeCopy", "The ContextSeal API is running locally. Analysis and approval create a real local run, while DataHub reads and mutations remain explicitly out of scope.");
    text("#runtimeBoundary", "FIXTURE");
    buttonLabel("#analyzeButton", "Run local certification");
    text("#heroHint", "Real local workflow · synthetic context · no catalog mutation.");
    reviewer.disabled = false;
    note.disabled = false;
    text("#decisionModeNote", "A reviewer identity and scoped note are required.");
  } else if (kind === "datahub-unverified") {
    banner.classList.add("runtime-fixture");
    badge.classList.add("badge-unverified");
    badge.innerHTML = '<span class="badge-dot" aria-hidden="true"></span>DataHub mode · unverified';
    text("#runtimeLabel", "CONNECTED MODE REQUESTED");
    text("#runtimeTitle", "Live DataHub evidence is not verified yet");
    text("#runtimeCopy", "The backend is configured for DataHub, but ContextSeal will not claim a live connection until normalized MCP context and its deterministic evidence both pass.");
    text("#runtimeBoundary", "NOT_RUN");
    buttonLabel("#analyzeButton", "Verify DataHub and analyze");
    $("#analyzeButton").disabled = !operatorToken;
    text("#heroHint", "The first analysis verifies MCP context before approval is available.");
    reviewer.disabled = false;
    note.disabled = false;
    text("#decisionModeNote", "Approval remains locked until live DataHub context is verified.");
  } else if (kind === "datahub-verified") {
    banner.classList.add("runtime-live");
    badge.classList.add("badge-live");
    badge.innerHTML = '<span class="badge-dot" aria-hidden="true"></span>DataHub context · verified';
    text("#runtimeLabel", "LIVE EVIDENCE BOUNDARY");
    text("#runtimeTitle", "Connected and grounded by DataHub MCP");
    const summary = details.summary || {};
    const parts = [
      Number.isFinite(summary.toolCount) ? `${summary.toolCount} MCP reads` : null,
      Number.isFinite(summary.downstreamAssetCount) ? `${summary.downstreamAssetCount} downstream assets` : null,
      Number.isFinite(summary.queryCount) ? `${summary.queryCount} observed queries` : null
    ].filter(Boolean);
    text("#runtimeCopy", `${parts.join(" · ") || "Normalized live context received"}. Raw evidence is hash-bound and the human decision remains required.`);
    text("#runtimeBoundary", "PASS");
    buttonLabel("#analyzeButton", "Run a fresh live analysis");
    $("#analyzeButton").disabled = !operatorToken;
    text("#heroHint", "Live reads verified · mutations still require approval and runtime enablement.");
    reviewer.disabled = Boolean(currentRun?.passport);
    note.disabled = Boolean(currentRun?.passport);
    text("#decisionModeNote", "Live evidence verified. Approval certifies only the exact generated manifest.");
  } else if (kind === "offline") {
    banner.classList.add("runtime-offline");
    badge.classList.add("badge-offline");
    badge.innerHTML = '<span class="badge-dot" aria-hidden="true"></span>Server offline';
    text("#runtimeLabel", "RUNTIME UNAVAILABLE");
    text("#runtimeTitle", "The ContextSeal API could not be reached");
    text("#runtimeCopy", "Start the local server, then refresh this page. No certification or connectivity claim has been made.");
    text("#runtimeBoundary", "NOT_RUN");
    $("#analyzeButton").disabled = true;
    text("#heroHint", "No backend connection · no analysis executed.");
  } else {
    banner.classList.add("runtime-pending");
    badge.classList.add("badge-pending");
  }
}

function resetOperatorCredential(message = "Enter the ContextSeal operator token to use the protected live API.") {
  operatorToken = "";
  $("#operatorToken").value = "";
  text("#operatorTokenHint", message);
  plainButtonLabel($("#operatorTokenButton"), "Use for this tab");
  if (runtime.kind === "datahub-unverified" || runtime.kind === "datahub-verified") {
    $("#operatorAuthForm").classList.remove("hidden");
    $("#analyzeButton").disabled = true;
  }
}

function handleProtectedApiError(error) {
  if (error?.status !== 401) return false;
  resetOperatorCredential("The credential was rejected. Re-enter the operator token from the server configuration; it is not your DataHub token.");
  $("#operatorToken").focus();
  return true;
}

function captureOperatorCredential(event) {
  event.preventDefault();
  const input = $("#operatorToken");
  const value = input.value.trim();
  input.value = "";
  if (!value) {
    notify("The protected live API requires a non-empty ContextSeal operator token.", "error");
    input.focus();
    return;
  }
  operatorToken = value;
  text("#operatorTokenHint", "Credential loaded in tab memory. It will be sent only to same-origin POST requests and is never added to run evidence.");
  plainButtonLabel($("#operatorTokenButton"), "Replace token");
  $("#analyzeButton").disabled = false;
  notify("Operator credential loaded in memory. Run a fresh analysis to verify DataHub MCP context.", "success");
}

function evidenceFor(run, claim) {
  return run?.evidence?.find((item) => item.claim === claim);
}

function isVerifiedLiveRun(run) {
  return run?.mode === "datahub"
    && run.context?.evidenceBoundary === LIVE_BOUNDARY
    && evidenceFor(run, "DataHub context retrieved")?.state === "PASS"
    && Boolean(run.liveEvidence?.rawEvidenceHash);
}

function isExpired(passport) {
  if (!passport?.validUntil) return false;
  const timestamp = new Date(passport.validUntil).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function updateWorkflow(run) {
  const steps = [$("#stepRequest"), $("#stepContext"), $("#stepProof"), $("#stepDecision"), $("#stepWriteback")];
  const contextState = evidenceFor(run, "DataHub context retrieved")?.state;
  const writebackState = evidenceFor(run, "DataHub write-back completed")?.state;
  const readbackState = run?.writeback?.readback?.state || evidenceFor(run, "Durable DataHub read-back verified")?.state;
  const complete = [
    Boolean(run),
    contextState === "PASS" || contextState === "FIXTURE",
    Boolean(run?.artifacts?.files?.length),
    Boolean(run?.approval && run?.passport),
    writebackState === "PASS" && readbackState === "PASS"
  ];
  const rejected = run?.approval?.decision === "REJECT" || run?.passport?.status === "REJECTED";
  const stale = Boolean(!STATIC_HOST && run?.passport && isExpired(run.passport) && !complete[4]);
  const writebackBlocked = rejected || stale;
  const current = writebackBlocked ? -1 : complete.findIndex((state) => !state);
  text("#stepWritebackDetail", rejected ? "Stopped by rejection" : stale ? "Certification stale" : "Verified result");
  steps.forEach((step, index) => {
    step.classList.toggle("complete", complete[index]);
    step.classList.toggle("current", current === index);
    step.classList.toggle("blocked", index === 4 && writebackBlocked);
    if (current === index) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
    if (index === 4 && writebackBlocked) step.setAttribute("aria-disabled", "true");
    else step.removeAttribute("aria-disabled");
  });
}

function assetAbbreviation(type) {
  return ({ DATASET: "DS", DATA_JOB: "JOB", DASHBOARD: "DASH", ML_MODEL: "ML" })[type] || String(type || "ASSET").slice(0, 4);
}

function renderGraph(run) {
  const graph = $("#impactGraph");
  graph.replaceChildren();
  const target = run.impact?.target;
  const impacted = run.impact?.impacted || [];
  const deepest = impacted.reduce((max, asset) => Math.max(max, Number(asset.hops) || 0), 0);
  text("#graphSummary", `${impacted.length} downstream asset${impacted.length === 1 ? "" : "s"} across asset-level paths · deepest path: ${deepest} hop${deepest === 1 ? "" : "s"}.`);

  if (!target) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No target asset was returned for this run.";
    graph.append(empty);
    return;
  }

  const targetRow = document.createElement("div");
  targetRow.className = "graph-target";
  const glyph = document.createElement("span");
  glyph.className = "node-glyph";
  glyph.textContent = assetAbbreviation(target.type);
  glyph.setAttribute("aria-hidden", "true");
  const targetCopy = document.createElement("div");
  const targetName = document.createElement("strong");
  targetName.textContent = target.name;
  const targetDetail = document.createElement("small");
  targetDetail.textContent = [target.type, target.platform, ...(target.tags || [])].filter(Boolean).join(" · ");
  targetCopy.append(targetName, targetDetail);
  const targetTag = document.createElement("span");
  targetTag.className = "node-tag";
  targetTag.textContent = "CHANGE TARGET";
  targetRow.append(glyph, targetCopy, targetTag);
  graph.append(targetRow);

  if (!impacted.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No downstream assets were returned by the current evidence boundary.";
    graph.append(empty);
    return;
  }

  const allAssets = [target, ...impacted, ...(run.context?.assets || [])];
  const names = new Map(allAssets.filter((asset) => asset?.urn).map((asset) => [asset.urn, asset.name || asset.urn]));
  const list = document.createElement("div");
  list.className = "path-list";
  for (const asset of impacted) {
    const card = document.createElement("article");
    card.className = `path-card${asset.criticality === "HIGH" ? " high" : ""}`;
    const assetGlyph = document.createElement("span");
    assetGlyph.className = "node-glyph";
    assetGlyph.textContent = assetAbbreviation(asset.type);
    assetGlyph.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    copy.className = "path-asset";
    const name = document.createElement("strong");
    name.textContent = asset.name;
    const owner = document.createElement("small");
    owner.textContent = asset.owners?.[0] ? `Owner · ${asset.owners[0].split(":").pop()}` : "Owner · not recorded";
    copy.append(name, owner);
    const meta = document.createElement("div");
    meta.className = "path-meta";
    const hops = document.createElement("strong");
    hops.textContent = `${asset.hops ?? 0} HOP${asset.hops === 1 ? "" : "S"}`;
    const criticality = document.createElement("small");
    criticality.textContent = asset.criticality || "UNSPECIFIED";
    meta.append(hops, criticality);
    const trail = document.createElement("div");
    trail.className = "path-trail";
    trail.textContent = (asset.path || []).map((urn) => names.get(urn) || urn).join(" → ") || "Path detail not recorded";
    card.append(assetGlyph, copy, meta, trail);
    list.append(card);
  }
  graph.append(list);
}

function renderFindings(findings = []) {
  const list = $("#findings");
  list.replaceChildren();
  text("#findingCount", `${findings.length} finding${findings.length === 1 ? "" : "s"}`);
  if (!findings.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No deterministic policy findings were returned.";
    list.append(empty);
    return;
  }
  for (const item of findings) {
    const row = document.createElement("div");
    row.className = "finding";
    row.dataset.severity = item.severity || "WARN";
    const dot = document.createElement("span");
    dot.className = "finding-severity";
    dot.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    const severity = document.createElement("span");
    severity.className = "sr-only";
    severity.textContent = `${item.severity || "WARN"} severity. `;
    const title = document.createElement("strong");
    title.textContent = humanize(item.code);
    const message = document.createElement("p");
    message.textContent = item.message;
    copy.append(severity, title, message);
    const score = document.createElement("code");
    score.textContent = `${Number(item.weight) >= 0 ? "+" : ""}${item.weight ?? 0}`;
    score.setAttribute("aria-label", `${item.weight ?? 0} risk points`);
    row.append(dot, copy, score);
    list.append(row);
  }
}

function artifactIcon(kind) {
  return ({ DBT_MODEL: "SQL", DBT_TESTS: "YML", ROLLBACK: "REV", OWNER_BRIEF: "MD" })[kind] || "FILE";
}

function renderArtifacts(files = []) {
  const list = $("#artifacts");
  list.replaceChildren();
  text("#artifactCount", `${files.length} file${files.length === 1 ? "" : "s"}`);
  if (!files.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No generated migration artifacts were returned.";
    list.append(empty);
    return;
  }
  for (const file of files) {
    const row = document.createElement("div");
    row.className = "artifact";
    const icon = document.createElement("span");
    icon.className = "artifact-icon";
    icon.textContent = artifactIcon(file.kind);
    icon.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = file.path;
    const kind = document.createElement("p");
    kind.textContent = humanize(file.kind);
    copy.append(title, kind);
    const preview = document.createElement("button");
    preview.type = "button";
    preview.textContent = "Preview";
    preview.setAttribute("aria-label", `Preview ${file.path}`);
    preview.addEventListener("click", () => openArtifact(file));
    row.append(icon, copy, preview);
    list.append(row);
  }
}

function renderEvidence(evidence = []) {
  const list = $("#evidence");
  list.replaceChildren();
  if (!evidence.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No evidence claims were returned.";
    list.append(empty);
    return;
  }
  for (const item of evidence) {
    const row = document.createElement("div");
    row.className = "evidence-row";
    const state = document.createElement("span");
    const stateValue = EVIDENCE_STATES.has(item.state) ? item.state : String(item.state || "NOT_RUN");
    state.className = "evidence-state";
    state.dataset.state = stateValue;
    state.textContent = stateValue;
    const copy = document.createElement("div");
    copy.className = "evidence-copy";
    const claim = document.createElement("strong");
    claim.textContent = item.claim;
    const artifact = document.createElement("small");
    artifact.textContent = item.artifact
      ? (typeof item.artifact === "string" ? item.artifact : JSON.stringify(item.artifact))
      : "No supporting artifact recorded for this state.";
    copy.append(claim, artifact);
    row.append(state, copy);
    list.append(row);
  }
}

function addProvenanceField(list, label, value) {
  const item = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const definition = document.createElement("dd");
  definition.textContent = value ?? "—";
  item.append(term, definition);
  list.append(item);
}

function renderProvenance(run) {
  const container = $("#provenanceSummary");
  container.replaceChildren();
  container.classList.remove("hidden");
  const heading = document.createElement("strong");
  const fields = document.createElement("dl");

  if (isVerifiedLiveRun(run)) {
    heading.textContent = "VERIFIED LIVE PROVENANCE";
    addProvenanceField(fields, "Source", run.context.source);
    addProvenanceField(fields, "Boundary", run.context.evidenceBoundary);
    addProvenanceField(fields, "Raw evidence hash", run.liveEvidence.rawEvidenceHash);
    addProvenanceField(fields, "MCP tool calls", run.liveEvidence.summary?.toolCount ?? run.liveEvidence.evidence?.length ?? "—");
  } else if (run.mode === "fixture") {
    heading.textContent = STATIC_HOST ? "COMMITTED SNAPSHOT PROVENANCE" : "LOCAL FIXTURE PROVENANCE";
    addProvenanceField(fields, "Source", run.context?.source || "Generated fixture");
    addProvenanceField(fields, "Evidence state", "FIXTURE");
    addProvenanceField(fields, "Observed", formatDate(run.context?.observedAt));
    addProvenanceField(fields, "Live DataHub claim", "None");
  } else {
    heading.textContent = "LIVE PROVENANCE NOT VERIFIED";
    addProvenanceField(fields, "Requested mode", run.mode || "datahub");
    addProvenanceField(fields, "Evidence state", evidenceFor(run, "DataHub context retrieved")?.state || "NOT_RUN");
    addProvenanceField(fields, "Required boundary", LIVE_BOUNDARY);
    addProvenanceField(fields, "Approval", "Locked");
  }
  container.append(heading, fields);
}

function resetPassport() {
  text("#passportTitle", "Waiting for approval");
  text("#passportSubtitle", "The passport is created only after a scoped human decision.");
  text("#passportStatus", "PENDING");
  $("#passportStatus").className = "seal waiting";
  text("#passportId", "—");
  text("#manifestHash", "—");
  text("#contextHash", "—");
  text("#validUntil", "—");
  $("#writebackButton").disabled = true;
  buttonLabel("#writebackButton", "Prepare DataHub write-back");
}

function renderWritebackOperations(operations = [], defaultState = "NOT_RUN") {
  const list = $("#writebackOperations");
  list.replaceChildren();
  for (const operation of operations) {
    const item = document.createElement("li");
    const tool = document.createElement("span");
    tool.textContent = operation.tool || "unknown_operation";
    const status = document.createElement("span");
    const state = operation.status || defaultState;
    status.dataset.state = state;
    status.textContent = state;
    item.append(tool, status);
    list.append(item);
  }
}

function showWritebackResult(message, operations = [], state = "NOT_RUN") {
  $("#writebackResult").classList.remove("hidden");
  text("#writebackMessage", message);
  renderWritebackOperations(operations, state);
}

function renderRecordedWriteback(run) {
  if (!run.writeback) return;
  const receipts = run.writeback.mutationReceipts || run.writeback.results || [];
  const readback = run.writeback.readback;
  const operations = [...receipts];
  if (readback) operations.push({ tool: "post_write_readback", status: readback.state || "FAIL" });
  const mutationsPassed = receipts.length > 0 && receipts.every((receipt) => receipt.status === "PASS");
  const verified = readback?.state === "PASS";
  showWritebackResult(
    verified
      ? "PASS · DataHub mutations completed and post-write metadata was read back successfully."
      : mutationsPassed
        ? `${readback?.state || "NOT_RUN"} · Mutation receipts passed, but durable read-back is not verified. The run is not complete.`
        : "Write-back attempt evidence was recorded; inspect every receipt and read-back state below.",
    operations,
    "NOT_RUN"
  );
}

function renderPassport(passport, run) {
  const historicalSnapshot = STATIC_HOST;
  const recordedWindowExpired = historicalSnapshot && isExpired(passport);
  const expired = !historicalSnapshot && isExpired(passport);
  const certified = passport.status === "CERTIFIED";
  const displayedStatus = historicalSnapshot ? "RECORDED" : expired ? "STALE" : passport.status;
  text("#passportStatus", displayedStatus);
  $("#passportStatus").className = `seal ${expired || recordedWindowExpired ? "stale" : certified ? "certified" : "failed"}`;
  text("#passportTitle", historicalSnapshot ? "Recorded fixture certification" : expired ? "Certification expired" : certified ? "Certified safe migration" : "Change not certified");
  text("#passportSubtitle", historicalSnapshot
    ? `This is a historical fixture record${recordedWindowExpired ? " whose recorded validity window has ended" : ""}; it cannot authorize a live write-back.`
    : expired
    ? "The exact plan was certified, but its validity window has elapsed. Re-analyze before any write-back."
    : certified
      ? "The scoped plan, context, artifacts, and decision are bound to this passport."
      : "No DataHub mutation can be prepared from this passport.");
  text("#passportId", passport.passportId);
  text("#manifestHash", compactHash(passport.manifestHash, 34));
  text("#contextHash", compactHash(passport.liveEvidenceHash || passport.contextHash, 34));
  text("#validUntil", formatDate(passport.validUntil));

  const mutationPassed = evidenceFor(run, "DataHub write-back completed")?.state === "PASS";
  const readbackPassed = run.writeback?.readback?.state === "PASS"
    || evidenceFor(run, "Durable DataHub read-back verified")?.state === "PASS";
  const writebackVerified = mutationPassed && readbackPassed;
  const writebackAttempted = Boolean(run.writeback) || ["PASS", "FAIL", "WARN"].includes(evidenceFor(run, "DataHub write-back completed")?.state);
  const canContinue = certified && !expired && (!writebackAttempted || historicalSnapshot);
  $("#writebackButton").disabled = !canContinue;

  if (writebackVerified) {
    buttonLabel("#writebackButton", "DataHub write-back verified");
  } else if (writebackAttempted) {
    buttonLabel("#writebackButton", "Write-back evidence recorded");
  } else if (runtime.kind === "hosted") {
    buttonLabel("#writebackButton", "View write-back boundary");
  } else if (run.mode === "fixture") {
    buttonLabel("#writebackButton", "Prepare protected operations");
  } else if (runtime.health?.mutationsEnabled) {
    buttonLabel("#writebackButton", "Execute certified write-back");
  } else {
    buttonLabel("#writebackButton", "Inspect mutation gate");
  }

  if (run.writeback) renderRecordedWriteback(run);
}

function setDecisionAvailability(run) {
  const approveButton = $("#approveButton");
  const rejectButton = $("#rejectButton");
  const reviewer = $("#reviewer");
  const note = $("#decisionNote");
  const hasDecision = Boolean(run.approval || run.passport);
  if (hasDecision) {
    approveButton.disabled = true;
    rejectButton.disabled = true;
    const rejected = run.approval?.decision === "REJECT" || run.passport?.status === "REJECTED";
    plainButtonLabel(approveButton, STATIC_HOST ? "Recorded approval revealed" : rejected ? "Approval unavailable" : "Safe plan approved");
    plainButtonLabel(rejectButton, rejected ? "Scope rejected" : "Reject scope");
    reviewer.disabled = true;
    note.disabled = true;
    text("#decisionModeNote", STATIC_HOST
      ? "Read-only replay: this recorded decision cannot be changed."
      : rejected
        ? "Scope rejected. Start a fresh analysis to record a different decision."
        : "Scope approved and hash-bound. Start a fresh analysis to record a different decision.");
    return;
  }

  if (STATIC_HOST) {
    reviewer.disabled = true;
    note.disabled = true;
    approveButton.disabled = false;
    rejectButton.disabled = true;
    plainButtonLabel(approveButton, "Reveal recorded approval");
    plainButtonLabel(rejectButton, "Read-only snapshot");
    return;
  }

  if (run.mode === "datahub" && !isVerifiedLiveRun(run)) {
    reviewer.disabled = false;
    note.disabled = false;
    approveButton.disabled = true;
    rejectButton.disabled = true;
    plainButtonLabel(approveButton, "Waiting for verified context");
    plainButtonLabel(rejectButton, "Waiting for verified context");
    text("#decisionModeNote", "Approval is locked because live DataHub context is not verified.");
    return;
  }

  approveButton.disabled = false;
  rejectButton.disabled = false;
  reviewer.disabled = false;
  note.disabled = false;
  plainButtonLabel(approveButton, "Approve safe plan");
  plainButtonLabel(rejectButton, "Reject scope");
  text("#decisionModeNote", run.mode === "datahub"
    ? "Live evidence verified. The decision applies only to this exact generated manifest."
    : "A reviewer identity and scoped note are required.");
}

function renderRun(run, options = {}) {
  const previousRunId = currentRun?.runId;
  currentRun = run;
  $("#workspace").classList.remove("hidden");
  if (previousRunId !== run.runId) {
    $("#writebackResult").classList.add("hidden");
    $("#writebackOperations").replaceChildren();
    if (run.mode === "datahub" && !run.approval) {
      $("#reviewer").value = "";
      $("#decisionNote").value = "";
    }
  }

  const verifiedLive = isVerifiedLiveRun(run);
  if (verifiedLive) setRuntime("datahub-verified", { health: runtime.health, summary: run.liveEvidence.summary });
  else if (run.mode === "datahub") setRuntime("datahub-unverified", { health: runtime.health });

  text("#runId", run.runId);
  text("#runState", run.state);
  text("#runSource", verifiedLive ? "DataHub MCP live · verified" : run.context?.source || (STATIC_HOST ? "Committed snapshot" : "Fixture"));
  text("#observedAt", formatDate(run.liveEvidence?.observedAt || run.context?.observedAt || run.createdAt));
  text("#requestTitle", run.request?.entityName);
  text("#requestUrn", run.request?.targetUrn);
  text("#requestType", humanize(run.request?.changeType));
  text("#requestState", run.state);
  text("#sourceField", run.request?.sourceField);
  text("#destinationField", run.request?.destinationField || `${run.request?.sourceField || "field"}_typed`);
  text("#requestedBy", run.request?.requestedBy);
  text("#requestRationale", run.request?.rationale);
  const riskScore = Math.max(0, Math.min(100, Number(run.risk?.score) || 0));
  text("#riskScore", run.risk?.score);
  text("#riskVerdict", `${run.risk?.verdict || "—"} direct change`);
  $("#riskMeter").style.width = `${riskScore}%`;
  $("#riskMeterTrack").setAttribute("aria-valuenow", String(riskScore));
  $("#riskMeterTrack").setAttribute("aria-valuetext", `${riskScore} out of 100, ${run.risk?.verdict || "unrated"} direct change`);
  text("#impactCount", run.impact?.counts?.total ?? run.impact?.impacted?.length ?? 0);
  text("#criticalCount", `${run.impact?.counts?.highCriticality ?? 0} high criticality`);
  text("#queryCount", run.context?.queries?.length || 0);
  text("#queryCaption", verifiedLive ? "Verified live query signals" : "Synthetic fixture query signals");
  text("#strategy", humanize(run.artifacts?.strategy));

  renderGraph(run);
  renderFindings(run.risk?.findings);
  renderArtifacts(run.artifacts?.files);
  renderEvidence(run.evidence);
  renderProvenance(run);
  updateWorkflow(run);

  if (run.approval) {
    $("#reviewer").value = run.approval.reviewer || "recorded-reviewer";
    $("#decisionNote").value = run.approval.note || "Recorded scoped approval.";
  }
  if (run.passport) renderPassport(run.passport, run);
  else resetPassport();
  setDecisionAvailability(run);

  if (options.scroll) {
    $("#workspace").focus({ preventScroll: true });
    $("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function openArtifact(file) {
  activeArtifact = file;
  text("#artifactDialogKind", humanize(file.kind));
  text("#artifactDialogTitle", file.path);
  text("#artifactDialogContent", file.content || "No artifact content was returned.");
  const dialog = $("#artifactDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeArtifact() {
  const dialog = $("#artifactDialog");
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function downloadBlob(name, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFileName(name);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function analyze() {
  const button = $("#analyzeButton");
  clearNotification();
  setBusy(button, true, STATIC_HOST ? "Loading committed snapshot…" : runtime.kind === "datahub-unverified" || runtime.kind === "datahub-verified" ? "Collecting DataHub MCP context…" : "Tracing fixture context…");
  try {
    let run;
    if (STATIC_HOST) {
      staticDemo ||= await api("./demo-data.json");
      run = staticDemo.analyzed;
    } else {
      const demo = await api("/api/demo");
      const input = runtime.health?.mode === "datahub" ? { request: demo.request } : demo;
      const result = await api("/api/analyze", { method: "POST", body: JSON.stringify(input) });
      run = result.run || result;
    }
    renderRun(run, { scroll: true });
    if (STATIC_HOST) {
      notify("FIXTURE · Loaded the committed generated snapshot. No backend or DataHub request was made.");
    } else if (run.mode === "datahub" && isVerifiedLiveRun(run)) {
      notify("PASS · Live DataHub MCP context was normalized, preserved, and used by the deterministic certification engine.", "success");
    } else if (run.mode === "datahub") {
      notify("NOT_RUN · DataHub mode did not return a verified normalized context. Approval remains locked.", "error");
    } else {
      notify("FIXTURE · Local certification completed with synthetic context; no DataHub claim is made.", "success");
    }
  } catch (error) {
    handleProtectedApiError(error);
    notify(`${error.message} No certification was created from this attempt.`, "error");
  } finally {
    setBusy(button, false);
    if (runtime.kind !== "offline") {
      button.disabled = (runtime.kind === "datahub-unverified" || runtime.kind === "datahub-verified") && !operatorToken;
    }
  }
}

async function submitDecision(event, decision) {
  event.preventDefault();
  if (!currentRun) return;
  const approving = decision === "APPROVE";
  const button = approving ? $("#approveButton") : $("#rejectButton");
  const reviewer = $("#reviewer").value.trim();
  const note = $("#decisionNote").value.trim();
  if (!STATIC_HOST && (!reviewer || !note)) {
    notify("Reviewer identity and decision note are required before a decision.", "error");
    (!reviewer ? $("#reviewer") : $("#decisionNote")).focus();
    return;
  }
  setBusy(button, true, STATIC_HOST ? "Revealing recorded decision…" : approving ? "Binding approval to evidence…" : "Recording rejection…");
  try {
    let run;
    if (STATIC_HOST) {
      staticDemo ||= await api("./demo-data.json");
      run = staticDemo.approved;
    } else {
      run = await api(`/api/runs/${encodeURIComponent(currentRun.runId)}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, reviewer, note, scopeAccepted: approving })
      });
    }
    renderRun(run);
    notify(STATIC_HOST
      ? "FIXTURE · Revealed the approval already stored in the committed snapshot; no new decision was submitted."
      : approving
        ? "PASS · Human scope approval was recorded and bound to the certified manifest."
        : "PASS · Human rejection was recorded; no write-back can be prepared from this run.", "success");
  } catch (error) {
    handleProtectedApiError(error);
    notify(error.message, "error");
    setDecisionAvailability(currentRun);
  } finally {
    setBusy(button, false);
  }
}

function approve(event) {
  return submitDecision(event, "APPROVE");
}

function rejectDecision(event) {
  return submitDecision(event, "REJECT");
}

async function writeback() {
  if (!currentRun?.passport) return;
  const button = $("#writebackButton");
  setBusy(button, true, STATIC_HOST ? "Opening evidence boundary…" : "Checking mutation gates…");
  try {
    if (STATIC_HOST) {
      showWritebackResult("NOT_RUN · The hosted snapshot has no backend and cannot prepare or execute DataHub operations. Run ContextSeal locally to inspect protected operations.");
      notify("NOT_RUN · Static walkthrough stopped at the explicit write-back boundary. No operations were invented or executed.");
      return;
    }

    const result = await api(`/api/runs/${encodeURIComponent(currentRun.runId)}/writeback`, { method: "POST", body: "{}" });
    if (result.status === "FIXTURE_ONLY") {
      showWritebackResult(`NOT_RUN · ${result.operations?.length || 0} bounded operations were prepared locally; DataHub was not modified.`, result.operations || [], "NOT_RUN");
      notify("FIXTURE · Protected operation payloads were prepared for inspection. Catalog mutation remains NOT_RUN.", "success");
    } else {
      const run = result.run || result;
      renderRun(run);
      const readbackState = run.writeback?.readback?.state;
      notify(readbackState === "PASS"
        ? "PASS · Certified metadata was written to DataHub and verified by post-write read-back."
        : "Write-back returned without a PASS read-back. Inspect the evidence ledger.", readbackState === "PASS" ? "success" : "error");
    }
  } catch (error) {
    handleProtectedApiError(error);
    const failedRun = error.payload?.run;
    if (failedRun?.runId) renderRun(failedRun);
    const operations = error.payload?.operations || [];
    if (!failedRun && operations.length) {
      showWritebackResult(`NOT_RUN · ${error.message} Certified operations are shown below; no mutation was executed.`, operations, "NOT_RUN");
    }
    notify(`${error.message} No unverified write-back is claimed.`, "error");
  } finally {
    setBusy(button, false);
    const retrySafe = currentRun?.passport
      && !isExpired(currentRun.passport)
      && !currentRun.writeback
      && evidenceFor(currentRun, "DataHub write-back completed")?.state === "NOT_RUN";
    if (retrySafe) button.disabled = false;
  }
}

async function copyArtifact() {
  if (!activeArtifact) return;
  try {
    await navigator.clipboard.writeText(activeArtifact.content || "");
    const button = $("#copyArtifactButton");
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = original; }, 1400);
    notify(`Copied ${activeArtifact.path} to the clipboard.`, "success");
  } catch {
    notify("Clipboard access was unavailable. Select the preview text and copy it manually.", "error");
  }
}

function downloadArtifact() {
  if (!activeArtifact) return;
  downloadBlob(activeArtifact.path, activeArtifact.content || "");
}

function downloadEvidenceBundle() {
  if (!currentRun) return;
  const exportBoundary = STATIC_HOST
    ? "FIXTURE"
    : isVerifiedLiveRun(currentRun)
      ? LIVE_BOUNDARY
      : currentRun.mode === "fixture" ? "FIXTURE" : "NOT_RUN";
  const bundle = {
    exportedAt: new Date().toISOString(),
    exportBoundary,
    claimStates: Object.fromEntries((currentRun.evidence || []).map((item) => [item.claim, item.state])),
    privacyNotice: isVerifiedLiveRun(currentRun)
      ? "Live bundles can contain private metadata such as URNs, owners, and query text. Store and share them only in an approved location."
      : "This bundle contains synthetic fixture metadata.",
    run: currentRun
  };
  downloadBlob(`contextseal-${currentRun.runId || "certification"}.json`, `${JSON.stringify(bundle, null, 2)}\n`, "application/json;charset=utf-8");
  notify(`${bundle.exportBoundary} · Downloaded the current run with per-claim states.${isVerifiedLiveRun(currentRun) ? " Treat live metadata as private." : ""}`);
}

async function boot() {
  if (STATIC_HOST) {
    setRuntime("hosted");
    return;
  }
  try {
    const health = await api("/api/health");
    if (health.mode === "datahub") setRuntime("datahub-unverified", { health });
    else setRuntime("fixture", { health });
  } catch {
    setRuntime("offline");
    notify("The local API health check failed. Start ContextSeal and reload this page.", "error");
  }
}

$("#analyzeButton").addEventListener("click", analyze);
$("#decisionForm").addEventListener("submit", (event) => event.preventDefault());
$("#approveButton").addEventListener("click", approve);
$("#rejectButton").addEventListener("click", rejectDecision);
$("#writebackButton").addEventListener("click", writeback);
$("#downloadBundleButton").addEventListener("click", downloadEvidenceBundle);
$("#dismissNotification").addEventListener("click", clearNotification);
$("#closeArtifactDialog").addEventListener("click", closeArtifact);
$("#copyArtifactButton").addEventListener("click", copyArtifact);
$("#downloadArtifactButton").addEventListener("click", downloadArtifact);
$("#artifactDialog").addEventListener("click", (event) => {
  if (event.target === $("#artifactDialog")) closeArtifact();
});
$("#operatorAuthForm").addEventListener("submit", captureOperatorCredential);

boot();
