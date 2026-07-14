function contentPayload(result) {
  if (!result) return null;
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) return result;
  try { return JSON.parse(text); } catch { return { text }; }
}

export async function collectLiveEvidence(client, request) {
  await client.initialize();
  const calls = [
    ["get_entities", { urns: [request.targetUrn] }],
    ["get_lineage", { urn: request.targetUrn, upstream: false, max_hops: 5, max_results: 100 }],
    ["get_dataset_queries", { urn: request.targetUrn }]
  ];
  const evidence = [];
  for (const [tool, args] of calls) {
    const result = await client.callTool(tool, args);
    evidence.push({ tool, arguments: args, payload: contentPayload(result) });
  }
  return {
    observedAt: new Date().toISOString(),
    targetUrn: request.targetUrn,
    evidence,
    evidenceBoundary: "Raw MCP evidence is preserved. Normalized impact requires an exported ContextSeal graph contract."
  };
}
