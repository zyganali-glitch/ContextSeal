const REPOSITORY_SOURCE_ROOT = "https://github.com/zyganali-glitch/ContextSeal/blob/main/";

function repositorySourceUrl(relativePath) {
  return `${REPOSITORY_SOURCE_ROOT}${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function createNode(tagName, className, textValue) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (textValue != null) element.textContent = textValue;
  return element;
}

function stateFromAi(ai) {
  return ai?.status === "PASS" ? "PASS" : "NOT_RUN";
}

function formatRecordedTime(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : "not recorded";
}

export function createProofDashboard({ select, text, evidenceState, formatChangeType, formatStrategy }) {
  let activeArtifactTabId = null;

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

    const title = createNode("strong", null, "Compatibility rename diff");
    const removed = createNode("code", "diff-removed", `- ${run.request.sourceField}`);
    const added = createNode("code", "diff-added", `+ ${run.request.destinationField}`);
    diff.append(title, removed, added);
  }

  function renderArtifactViewer(file, run) {
    text("#artifactKind", file.kind.replaceAll("_", " "));
    text("#artifactPath", file.path);
    select("#artifactContent").textContent = file.content || "No artifact content available.";
    if (activeArtifactTabId) select("#artifactViewer").setAttribute("aria-labelledby", activeArtifactTabId);
    const links = select("#artifactLinks");
    links.replaceChildren();
    appendSourceLink(links, "Manifest grounding", "examples/outputs/generated/ARTIFACT_MANIFEST.json");
    appendSourceLink(links, "Generated source", `examples/outputs/${file.path}`);
    renderRenameDiff(run);
  }

  function renderArtifacts(files, run) {
    const list = select("#artifacts");
    list.replaceChildren();

    const activateTab = (index, focusTab = false) => {
      const tabs = [...list.querySelectorAll("[role=tab]")];
      for (const [tabIndex, tab] of tabs.entries()) {
        const selected = tabIndex === index;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
      }
      const activeTab = tabs[index];
      if (focusTab) activeTab?.focus();
      activeArtifactTabId = activeTab?.id || null;
      if (files[index]) renderArtifactViewer(files[index], run);
    };

    for (const [index, file] of files.entries()) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "artifact-tab";
      row.id = `artifact-tab-${index + 1}`;
      row.setAttribute("role", "tab");
      row.setAttribute("aria-controls", "artifactViewer");
      row.setAttribute("aria-selected", index === 0 ? "true" : "false");
      row.tabIndex = index === 0 ? 0 : -1;
      const icon = createNode("span", "artifact-icon", String(index + 1).padStart(2, "0"));
      const copy = createNode("div", "artifact-copy");
      const title = createNode("strong", null, file.path.split("/").at(-1));
      const directory = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "generated";
      const kind = createNode("p", null, `${file.kind.replaceAll("_", " ")} · ${directory}`);
      copy.append(title, kind);
      row.append(icon, copy);
      row.addEventListener("click", () => activateTab(index));
      row.addEventListener("keydown", (event) => {
        let nextIndex = null;
        if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (index + 1) % files.length;
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (index - 1 + files.length) % files.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = files.length - 1;
        if (nextIndex == null) return;
        event.preventDefault();
        activateTab(nextIndex, true);
      });
      list.append(row);
    }
    if (files.length) activateTab(0);
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
      ["Context capture", evidenceState(run, "DataHub context retrieved"), "Catalog context is captured before deterministic evaluation."],
      ["Schema anchor", evidenceState(run, "Target field validated in schema"), `Source field ${run.request.sourceField} is checked against the captured schema.`],
      ["Lineage boundary", evidenceState(run, "Downstream impact paths traced"), `${run.impact.counts.total} downstream assets stay inside the hop bound.`],
      ["Risk verdict", run.risk.verdict === "BLOCKED" ? "PASS" : "WARN", `${run.risk.score}/100 deterministic verdict: ${run.risk.verdict}.`],
      ["Safety rewrite", artifactState, `${formatStrategy(run.artifacts.strategy)} replaces the destructive request.`],
      ["Manifest grounding", artifactState, `${run.artifacts.files.length} generated files are hash-bound to the grounding contract.`],
      ["AI explanation", stateFromAi(run.ai), run.ai?.status === "PASS" ? "Bounded explanation is available after the deterministic verdict." : "AI remains optional and non-authoritative for this run."],
      ["Human scope", approvalState, approvalState === "PASS" ? "A reviewer approved the generated safe scope." : "No scope approval is recorded yet."],
      ["Passport issuance", run.passport?.status === "CERTIFIED" ? "PASS" : "NOT_RUN", run.passport ? `Passport ${run.passport.passportId} binds the approved decision.` : "A passport cannot exist before scoped approval."],
      ["Write-back gate", writebackState, writebackState === "PASS" ? "Bounded catalog mutation completed and is receipt-backed." : "Write-back stays closed for this fixture run."],
      ["Inherited evidence", readbackState, readbackState === "PASS" ? "Durable read-back made the certified decision available to later operators." : "No durable catalog read-back is claimed by this fixture run."]
    ];

    for (const [index, [titleText, state, detailText]] of checkpoints.entries()) {
      const item = document.createElement("li");
      const sequence = createNode("span", "trace-sequence", String(index + 1).padStart(2, "0"));
      const copy = createNode("div", "trace-copy");
      const title = createNode("strong", null, titleText);
      const detail = createNode("p", null, detailText);
      copy.append(title, detail);
      const badge = createNode("span", "evidence-state", state);
      badge.dataset.state = state;
      item.append(sequence, copy, badge);
      trace.append(item);
    }
  }

  function appendProofGroup(container, titleText, entries) {
    const group = createNode("section", "proof-group");
    group.append(createNode("h3", null, titleText));
    const definitionList = createNode("dl", "proof-definition-list");
    for (const [label, value] of entries) {
      const row = createNode("div", "proof-definition-row");
      row.append(createNode("dt", null, label), createNode("dd", null, String(value)));
      definitionList.append(row);
    }
    group.append(definitionList);
    container.append(group);
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
    const entityTypes = Object.entries(proof.read?.entityTypeCounts || {})
      .map(([type, count]) => `${type} ${count ?? "not recorded"}`)
      .join(" · ");
    const queryCount = proof.read?.queryCount;
    appendProofGroup(stats, "Capture", [
      ["Proof state", proof.status || "NOT_RUN"],
      ["Captured", formatRecordedTime(proof.observedAt)],
      ["Source commit", proof.sourceProvenance?.commitSha || "not recorded"],
      ["Target URN", proof.targetUrn || "not recorded"]
    ]);
    appendProofGroup(stats, "Read context", [
      ["MCP server", [proof.mcp?.serverName, proof.mcp?.serverVersion].filter(Boolean).join(" ") || "not recorded"],
      ["MCP tools", proof.read?.toolNames?.join(", ") || "not recorded"],
      ["Queries", queryCount === 0 ? "0 (PASS with zero results)" : queryCount ?? "not recorded"],
      ["Entity types", entityTypes || "not recorded"],
      ["Max hops", proof.read?.maxHops ?? "not recorded"],
      ["Initial read hash", proof.sourceProvenance?.initialRawEvidenceHash || proof.rawEvidenceHash || "not recorded"],
      ["Final read hash", proof.sourceProvenance?.finalRawEvidenceHash || "not recorded"]
    ]);
    appendProofGroup(stats, "Write-back and read-back", [
      ["Durable read-back", proof.writeback?.durableReadbackState || "not recorded"],
      ["Idempotency", proof.writeback?.idempotencyStrategy || "not recorded"],
      ["One description", proof.writeback?.exactOneDescription?.count == null ? proof.writeback?.exactOneDescription?.state || "not recorded" : `${proof.writeback.exactOneDescription.count} (${proof.writeback.exactOneDescription.state})`],
      ["One document", proof.writeback?.exactOneDocument?.state || "not recorded"]
    ]);

    const receipts = select("#recordedProofReceipts");
    receipts.replaceChildren();
    for (const [runLabel, actions] of [["first", proof.writeback?.firstRunActions || []], ["second", proof.writeback?.secondRunActions || []]]) {
      if (!actions.length) continue;
      const group = createNode("section", "proof-receipt-group");
      group.append(createNode("strong", "proof-receipt-title", `${runLabel === "first" ? "First run" : "Second run"} receipts`));
      const rows = createNode("div", "proof-receipt-list");
      for (const receipt of actions) {
        const row = createNode("div", "proof-receipt-row");
        const tool = createNode("code", null, `${receipt.tool}: ${receipt.action}`);
        const state = createNode("span", "evidence-state", receipt.state);
        state.dataset.state = receipt.state;
        row.append(tool, state);
        rows.append(row);
      }
      group.append(rows);
      receipts.append(group);
    }

    const links = select("#recordedProofLinks");
    links.replaceChildren();
    for (const evidencePath of proof.evidencePaths || []) {
      appendSourceLink(links, evidencePath.includes("writeback") ? "Write-back evidence" : "Read evidence", evidencePath);
    }
  }

  return { renderArtifacts, renderAgentTrace, renderRecordedProof };
}