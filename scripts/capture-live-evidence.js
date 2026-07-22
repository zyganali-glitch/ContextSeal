import path from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../src/env.js";
import { createDataHubMcpClient } from "../src/datahub/mcp-client.js";
import { collectLiveEvidence, extractEntities } from "../src/datahub/live-context.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadEnvFile(root);
if (process.env.DATAHUB_MCP_MUTATIONS_ENABLED === "true") {
  throw new Error("Disable DATAHUB_MCP_MUTATIONS_ENABLED before capturing final read-only evidence.");
}
const request = JSON.parse(await readFile(path.join(root, "examples", "retail-change-request.json"), "utf8"));
const client = createDataHubMcpClient();
let liveEvidence;
try { liveEvidence = await collectLiveEvidence(client, request); }
finally { await client.close(); }

const targetCall = liveEvidence.evidence.find((item) => item.tool === "get_entities");
const target = extractEntities(targetCall?.payload || {}, "final evidence target").find((item) => item?.urn === request.targetUrn);
const markers = new Map((target?.properties?.customProperties || []).map((item) => [item?.key, String(item?.value)]));
if (markers.get("contextseal_fixture") !== "true" || markers.get("evidence_boundary") !== "synthetic-local") {
  throw new Error("Refusing to export a repository proof artifact: target is not marked as the disposable synthetic-local ContextSeal fixture.");
}

const output = {
  status: "PASS",
  transport: process.env.DATAHUB_MCP_TRANSPORT || "stdio",
  contextsealMutationGateEnabled: false,
  ...liveEvidence,
  evidenceBoundary: "Disposable local DataHub with synthetic ContextSeal metadata; no production or customer data. Raw MCP responses are preserved and hash-bound."
};
const outputPath = path.join(root, "examples", "outputs", "live-datahub-read-evidence.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`PASS live DataHub evidence: ${output.evidence.length} MCP calls -> ${path.relative(root, outputPath)}`);
