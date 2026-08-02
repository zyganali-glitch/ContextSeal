const REPOSITORY_SOURCE_ROOT = "https://github.com/zyganali-glitch/ContextSeal/blob/main/";

function repositorySourceUrl(relativePath) {
  return `${REPOSITORY_SOURCE_ROOT}${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function stateFromAi(ai) {
  return ai?.status === "PASS" ? "PASS" : "NOT_RUN";
}

function formatRecordedTime(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : "not recorded";
}

export function createProofDashboard({ select, text, evidenceState, formatChangeType, formatStrategy }) {
  function appendSourceLink(container, label, relativePath) {
    const link = document.createElement("a");
    link.href = repositorySourceUrl(relativePath);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    container.append(link);
  }

  function renderRenameDiff(run) {
    const diff = select("#renameDiff");
    diff.replaceChildren();
    diff.hidden = run.request?.changeType !== "rename_column";
    if (diff.hidden) return;

    const title = document.createElement("strong");
    title.textContent = "Compatibility rename diff";
    const removed = document.createElement("code");
    removed.className = "diff-removed";
    removed.textContent = `- ${run.request.sourceField}`;
    const added = document.createElement("code");
    added.className = "diff-added";
    added.textContent = `+ ${run.request.destinationField}`;
    diff.append(title, removed, added);
  }

  function renderArtifactViewer(file, run) {
    text("#artifactKind", file.kind.replaceAll("_", " "));
    text("#artifactPath", file.path);
    select("#artifactContent").textContent = file.content;
    const links = select("#artifactLinks");
    links.replaceChildren();
    appendSourceLink(links, "Manifest grounding", "examples/outputs/generated/ARTIFACT_MANIFEST.json");
    appendSourceLink(links, "Generated source", `examples/outputs/${file.path}`);
    renderRenameDiff(run);
  }

  function renderArtifacts(files, run) {
    const list = select("#artifacts");
    list.replaceChildren();
    for (const [index, file] of files.entries()) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "artifact-tab";
      row.setAttribute("role", "tab");
      row.setAttribute("aria-selected", index === 0 ? "true" : "false");
      const icon = document.createElement("span");
      icon.className = "artifact-icon";
      icon.textContent = String(index + 1).padStart(2, "0");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = file.path;
      const kind = document.createElement("p");
      kind.textContent = file.kind;
      copy.append(title, kind);
      row.append(icon, copy);
      row.addEventListener("click", () => {
        for (const tab of list.querySelectorAll("[role=tab]")) tab.setAttribute("aria-selected", "false");
        row.setAttribute("aria-selected", "true");
        renderArtifactViewer(file, run);
      });
      list.append(row);
    }
    if (files.length) renderArtifactViewer(files[0], run);
  }

  function renderAgentTrace(run) {
    const trace = select("#agentTrace");
    trace.replaceChildren();
    const artifactState = evidenceState(run, "Migration artifacts generated");
    const approvalState = evidenceState(run, "Human scope approval recorded");
    const writebackState = evidenceState(run, "DataHub write-back completed");
    const readbackState = evidenceState(run, "Durable DataHub read-back verified");
    const checkpoints = [
      ["Change contract", run.mode === "fixture" ? "FIXTURE" : "PASS", `${formatChangeType(run.request.changeType)} request is typed and target-bound.`],
      ["Context capture", evidenceState(run, "DataHub context retrieved"), "Catalog context is preserved before deterministic evaluation."],
      ["Schema anchor", evidenceState(run, "Target field validated in schema"), `Source field ${run.request.sourceField} is checked against the captured schema.`],
      ["Lineage boundary", evidenceState(run, "Downstream impact paths traced"), `${run.impact.counts.total} reachable downstream assets stay within the policy hop bound.`],
      ["Risk verdict", run.risk.verdict === "BLOCKED" ? "PASS" : "WARN", `${run.risk.score}/100 deterministic risk verdict: ${run.risk.verdict}.`],
      ["Safety rewrite", artifactState, `${formatStrategy(run.artifacts.strategy)} replaces the destructive request.`],
      ["Manifest grounding", artifactState, `${run.artifacts.files.length} generated files are hash-bound to the grounding contract.`],
      ["AI explanation", stateFromAi(run.ai), run.ai?.status === "PASS" ? "Bounded explanation is available after the deterministic verdict." : "AI explanation is not authoritative and is not available for this run."],
      ["Human scope", approvalState, approvalState === "PASS" ? "A reviewer approved the generated safe scope." : "No scope approval is recorded yet."],
      ["Passport issuance", run.passport?.status === "CERTIFIED" ? "PASS" : "NOT_RUN", run.passport ? `Passport ${run.passport.passportId} binds the approved decision.` : "A passport cannot exist before scoped approval."],
      ["Write-back gate", writebackState, writebackState === "PASS" ? "Bounded catalog mutation completed and is receipt-backed." : "Write-back stays closed for this fixture run."],
      ["Inherited evidence", readbackState, readbackState === "PASS" ? "Durable read-back made the certified decision available to later operators." : "No durable catalog read-back is claimed by this fixture run."]
    ];

    for (const [index, [titleText, state, detailText]] of checkpoints.entries()) {
      const item = document.createElement("li");
      const sequence = document.createElement("span");
      sequence.className = "trace-sequence";
      sequence.textContent = String(index + 1).padStart(2, "0");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = titleText;
      const detail = document.createElement("p");
      detail.textContent = detailText;
      copy.append(title, detail);
      const badge = document.createElement("span");
      badge.className = "evidence-state";
      badge.dataset.state = state;
      badge.textContent = state;
      item.append(sequence, copy, badge);
      trace.append(item);
    }
  }

  function renderRecordedProof(proof) {
    const section = select("#recordedProof");
    if (!proof) {
      section.classList.add("hidden");
      return;
    }
    section.classList.remove("hidden");
    text("#recordedProofLabel", proof.label || "RECORDED LIVE-LOCAL PROOF");
    text("#recordedProofState", proof.status || "NOT_RUN");
    select("#recordedProofState").dataset.state = proof.status || "NOT_RUN";
    text("#recordedProofNote", proof.note || "Recorded evidence is unavailable.");

    const stats = select("#recordedProofStats");
    stats.replaceChildren();
    const values = [
      ["Recorded", formatRecordedTime(proof.observedAt)],
      ["MCP", [proof.mcp?.serverName, proof.mcp?.serverVersion].filter(Boolean).join(" ") || "not recorded"],
      ["Read tools", proof.read?.toolCount ?? "not recorded"],
      ["Write receipts", proof.writeback?.mutationReceiptCount ?? "not recorded"]
    ];
    for (const [label, value] of values) {
      const item = document.createElement("div");
      const key = document.createElement("span");
      key.textContent = label;
      const content = document.createElement("strong");
      content.textContent = String(value);
      item.append(key, content);
      stats.append(item);
    }

    const receipts = select("#recordedProofReceipts");
    receipts.replaceChildren();
    for (const receipt of proof.writeback?.receiptStates || []) {
      const row = document.createElement("div");
      const tool = document.createElement("code");
      tool.textContent = receipt.tool;
      const state = document.createElement("span");
      state.className = "evidence-state";
      state.dataset.state = receipt.state;
      state.textContent = receipt.state;
      row.append(tool, state);
      receipts.append(row);
    }

    const links = select("#recordedProofLinks");
    links.replaceChildren();
    for (const evidencePath of proof.evidencePaths || []) {
      appendSourceLink(links, evidencePath.includes("writeback") ? "Write-back record" : "Read record", evidencePath);
    }
  }

  return { renderArtifacts, renderAgentTrace, renderRecordedProof };
}