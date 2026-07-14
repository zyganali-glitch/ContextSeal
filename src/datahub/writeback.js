export class WritebackError extends Error {
  constructor(message, results) {
    super(message);
    this.name = "WritebackError";
    this.results = results;
  }
}

export function buildWritebackOperations(run, policy) {
  if (run.state !== "APPROVED_FOR_WRITEBACK" || run.passport.status !== "CERTIFIED") {
    throw new Error("Only an approved certified run can produce DataHub write-back operations.");
  }
  const values = {
    "urn:li:structuredProperty:io.contextseal.status": ["CERTIFIED"],
    "urn:li:structuredProperty:io.contextseal.riskScore": [run.risk.score],
    "urn:li:structuredProperty:io.contextseal.passportId": [run.passport.passportId],
    "urn:li:structuredProperty:io.contextseal.validUntil": [run.passport.validUntil.slice(0, 10)]
  };
  return [
    {
      tool: "add_structured_properties",
      arguments: { entity_urns: [run.request.targetUrn], property_values: values }
    },
    {
      tool: "update_description",
      arguments: {
        entity_urn: run.request.targetUrn,
        operation: "append",
        description: `\n\n---\nContextSeal passport **${run.passport.passportId}**: ${run.artifacts.summary}`
      }
    },
    {
      tool: "save_document",
      arguments: {
        title: `Change Passport ${run.passport.passportId}`,
        document_type: "Decision",
        content: JSON.stringify(run.passport, null, 2),
        topics: ["contextseal", "schema-change", "certified-migration"],
        related_assets: [run.request.targetUrn]
      }
    }
  ];
}

export async function executeWriteback(client, operations) {
  const results = [];
  for (const operation of operations) {
    try {
      const result = await client.callTool(operation.tool, operation.arguments);
      results.push({ tool: operation.tool, status: "PASS", result });
    } catch (error) {
      results.push({ tool: operation.tool, status: "FAIL", error: error.message });
      throw new WritebackError(`DataHub write-back stopped at ${operation.tool}.`, results);
    }
  }
  return results;
}
