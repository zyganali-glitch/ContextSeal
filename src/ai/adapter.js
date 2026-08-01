import http from "node:http";
import https from "node:https";
import { AI_OUTPUT_DISCLAIMER, buildAiGroundingInput, validateAiOutput } from "./contracts.js";

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function boundedReason(value, fallback) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 400) : fallback;
}

function buildAiPrompt(bundle) {
  return [
    "You are ContextSeal's non-authoritative explanation layer.",
    AI_OUTPUT_DISCLAIMER,
    "Return only JSON matching the required schema.",
    "Never change the deterministic verdict, score, evidence states, or write-back authority.",
    "Do not claim warehouse execution unless grounded input explicitly says it passed.",
    "Do not claim live query usage unless grounded input explicitly says live proof exists.",
    "Do not endorse direct destructive schema changes when the staged migration is safer.",
    "Required JSON shape:",
    JSON.stringify({
      schemaVersion: bundle.schemaVersion,
      disclaimer: AI_OUTPUT_DISCLAIMER,
      ownerAlert: { title: "string", summary: "string", bullets: ["string", "string"] },
      migrationRationale: { summary: "string", safeguards: ["string", "string"] },
      reviewerNoteDraft: { subject: "string", body: "string" },
      nextStepGuidance: { immediateActions: ["string", "string"], afterApproval: ["string"] }
    }, null, 2),
    "Grounded ContextSeal input:",
    JSON.stringify(bundle, null, 2)
  ].join("\n\n");
}

export function readAiRuntimeConfig(env = process.env) {
  return {
    enabled: env.CONTEXTSEAL_AI_ENABLED === "true",
    runtime: env.CONTEXTSEAL_AI_RUNTIME || "ollama",
    model: env.CONTEXTSEAL_AI_MODEL || "qwen2.5:7b",
    baseUrl: trimTrailingSlash(env.CONTEXTSEAL_AI_BASE_URL || "http://127.0.0.1:11434"),
    timeoutMs: toPositiveInteger(env.CONTEXTSEAL_AI_TIMEOUT_MS, 12_000)
  };
}

function baseAiResult(config, status, reason, output = null) {
  return {
    status,
    runtime: config.runtime,
    model: config.model,
    disclaimer: AI_OUTPUT_DISCLAIMER,
    reason,
    output
  };
}

async function readErrorBody(response) {
  try {
    const text = await response.text();
    return boundedReason(text, `HTTP ${response.status}`);
  } catch {
    return `HTTP ${response.status}`;
  }
}

function normalizeModelPayload(payload) {
  if (typeof payload?.response === "string") return payload.response;
  if (typeof payload?.message?.content === "string") return payload.message.content;
  return null;
}

export function nativeOllamaFetch(url, options = {}) {
  const target = new URL(url);
  const transport = target.protocol === "https:" ? https : http;
  const body = String(options.body ?? "");

  return new Promise((resolve, reject) => {
    const request = transport.request(target, {
      method: options.method || "GET",
      headers: {
        ...options.headers,
        "content-length": Buffer.byteLength(body)
      }
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.once("error", reject);
      response.once("end", () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode || 0,
          text: async () => responseBody,
          json: async () => JSON.parse(responseBody)
        });
      });
    });

    const abort = () => {
      const error = new Error("Local AI request was aborted.");
      error.name = "AbortError";
      request.destroy(error);
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    request.once("error", reject);
    request.once("close", () => options.signal?.removeEventListener("abort", abort));
    request.end(body);
  });
}

export async function generateAiCompanion(run, { env = process.env, fetchImpl } = {}) {
  const config = readAiRuntimeConfig(env);
  const groundingInput = buildAiGroundingInput(run);

  if (!config.enabled) {
    return {
      groundingInput,
      ai: baseAiResult(config, "NOT_ENABLED", "AI runtime disabled by environment.")
    };
  }

  if (config.runtime !== "ollama") {
    return {
      groundingInput,
      ai: baseAiResult(config, "UNAVAILABLE", `Unsupported AI runtime: ${config.runtime}`)
    };
  }

  if (fetchImpl != null && typeof fetchImpl !== "function") {
    return {
      groundingInput,
      ai: baseAiResult(config, "UNAVAILABLE", "No fetch implementation is available for the local AI runtime.")
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const request = fetchImpl || nativeOllamaFetch;
    const response = await request(`${config.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        prompt: buildAiPrompt(groundingInput),
        stream: false,
        format: "json",
        options: { temperature: 0.2, num_predict: 800 }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        groundingInput,
        ai: baseAiResult(config, "FAIL", `Local AI runtime returned an error: ${await readErrorBody(response)}`)
      };
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return {
        groundingInput,
        ai: baseAiResult(config, "FAIL", "Local AI runtime returned non-JSON output.")
      };
    }

    const content = normalizeModelPayload(payload);
    if (!content) {
      return {
        groundingInput,
        ai: baseAiResult(config, "FAIL", "Local AI runtime response did not contain a model output payload.")
      };
    }

    try {
      const output = validateAiOutput(content);
      return {
        groundingInput,
        ai: baseAiResult(config, "PASS", null, output)
      };
    } catch (error) {
      return {
        groundingInput,
        ai: baseAiResult(config, "FAIL", boundedReason(error.message, "Model output failed schema validation."))
      };
    }
  } catch (error) {
    const reason = error?.name === "AbortError"
      ? `Local AI runtime timed out after ${config.timeoutMs} ms.`
      : `Local AI runtime unavailable: ${boundedReason(error.message, "request failed")}`;
    return {
      groundingInput,
      ai: baseAiResult(config, "UNAVAILABLE", reason)
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function enrichRunWithAi(run, options) {
  const { groundingInput, ai } = await generateAiCompanion(run, options);
  return {
    ...run,
    aiGroundingInput: groundingInput,
    ai
  };
}