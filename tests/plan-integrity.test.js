import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AI_PROOF_PATH } from "../src/ai/proof.js";
import { DBT_PROOF_PATH } from "../scripts/run-dbt-proof.js";
import { validatePlan } from "../scripts/check-plan-integrity.js";

const [activePlan, checklist, devpost] = await Promise.all([
  readFile("plans/PLAN_20260721_contextseal_hackathon_win.md", "utf8"),
  readFile("docs/PRE_SUBMISSION_CHECKLIST.md", "utf8"),
  readFile("docs/DEVPOST_SUBMISSION.md", "utf8")
]);
const activeContext = {
  checklist,
  devpost,
  aiProof: { exists: true, valid: true, error: null },
  dbtProof: { exists: true, valid: true, error: null }
};

function withDoneActiveStatus(plan) {
  return plan.replace(/- Active status: `(?:IN_PROGRESS|DONE)`/, "- Active status: `DONE`");
}

function withUncheckedChecklistItem(value) {
  return value.replace(/^- \[x\] /m, "- [ ] ");
}

test("active plan satisfies dependency, gate, evidence-state, and handoff integrity", () => {
  assert.deepEqual(validatePlan(activePlan, activeContext), []);
});

test("plan integrity rejects a closed phase whose declared dependency remains open", () => {
  const invalidPlan = activePlan.replace(
    "| `P2` | Add a free/local AI copilot that is impossible to miss in the demo | `DONE` |",
    "| `P2` | Add a free/local AI copilot that is impossible to miss in the demo | `IN_PROGRESS` |"
  ).replace(
    "| `P4` | Prove grounded code generation and local working-code execution | `IN_PROGRESS` |",
    "| `P4` | Prove grounded code generation and local working-code execution | `DONE` |"
  );

  assert.match(validatePlan(invalidPlan, activeContext).join("\n"), /P4 cannot be DONE while declared dependency P2 is 'IN_PROGRESS'/);
});

test("plan integrity rejects a missing mandatory handoff field", () => {
  const invalidPlan = activePlan.replace("- Next Micro-Step:", "- Upcoming Micro-Step:");

  assert.match(validatePlan(invalidPlan, activeContext).join("\n"), /handoff is missing 'Next Micro-Step'/);
});

test("plan integrity rejects final DONE while checklist remains incomplete", () => {
  const invalidPlan = withDoneActiveStatus(activePlan);

  assert.match(
    validatePlan(invalidPlan, { ...activeContext, checklist: withUncheckedChecklistItem(checklist) }).join("\n"),
    /pre-submission checklist item/
  );
});

test("plan integrity rejects final DONE while the Devpost video URL is still a placeholder", () => {
  const invalidPlan = withDoneActiveStatus(activePlan);
  const allCheckedContext = {
    ...activeContext,
    checklist: checklist.replace(/^- \[ \] /gm, "- [x] "),
    devpost: devpost.replace(/^- Demo video: .+$/m, "- Demo video: ADD_PUBLIC_YOUTUBE_URL")
  };

  assert.match(validatePlan(invalidPlan, allCheckedContext).join("\n"), /ADD_PUBLIC_YOUTUBE_URL/);
});

test("plan integrity rejects final DONE when the Devpost draft still lacks a public demo video URL", () => {
  const invalidPlan = withDoneActiveStatus(activePlan);
  const allCheckedContext = {
    ...activeContext,
    checklist: checklist.replace(/^- \[ \] /gm, "- [x] "),
    devpost: devpost.replace(/^- Demo video: .+$/m, "- Demo video: not recorded yet")
  };

  assert.match(validatePlan(invalidPlan, allCheckedContext).join("\n"), /public demo video URL/);
});

test("plan integrity rejects PASS proof gates when the corresponding committed artifact is missing or invalid", () => {
  const invalidContext = {
    ...activeContext,
    aiProof: { exists: false, valid: false, error: "missing" },
    dbtProof: { exists: false, valid: false, error: "missing" }
  };
  const errors = validatePlan(activePlan, invalidContext).join("\n");

  assert.match(errors, new RegExp(DBT_PROOF_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(errors, new RegExp(AI_PROOF_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("plan integrity rejects a handoff that says there is no next step while submission is incomplete", () => {
  const invalidPlan = activePlan.replace(/- Next Micro-Step: .+/, "- Next Micro-Step: None required");

  assert.match(
    validatePlan(invalidPlan, { ...activeContext, checklist: withUncheckedChecklistItem(checklist) }).join("\n"),
    /no next step/
  );
});
