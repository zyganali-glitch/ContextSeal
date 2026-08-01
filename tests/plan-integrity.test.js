import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validatePlan } from "../scripts/check-plan-integrity.js";

const activePlan = await readFile("plans/PLAN_20260721_contextseal_hackathon_win.md", "utf8");

test("active plan satisfies dependency, gate, evidence-state, and handoff integrity", () => {
  assert.deepEqual(validatePlan(activePlan), []);
});

test("plan integrity rejects a closed phase whose declared dependency remains open", () => {
  const invalidPlan = activePlan.replace(
    "| `P2` | Add a free/local AI copilot that is impossible to miss in the demo | `DONE` |",
    "| `P2` | Add a free/local AI copilot that is impossible to miss in the demo | `IN_PROGRESS` |"
  ).replace(
    "| `P4` | Prove grounded code generation and local working-code execution | `IN_PROGRESS` |",
    "| `P4` | Prove grounded code generation and local working-code execution | `DONE` |"
  );

  assert.match(validatePlan(invalidPlan).join("\n"), /P4 cannot be DONE while declared dependency P2 is 'IN_PROGRESS'/);
});

test("plan integrity rejects a missing mandatory handoff field", () => {
  const invalidPlan = activePlan.replace("- Next Micro-Step:", "- Upcoming Micro-Step:");

  assert.match(validatePlan(invalidPlan).join("\n"), /handoff is missing 'Next Micro-Step'/);
});