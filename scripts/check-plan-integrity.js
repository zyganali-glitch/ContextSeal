import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AI_PROOF_PATH, validateAiProof } from "../src/ai/proof.js";
import { DBT_PROOF_PATH, validateDbtProofArtifact } from "./run-dbt-proof.js";

const TASK_STATES = new Set(["PENDING", "IN_PROGRESS", "DONE", "BLOCKED"]);
const EVIDENCE_STATES = new Set(["PASS", "WARN", "FAIL", "NOT_RUN", "STALE", "FIXTURE"]);
const REQUIRED_GATES_BY_PHASE = {
  P1: ["Evidence Boundary Gate"],
  P2: ["AI Hero Gate", "Agentic Boundary Gate", "AI Model-Backed Proof Gate"],
  P3: ["DataHub Read Grounding Gate", "Write-Back Inheritance Gate"],
  P4: ["Generated Artifact Gate", "Sandbox Execution Gate", "Real dbt Bundle Execution Gate"],
  P5: ["PR Delivery Gate", "Real dbt Bundle Execution Gate"],
  P6: ["AI Hero Gate", "AI Model-Backed Proof Gate", "Visual Professionalism Gate", "Demo Compression Gate"],
  P7: ["Submission Surface Parity Gate", "AI Hero Gate", "AI Model-Backed Proof Gate", "Live Documentation Contract Gate"],
  P8: ["Maintainer Traction Gate"],
  P9: ["Stretch Proof Gate"],
  P10: ["Current Write-Back Export Gate", "Final Video Duration Gate", "Exact Final-HEAD CI Gate", "Exact Final-HEAD Pages Gate", "Submission Completion Gate", "Pre-Submission Freeze Gate"]
};
const REQUIRED_FINAL_GATES = [
  "Real dbt Bundle Execution Gate",
  "AI Model-Backed Proof Gate",
  "Live Documentation Contract Gate",
  "Current Write-Back Export Gate",
  "Final Video Duration Gate",
  "Exact Final-HEAD CI Gate",
  "Exact Final-HEAD Pages Gate",
  "Submission Completion Gate",
  "Pre-Submission Freeze Gate"
];

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function documentField(plan, label) {
  const match = plan.match(new RegExp(`^- ${escapeForRegex(label)}:\\s+` + "`?([^\\r\\n`]+)`?$", "m"));
  return match?.[1] ?? null;
}

function handoffErrors(plan) {
  const match = plan.match(/## CHECKPOINT - HANDOFF[\s\S]*?(?=```)/);
  if (!match) return ["missing CHECKPOINT - HANDOFF block"];

  const requiredFields = ["Last Concluded Micro-Step", "Status", "Next Micro-Step", "Critical Gate Status"];
  return requiredFields
    .filter((field) => !new RegExp(`^- ${escapeForRegex(field)}: .+`, "m").test(match[0]))
    .map((field) => `handoff is missing '${field}'`);
}

function handoffNextStep(plan) {
  const match = plan.match(/^- Next Micro-Step:\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function activePlanStatus(plan) {
  return documentField(plan, "Active status");
}

function uncheckedChecklistItems(checklist) {
  return String(checklist ?? "")
    .split(/\r?\n/)
    .filter((line) => /^- \[ \] /.test(line))
    .map((line) => line.replace(/^- \[ \] /, "").trim());
}

function devpostHasPlaceholder(devpost) {
  return /ADD_PUBLIC_YOUTUBE_URL/.test(String(devpost ?? ""));
}

function devpostVideoLine(devpost) {
  const match = String(devpost ?? "").match(/^- Demo video:\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function devpostHasPublicVideoUrl(devpost) {
  return /^https?:\/\/\S+$/i.test(devpostVideoLine(devpost) ?? "");
}

function noNextStep(nextStep) {
  return typeof nextStep !== "string"
    || /^(none|required)?\.?$/i.test(nextStep.trim())
    || /^none required/i.test(nextStep.trim());
}

function artifactStatus(artifact) {
  if (!artifact) return { exists: false, valid: false, error: "missing" };
  return artifact;
}

function submissionIncomplete(context) {
  const unchecked = uncheckedChecklistItems(context.checklist);
  return unchecked.length > 0
    || !devpostHasPublicVideoUrl(context.devpost)
    || devpostHasPlaceholder(context.devpost)
    || !artifactStatus(context.dbtProof).valid
    || !artifactStatus(context.aiProof).valid;
}

export function validatePlan(plan, context = {}) {
  const errors = handoffErrors(plan);
  const phaseRows = parseRows(sectionBetween(plan, "## 4) Phase Plan", "### 4.1)"))
    .filter((row) => /^P\d+$/.test(row[0] ?? ""));
  const gateRows = parseRows(sectionBetween(plan, "## 7) Validation Gates Matrix", "## 8) Risks, Decisions, Handoff"))
    .filter(([name]) => name !== "Gate Designation");
  const phases = new Map(phaseRows.map(([id, , status, dependencies]) => [id, { status, dependencies }]));
  const gates = new Map(gateRows.map(([name, , , , result]) => [name, result]));
  const activeStatus = activePlanStatus(plan);
  const nextStep = handoffNextStep(plan);
  const unchecked = uncheckedChecklistItems(context.checklist);
  const hasVideoPlaceholder = devpostHasPlaceholder(context.devpost);
  const hasPublicVideoUrl = devpostHasPublicVideoUrl(context.devpost);
  const aiProof = artifactStatus(context.aiProof);
  const dbtProof = artifactStatus(context.dbtProof);

  for (const expectedPhase of Object.keys(REQUIRED_GATES_BY_PHASE).concat("P0")) {
    if (!phases.has(expectedPhase)) errors.push(`missing phase '${expectedPhase}'`);
  }

  for (const gateName of REQUIRED_FINAL_GATES) {
    if (!gates.has(gateName)) errors.push(`missing required final gate '${gateName}'`);
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

  if (gates.get("Real dbt Bundle Execution Gate") === "PASS" && !dbtProof.valid) {
    errors.push(`Real dbt Bundle Execution Gate is PASS but ${DBT_PROOF_PATH} is ${dbtProof.error}.`);
  }

  if (gates.get("AI Model-Backed Proof Gate") === "PASS" && !aiProof.valid) {
    errors.push(`AI Model-Backed Proof Gate is PASS but ${AI_PROOF_PATH} is ${aiProof.error}.`);
  }

  if (gates.get("Submission Completion Gate") === "PASS") {
    if (unchecked.length > 0) {
      errors.push(`Submission Completion Gate is PASS while ${unchecked.length} pre-submission checklist item(s) remain unchecked.`);
    }
    if (!hasPublicVideoUrl) {
      errors.push("Submission Completion Gate is PASS while docs/DEVPOST_SUBMISSION.md does not record a public demo video URL.");
    }
    if (hasVideoPlaceholder) {
      errors.push("Submission Completion Gate is PASS while docs/DEVPOST_SUBMISSION.md still contains ADD_PUBLIC_YOUTUBE_URL.");
    }
  }

  if (gates.get("Pre-Submission Freeze Gate") === "PASS") {
    if (unchecked.length > 0) {
      errors.push(`Pre-Submission Freeze Gate is PASS while ${unchecked.length} pre-submission checklist item(s) remain unchecked.`);
    }
    if (!hasPublicVideoUrl) {
      errors.push("Pre-Submission Freeze Gate is PASS while docs/DEVPOST_SUBMISSION.md does not record a public demo video URL.");
    }
    if (hasVideoPlaceholder) {
      errors.push("Pre-Submission Freeze Gate is PASS while docs/DEVPOST_SUBMISSION.md still contains ADD_PUBLIC_YOUTUBE_URL.");
    }
  }

  if (activeStatus === "DONE") {
    if (unchecked.length > 0) {
      errors.push(`active plan cannot be DONE while ${unchecked.length} pre-submission checklist item(s) remain unchecked.`);
    }
    if (!hasPublicVideoUrl) {
      errors.push("active plan cannot be DONE while docs/DEVPOST_SUBMISSION.md does not record a public demo video URL.");
    }
    if (hasVideoPlaceholder) {
      errors.push("active plan cannot be DONE while docs/DEVPOST_SUBMISSION.md still contains ADD_PUBLIC_YOUTUBE_URL.");
    }
    if (!dbtProof.valid) {
      errors.push(`active plan cannot be DONE while ${DBT_PROOF_PATH} is ${dbtProof.error}.`);
    }
    if (!aiProof.valid) {
      errors.push(`active plan cannot be DONE while ${AI_PROOF_PATH} is ${aiProof.error}.`);
    }
  }

  if (submissionIncomplete(context) && noNextStep(nextStep)) {
    errors.push("handoff cannot say no next step while submission remains incomplete.");
  }

  return errors;
}

async function readValidationContext() {
  const [checklist, devpost] = await Promise.all([
    readFile("docs/PRE_SUBMISSION_CHECKLIST.md", "utf8"),
    readFile("docs/DEVPOST_SUBMISSION.md", "utf8")
  ]);

  async function validatedArtifact(artifactPath, validator) {
    try {
      const payload = JSON.parse(await readFile(artifactPath, "utf8"));
      validator(payload);
      return { exists: true, valid: true, error: null };
    } catch (error) {
      if (error?.code === "ENOENT") return { exists: false, valid: false, error: "missing" };
      return { exists: true, valid: false, error: error.message };
    }
  }

  const [aiProof, dbtProof] = await Promise.all([
    validatedArtifact(AI_PROOF_PATH, validateAiProof),
    validatedArtifact(DBT_PROOF_PATH, validateDbtProofArtifact)
  ]);

  return { checklist, devpost, aiProof, dbtProof };
}

async function main() {
  const plan = await readFile("plans/PLAN_20260721_contextseal_hackathon_win.md", "utf8");
  const context = await readValidationContext();
  const errors = validatePlan(plan, context);

  if (errors.length > 0) {
    throw new Error(`Plan integrity failed:\n- ${errors.join("\n- ")}`);
  }

  console.log("PASS plan integrity: phase dependencies, mandatory gates, evidence states, handoff, checklist, and proof artifacts are valid");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}