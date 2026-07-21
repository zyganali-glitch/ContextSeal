# AI Runtime Decision

Updated: 2026-07-21 UTC

This document locks the runtime choice for ContextSeal's shipped optional AI copilot path. The current repo already includes the bounded adapter, grounded input contract, visible AI panel, and inspectable AI input/output artifacts. What remains environment-dependent is a local-model-backed `PASS` explanation.

## Locked decision

- Runtime: local Ollama
- Default model: `qwen2.5:7b`
- Transport: local HTTP runtime exposed by Ollama
- Expected base URL: `http://127.0.0.1:11434`
- Enable flag: `CONTEXTSEAL_AI_ENABLED=true`
- Required fallback: if the runtime is missing, no model is present, or the call fails, ContextSeal must preserve the deterministic result and emit an explicit AI-unavailable state

## Why this runtime

- It satisfies the zero-paid constraint.
- It keeps prompts and grounded metadata local.
- It works with a simple local boundary that the Node server can call without adding paid infrastructure.
- It stays optional: the deterministic certification flow does not depend on it.

## Operator contract

To enable model-backed AI output:

1. Install Ollama locally.
2. Pull the default model with `ollama pull qwen2.5:7b`.
3. Probe availability with `npm run ai:probe`.
4. Set these environment variables in `.env`:

```dotenv
CONTEXTSEAL_AI_ENABLED=true
CONTEXTSEAL_AI_RUNTIME=ollama
CONTEXTSEAL_AI_MODEL=qwen2.5:7b
CONTEXTSEAL_AI_BASE_URL=http://127.0.0.1:11434
CONTEXTSEAL_AI_TIMEOUT_MS=12000
```

If any of those preconditions are missing, the product must stay usable without AI.

## Current machine status

- Probe on 2026-07-21: `Get-Command ollama` failed on the current machine.
- Therefore the checked-in demo path and artifact currently show a fallback AI state and must not block the demo, tests, or validation path.

## Non-negotiable fallback rules

- Deterministic risk, evidence, approval, and write-back logic remain authoritative.
- Missing runtime must never break `analyze`, `approve`, `write-back`, or `npm run validate`.
- AI output, when added, must be labeled as explanation or proposal rather than proof.
- If the runtime is unavailable, the UI and artifacts must say unavailable or not run; they must not synthesize substitute model text.

## Grounded contract and runtime boundary

ContextSeal requires a bounded grounding bundle and a hard output schema:

- Grounding input builder: `src/ai/contracts.js`
- Grounding input test: `tests/ai-contracts.test.js`
- Committed example input bundle: `examples/outputs/generated/ai/contextseal-ai-input.json`
- Committed example output artifacts: `examples/outputs/generated/ai/contextseal-ai-output.json`, `examples/outputs/generated/ai/contextseal-ai-output.md`
- Required output keys: `ownerAlert`, `migrationRationale`, `reviewerNoteDraft`, `nextStepGuidance`
- Required disclaimer: `Explanation only. Deterministic ContextSeal evidence remains authoritative.`

This keeps the next integration step narrow: the adapter may only consume the structured grounding bundle and may only return the validated output shape.