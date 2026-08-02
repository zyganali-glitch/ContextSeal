import { AI_OUTPUT_DISCLAIMER, validateAiOutput } from "./contracts.js";

export const AI_PROOF_VERSION = "1.0";
export const AI_PROOF_MODEL = "qwen2.5:7b";
export const AI_PROOF_PATH = "examples/outputs/proofs/ollama-ai-proof.json";
export const RECORDED_LOCAL_OLLAMA_PROOF_LABEL = "RECORDED LOCAL OLLAMA PROOF";
export const RECORDED_LOCAL_OLLAMA_PROOF_NOTE = "Not live inference on GitHub Pages.";

function fail(message) {
  throw new Error(message);
}

function plainObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${field} must be an object.`);
  return value;
}

function requiredString(value, field, max = 4000) {
  const text = String(value ?? "").trim();
  if (!text) fail(`${field} must be a non-empty string.`);
  if (text.length > max) fail(`${field} exceeds ${max} characters.`);
  return text;
}

function requiredSha256(value, field) {
  const text = requiredString(value, field, 64);
  if (!/^[0-9a-f]{64}$/i.test(text)) fail(`${field} must be a 64-character SHA-256 hex digest.`);
  return text.toLowerCase();
}

function requiredStringArray(value, field, { min = 1, maxItems = 20, maxLength = 256 } = {}) {
  if (!Array.isArray(value)) fail(`${field} must be an array.`);
  if (value.length < min) fail(`${field} must contain at least ${min} item(s).`);
  if (value.length > maxItems) fail(`${field} must contain at most ${maxItems} item(s).`);
  return value.map((item, index) => requiredString(item, `${field}[${index}]`, maxLength));
}

function requiredIsoTimestamp(value, field) {
  const text = requiredString(value, field, 64);
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) fail(`${field} must be an ISO-8601 timestamp.`);
  return new Date(parsed).toISOString();
}

export function validateAiProof(value) {
  const source = plainObject(value, "aiProof");
  if (requiredString(source.proofVersion, "aiProof.proofVersion", 16) !== AI_PROOF_VERSION) {
    fail(`aiProof.proofVersion must equal ${AI_PROOF_VERSION}.`);
  }
  if (requiredString(source.status, "aiProof.status", 16) !== "PASS") {
    fail(`Local AI proof requires status PASS; found '${source.status ?? "missing"}'.`);
  }
  if (requiredString(source.runtime, "aiProof.runtime", 32) !== "ollama") {
    fail(`Local AI proof requires runtime ollama; found '${source.runtime ?? "missing"}'.`);
  }
  if (requiredString(source.model, "aiProof.model", 64) !== AI_PROOF_MODEL) {
    fail(`Local AI proof requires model ${AI_PROOF_MODEL}; found '${source.model ?? "missing"}'.`);
  }
  if (requiredString(source.disclaimer, "aiProof.disclaimer", 120) !== AI_OUTPUT_DISCLAIMER) {
    fail("Local AI proof disclaimer must match the deterministic-authority disclaimer.");
  }

  const runtimeProvenance = plainObject(source.runtimeProvenance, "aiProof.runtimeProvenance");
  const boundary = plainObject(source.boundary, "aiProof.boundary");
  const output = validateAiOutput(source.output);

  if (requiredString(boundary.label, "aiProof.boundary.label", 120) !== RECORDED_LOCAL_OLLAMA_PROOF_LABEL) {
    fail(`aiProof.boundary.label must equal ${RECORDED_LOCAL_OLLAMA_PROOF_LABEL}.`);
  }
  if (requiredString(boundary.hostedDemo, "aiProof.boundary.hostedDemo", 200) !== RECORDED_LOCAL_OLLAMA_PROOF_NOTE) {
    fail(`aiProof.boundary.hostedDemo must equal ${RECORDED_LOCAL_OLLAMA_PROOF_NOTE}.`);
  }
  if (requiredString(boundary.authority, "aiProof.boundary.authority", 120) !== AI_OUTPUT_DISCLAIMER) {
    fail("aiProof.boundary.authority must preserve deterministic evidence authority.");
  }

  return {
    proofVersion: AI_PROOF_VERSION,
    status: "PASS",
    runtime: "ollama",
    model: AI_PROOF_MODEL,
    disclaimer: AI_OUTPUT_DISCLAIMER,
    deterministicRunId: requiredString(source.deterministicRunId, "aiProof.deterministicRunId", 64),
    groundingInputSha256: requiredSha256(source.groundingInputSha256, "aiProof.groundingInputSha256"),
    capturedAt: requiredIsoTimestamp(source.capturedAt, "aiProof.capturedAt"),
    captureCommand: requiredString(source.captureCommand, "aiProof.captureCommand", 120),
    runtimeProvenance: {
      launcher: requiredString(runtimeProvenance.launcher, "aiProof.runtimeProvenance.launcher", 32),
      transport: requiredString(runtimeProvenance.transport, "aiProof.runtimeProvenance.transport", 64),
      ollamaVersion: requiredString(runtimeProvenance.ollamaVersion, "aiProof.runtimeProvenance.ollamaVersion", 200),
      availableModels: requiredStringArray(runtimeProvenance.availableModels, "aiProof.runtimeProvenance.availableModels", { min: 1, maxItems: 20, maxLength: 128 })
    },
    boundary: {
      label: RECORDED_LOCAL_OLLAMA_PROOF_LABEL,
      hostedDemo: RECORDED_LOCAL_OLLAMA_PROOF_NOTE,
      authority: AI_OUTPUT_DISCLAIMER
    },
    output
  };
}