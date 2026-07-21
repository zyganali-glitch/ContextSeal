# Competition Requirement Matrix

Updated: 2026-07-21 UTC

Selected primary track: `Metadata-Aware Code Generation & Development`

Supporting fit: `Agents That Do Real Work`

This matrix is the repo-level check that the chosen challenge wording stays attached to real product surfaces.

| Requirement | Current repo proof | Status at phase start | Gap that still matters | Planned closure |
| --- | --- | --- | --- | --- |
| Working application that uses DataHub | `npm run validate`, local web app, DataHub MCP client, committed live-local read/write artifacts | `PARTIAL` | The product worked, but live/fixture boundaries were too easy to misread | `W-04`, `W-11`, `W-18B` |
| Read DataHub before generating or deciding | DataHub MCP read tools are implemented, the live-local read artifact is committed, and the AI input bundle explicitly captures grounded read-side facts | `PARTIAL` | The default judge flow still needs broader pitch-surface surfacing and a final parity pass across all submission docs | `W-04`, `W-06`, `W-06B`, `W-18B` |
| Generate data code from schemas, lineage, and rules | Deterministic generator emits dbt model, tests, rollback, and owner brief; run records name the grounding inputs; the generated artifact manifest ties each file hash back to the passport context and grounding refs; and a committed sandbox evidence artifact proves the bundle passes deterministic local conformance checks | `SHIPPED` | PR-ready reviewer handoff is still missing from the primary-track story | `W-15`, `W-15A`, `W-15C` |
| Show committed generated artifacts in the repo | Generated outputs now include a committed artifact manifest under `examples/outputs/generated/ARTIFACT_MANIFEST.json` and sandbox evidence under `examples/outputs/sandbox/generated-sandbox-evidence.json` | `SHIPPED` | The remaining gap is reviewer-ready PR packaging, not missing generated proof | `W-15A`, `W-15C` |
| Attach the generated result to a PR and make it reviewer-ready | A committed PR review packet contract now locks the title, body, checklist, payload, evidence links, and token boundary for reviewer handoff | `PARTIAL` | The generator and optional draft PR creation path are still not shipped | `W-15A`, `W-15B`, `W-15C` |
| Give judges confidence the output works the first time | Unit tests, demo generation, write-back gates, a deterministic local sandbox harness, and a committed sandbox evidence artifact now exist | `PARTIAL` | The proof now exists in-repo, but the final demo and submission story still need to foreground it more aggressively | `W-17`, `W-18A` |
| Use DataHub MCP or Skills explicitly | MCP client, live evidence scripts, and reusable skill are already in the repo | `PARTIAL` | The submission surfaces need tighter challenge-language alignment and more explicit surfacing | `W-04A`, `W-11`, `W-18A`, `W-18B` |
| Present an unmistakably agentic workflow | Visible Local AI Copilot panel, bounded adapter, committed AI input/output artifacts, and adapter tests now exist | `MISSING` | A local-model-backed `PASS` artifact is still missing on this machine, and the remaining pitch surfaces still need to lead with the AI story honestly | `W-17`, `W-18A` |

## Current decision

The primary category remains valid. Sandbox-backed generated-code proof and the PR packet contract are now shipped in-repo; the remaining core gaps are the PR bundle generator, optional draft PR creation, submission-surface storytelling, and a local-model-backed AI `PASS` capture on a machine with Ollama.