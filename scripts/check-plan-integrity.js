import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const TASK_STATES = new Set(["PENDING", "IN_PROGRESS", "DONE", "BLOCKED"]);
const EVIDENCE_STATES = new Set(["PASS", "WARN", "FAIL", "NOT_RUN", "STALE", "FIXTURE"]);
const REQUIRED_GATES_BY_PHASE = {
  P1: ["Evidence Boundary Gate"],
  P2: ["AI Hero Gate", "Agentic Boundary Gate"],
  P3: ["DataHub Read Grounding Gate", "Write-Back Inheritance Gate"],
  P4: ["Generated Artifact Gate", "Sandbox Execution Gate"],
  P5: ["PR Delivery Gate"],
  P6: ["AI Hero Gate", "Visual Professionalism Gate", "Demo Compression Gate"],
  P7: ["Submission Surface Parity Gate", "AI Hero Gate"],
  P8: ["Maintainer Traction Gate"],
  P9: ["Stretch Proof Gate"]
};

function sectionBetween(plan, startMarker, endMarker) {
  const start = plan.indexOf(startMarker);
  const end = plan.indexOf(endMarker, start);
  if (start === -1 || end === -1) return "";
  return plan.slice(start, end);
}

function parseRows(section) {
  return section
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|") && line.endsWith("|") && !line.includes("---"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim().replaceAll("`", "")));
}

function phaseDependencies(value) {
  return value === "-" ? [] : [...value.matchAll(/P\d+/g)].map((match) => match[0]);
}

function handoffErrors(plan) {
  const match = plan.match(/## CHECKPOINT - HANDOFF[\s\S]*?(?=```)/);
  if (!match) return ["missing CHECKPOINT - HANDOFF block"];

  const requiredFields = ["Last Concluded Micro-Step", "Status", "Next Micro-Step", "Critical Gate Status"];
  return requiredFields
    .filter((field) => !new RegExp(`^- ${field}: .+`, "m").test(match[0]))
    .map((field) => `handoff is missing '${field}'`);
}

export function validatePlan(plan) {
  const errors = handoffErrors(plan);
  const phaseRows = parseRows(sectionBetween(plan, "## 4) Phase Plan", "### 4.1)"))
    .filter((row) => /^P\d+$/.test(row[0] ?? ""));
  const gateRows = parseRows(sectionBetween(plan, "## 7) Validation Gates Matrix", "## 8) Risks, Decisions, Handoff"))
    .filter(([name]) => name !== "Gate Designation");
  const phases = new Map(phaseRows.map(([id, , status, dependencies]) => [id, { status, dependencies }]));
  const gates = new Map(gateRows.map(([name, , , , result]) => [name, result]));

  for (const expectedPhase of Object.keys(REQUIRED_GATES_BY_PHASE).concat("P0")) {
    if (!phases.has(expectedPhase)) errors.push(`missing phase '${expectedPhase}'`);
  }

  for (const [phaseId, phase] of phases) {
    if (!TASK_STATES.has(phase.status)) {
      errors.push(`${phaseId} has invalid task status '${phase.status}'`);
      continue;
    }
    if (phase.status !== "DONE") continue;

    for (const dependency of phaseDependencies(phase.dependencies)) {
      const dependencyStatus = phases.get(dependency)?.status;
      if (dependencyStatus !== "DONE") {
        errors.push(`${phaseId} cannot be DONE while declared dependency ${dependency} is '${dependencyStatus ?? "missing"}'`);
      }
    }
    for (const gateName of REQUIRED_GATES_BY_PHASE[phaseId] ?? []) {
      const gateResult = gates.get(gateName);
      if (gateResult !== "PASS") {
        errors.push(`${phaseId} cannot be DONE while required gate '${gateName}' is '${gateResult ?? "missing"}'`);
      }
    }
  }

  for (const [gateName, gateResult] of gates) {
    if (!EVIDENCE_STATES.has(gateResult)) {
      errors.push(`gate '${gateName}' has invalid evidence state '${gateResult}'`);
    }
  }

  return errors;
}

async function main() {
  const plan = await readFile("plans/PLAN_20260721_contextseal_hackathon_win.md", "utf8");
  const errors = validatePlan(plan);
  if (errors.length > 0) throw new Error(`Plan integrity failed:\n- ${errors.join("\n- ")}`);
  console.log("PASS plan integrity: phase dependencies, mandatory gates, evidence states, and handoff are valid");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}