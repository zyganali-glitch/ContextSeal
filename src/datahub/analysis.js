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

  if (mode === "datahub") {
    const client = createClient();
    try {
      liveEvidence = await collectLiveEvidence(client, validatedRequest);
    } finally {
      await client.close();
    }
  }

  const deterministicRun = analyze({ request: validatedRequest, context, policy, mode, now });
  const run = liveEvidence
    ? attachLiveEvidence(deterministicRun, liveEvidence, "PRE_ANALYSIS")
    : deterministicRun;
  return enrichRun(run);
}