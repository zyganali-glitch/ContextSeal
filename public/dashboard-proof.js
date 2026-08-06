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

function truncateTechnicalValue(value) {
  if (typeof value !== "string") return String(value ?? "not recorded");
  if (value.length <= 34 || value.includes("\n")) return value;
  if (/^[a-f0-9]{40,64}$/i.test(value)) return `${value.slice(0, 12)}...${value.slice(-10)}`;
  if (value.startsWith("urn:")) return `${value.slice(0, 18)}...${value.slice(-16)}`;
  return `${value.slice(0, 18)}...${value.slice(-14)}`;
}

function groupReceiptState(actions) {
  if (!actions.length) return "NOT_RUN";
  return actions.every((receipt) => receipt.state === "PASS")
    ? "PASS"
    : actions.find((receipt) => receipt.state && receipt.state !== "PASS")?.state || "NOT_RUN";
}

function formatRecordedTime(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : "not recorded";
}

export function createProofDashboard({ select, text, evidenceState, formatChangeType, formatStrategy }) {
  let activeArtifactTabId = null;

  function announceCopyStatus(message) {
    const status = select("#recordedProofCopyStatus");
    if (status) status.textContent = message;
  }

  async function copyValue(button, fullValue, label) {
    const defaultText = button.dataset.defaultText || "Copy";
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(fullValue);
      button.textContent = "Copied";
      button.dataset.copyState = "success";
      announceCopyStatus(`${label} copied.`);
    } catch {
      button.textContent = "Copy failed";
      button.dataset.copyState = "error";
      announceCopyStatus(`${label} could not be copied. Full value remains available in the field title.`);
    }
    if (button._resetTimer) clearTimeout(button._resetTimer);
    button._resetTimer = window.setTimeout(() => {
      button.textContent = defaultText;
      button.dataset.copyState = "idle";
    }, 1600);
  }

  function renderProofValue(entry) {
    const value = entry?.value == null ? "not recorded" : String(entry.value);
    const displayValue = entry?.displayValue == null
      ? entry?.technical ? truncateTechnicalValue(value) : value
      : String(entry.displayValue);
    const wrapper = createNode("div", `proof-value${entry?.technical ? " proof-value-technical" : ""}${displayValue.includes("\n") ? " proof-value-multiline" : ""}`);
    const valueText = createNode("span", "proof-value-text", displayValue);
    valueText.title = value;
    valueText.setAttribute("aria-label", `${entry.label}: ${value}`);
    wrapper.append(valueText);

    if (entry?.copyable && value !== "not recorded") {
      const button = createNode("button", "proof-copy-button", "Copy");
      button.type = "button";
      button.dataset.defaultText = "Copy";
      button.dataset.copyState = "idle";
      button.setAttribute("aria-label", `Copy full ${entry.label}`);
      button.addEventListener("click", () => copyValue(button, value, entry.label));
      wrapper.append(button);
    }

    return wrapper;
  }

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
    for (const entry of entries) {
      const normalized = Array.isArray(entry) ? { label: entry[0], value: entry[1] } : entry;
      const row = createNode("div", "proof-definition-row");
      const term = createNode("dt", null, normalized.label);
      const description = document.createElement("dd");
      description.append(renderProofValue(normalized));
      row.append(term, description);
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
    text("#recordedProofLabel", proof.label || "Recorded live-local proof");
    text("#recordedProofState", proof.status || "NOT_RUN");
    select("#recordedProofState").dataset.state = proof.status || "NOT_RUN";
    text("#recordedProofNote", proof.note || "Recorded evidence is unavailable.");
    announceCopyStatus("");

    const stats = select("#recordedProofStats");
    stats.replaceChildren();
    const entityTypes = Object.entries(proof.read?.entityTypeCounts || {})
      .map(([type, count]) => `${type} ${count ?? "not recorded"}`)
      .join(" · ");
    const queryCount = proof.read?.queryCount;
    appendProofGroup(stats, "Capture", [
      { label: "Proof state", value: proof.status || "NOT_RUN" },
      { label: "Captured", value: formatRecordedTime(proof.observedAt) },
      { label: "Source commit", value: proof.sourceProvenance?.commitSha || "not recorded", technical: true, copyable: true },
      { label: "Target URN", value: proof.targetUrn || "not recorded", technical: true, copyable: true }
    ]);
    appendProofGroup(stats, "Read context", [
      { label: "MCP server", value: [proof.mcp?.serverName, proof.mcp?.serverVersion].filter(Boolean).join(" ") || "not recorded" },
      {
        label: "MCP tools",
        value: proof.read?.toolNames?.join("\n") || "not recorded",
        displayValue: proof.read?.toolNames?.join("\n") || "not recorded",
        technical: true,
        copyable: true
      },
      { label: "Queries", value: queryCount === 0 ? "0 (PASS with zero results)" : queryCount ?? "not recorded" },
      { label: "Entity types", value: entityTypes || "not recorded" },
      { label: "Max hops", value: proof.read?.maxHops ?? "not recorded" },
      { label: "Initial read hash", value: proof.sourceProvenance?.initialRawEvidenceHash || proof.rawEvidenceHash || "not recorded", technical: true, copyable: true },
      { label: "Final read hash", value: proof.sourceProvenance?.finalRawEvidenceHash || "not recorded", technical: true, copyable: true }
    ]);
    appendProofGroup(stats, "Write-back and read-back", [
      { label: "Durable read-back", value: proof.writeback?.durableReadbackState || "not recorded" },
      { label: "Idempotency", value: proof.writeback?.idempotencyStrategy || "not recorded", technical: true },
      { label: "One description", value: proof.writeback?.exactOneDescription?.count == null ? proof.writeback?.exactOneDescription?.state || "not recorded" : `${proof.writeback.exactOneDescription.count} (${proof.writeback.exactOneDescription.state})` },
      { label: "One document", value: proof.writeback?.exactOneDocument?.state || "not recorded" }
    ]);

    const receipts = select("#recordedProofReceipts");
    receipts.replaceChildren();
    for (const [runLabel, actions] of [["first", proof.writeback?.firstRunActions || []], ["second", proof.writeback?.secondRunActions || []]]) {
      if (!actions.length) continue;
      const group = createNode("section", "proof-receipt-group");
      const header = createNode("div", "proof-receipt-header");
      header.append(createNode("strong", "proof-receipt-title", `${runLabel === "first" ? "First run" : "Second run"} receipts`));
      const groupState = createNode("span", "evidence-state", groupReceiptState(actions));
      groupState.dataset.state = groupReceiptState(actions);
      groupState.setAttribute("aria-label", `${runLabel === "first" ? "First run" : "Second run"} group state ${groupState.textContent}`);
      header.append(groupState);
      group.append(header);
      const rows = createNode("div", "proof-receipt-list");
      for (const receipt of actions) {
        const row = createNode("div", "proof-receipt-row");
        row.dataset.state = receipt.state;
        const tool = createNode("code", null, receipt.tool);
        tool.title = `${receipt.tool}: ${receipt.action} (${receipt.state})`;
        const action = createNode("span", "receipt-action", receipt.action);
        action.dataset.action = receipt.action;
        action.setAttribute("aria-label", `${receipt.action}. Receipt state ${receipt.state}.`);
        row.append(tool, action, createNode("span", "sr-only", `Receipt state ${receipt.state}`));
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