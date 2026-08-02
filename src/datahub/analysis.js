import { enrichRunWithAi } from "../ai/adapter.js";
import { validateChangeRequest } from "../core/contracts.js";
import { analyzeChange } from "../core/workflow.js";
import { createDataHubMcpClient } from "./mcp-client.js";
import { attachLiveEvidence, collectLiveEvidence } from "./live-context.js";

export async function analyzeWithLiveContext({
  request,
  context,
  policy,
  mode = "fixture",
  now,
  createClient = createDataHubMcpClient,
  analyze = analyzeChange,
  enrichRun = enrichRunWithAi
}) {
  const validatedRequest = validateChangeRequest(request);
  let liveEvidence = null;
  let analysisContext = context;

  if (mode === "datahub") {
    const client = createClient();
    try {
      const collected = await collectLiveEvidence(client, validatedRequest);
      analysisContext = collected.normalizedContext;
      liveEvidence = {
        ...collected,
        normalizedContext: undefined
      };
    } finally {
      await client.close();
    }
  }

  const deterministicRun = analyze({
    request: validatedRequest,
    context: analysisContext,
    policy,
    mode,
    now,
    liveEvidence
  });
  const run = liveEvidence
    ? attachLiveEvidence(deterministicRun, liveEvidence, "PRE_ANALYSIS")
    : deterministicRun;
  return enrichRun(run);
}