# AI Runtime Decision

Updated: 2026-08-01 UTC

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
CONTEXTSEAL_AI_TIMEOUT_MS=600000
```

5. Generate the artifact and verify the real local-model proof:

```powershell
npm run demo
npm run ai:proof
```

`npm run ai:proof` only passes when the generated artifact records `status: PASS`, the `ollama` runtime, a non-empty model identifier, and a schema-valid four-output response.

If any of those preconditions are missing, the product must stay usable without AI.

## Current machine status

- On 2026-08-01, approved regenerable caches, temporary files, stale installer copies, and user-approved VS Code workspace storage were cleared. Project files, Docker volumes, Docker VHDX files, Windows system files, and personal media were preserved.
- The official `Ollama.Ollama` 0.32.5 installation completed after its installer hash was verified. The runtime is installed at `C:\Users\MEHMET\AppData\Local\Programs\Ollama\ollama.exe`.
- `qwen2.5:7b` was pulled successfully and is listed by Ollama as a `4.7 GB` local model.
- The first GPU-backed inference failed because the installed CUDA toolchain is incompatible with the host driver. Ollama was restarted with `OLLAMA_LLM_LIBRARY=cpu`; a direct inference returned `CONTEXTSEAL_LOCAL_MODEL_OK`.
- Node's built-in `fetch` has a five-minute response-header limit that was shorter than a full CPU inference. The adapter now uses Node's native HTTP transport in production, while retaining injected `fetch` mocks in tests, so ContextSeal's configured timeout is authoritative.
- `npm run ai:probe` found Ollama 0.32.5 and the local model. `npm run demo` then generated a model-backed bounded artifact, `npm run ai:proof` passed, and the complete `npm run validate` pipeline passed with the local model enabled.
- CPU inference needs a longer deadline on this machine, so the local `.env` uses `CONTEXTSEAL_AI_TIMEOUT_MS=600000`. The deterministic flow remains independent of this optional explanatory layer.

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