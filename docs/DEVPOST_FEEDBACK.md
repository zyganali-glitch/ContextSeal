# Copy-ready DataHub feedback

Use this only in the optional **Most Valuable Feedback** field. It is based on the actual ContextSeal build; no experience is invented.

## Suggested title

Make MCP completeness and mutation readiness explicit

## Suggested response

DataHub MCP made ContextSeal possible because the agent could use schema, lineage, ownership, governance, query, and document context as decision evidence instead of prompt decoration. The most valuable improvement would be a first-class “evidence completeness” contract across tools.

During implementation, `get_entities` was useful for entity metadata but its schema preview could not prove field absence. We therefore treated continuous, count-checked `list_schema_fields` pages as authoritative. Likewise, an empty query array is only a defensible zero when the response proves the request succeeded, reports inspected/returned counts, and exposes any next cursor. Lineage discovery also became safer only after we requested one exact path for every discovered target. Consistent `complete`, `total`, `returned`, and `nextPage` fields across schema, query, and lineage responses would let agents fail closed without tool-specific inference.

Mutation development would also benefit from a read-only readiness response listing every closed gate: authentication mode, mutation enablement, exact target allowlist, required structured-property definitions, supported mutation tool schemas, and recommended idempotency/read-back behavior. A dry-run contract would make it easier to distinguish “payload prepared” from “mutation executed” and “durable result verified.”

Two documentation details would remove additional setup friction. First, local DataHub Core can run with token authentication disabled, so the UI may correctly prevent token creation and a blank GMS token may be appropriate; that path should be documented explicitly. Second, the MCP launcher package version, protocol version, and handshake `serverInfo` version are different facts and should be labeled separately in troubleshooting output.

What worked especially well was the combination of bounded lineage discovery, exact path retrieval, schema pagination, structured-property writes, saved decision documents, and read-back. Those surfaces let us build a real read–decide–act–verify agent while keeping source rows and production data out of scope.

## Optional shorter version

DataHub MCP was strongest when metadata changed the action: schema pagination, bounded lineage, exact paths, structured-property writes, saved decision documents, and read-back enabled a real read–decide–act–verify loop. The biggest improvement would be a uniform completeness contract (`complete`, `total`, `returned`, `nextPage`) across schema, query, and lineage tools so agents can prove field absence, inspected zero, and path coverage without tool-specific inference. A read-only mutation-readiness response should also list authentication mode, runtime mutation state, exact allowlist, required property definitions, supported tool schemas, and idempotency/read-back guidance. Finally, document the auth-disabled local Core path and label launcher, protocol, and handshake server versions separately. These changes would make fail-closed agent integrations much easier to build and audit.
