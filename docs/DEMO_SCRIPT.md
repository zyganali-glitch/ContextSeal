# Demo narration — 2:55 target

Record the real product. Keep the runtime badge visible. Use the local fixture for the uninterrupted interaction, then show the disposable local DataHub proof only in the final evidence cut.

## 0:00–0:15 — Problem hook

**Screen:** ContextSeal hero, then the `customer_email → contact_email` request.

**Narration:**

> An AI coding agent can produce valid SQL and still break a dashboard four hops away. The repository sees code. DataHub sees the organizational blast radius.

## 0:15–0:35 — What ContextSeal is

**Screen:** Agent loop card: Read, Decide, Generate, Certify, Write back.

**Narration:**

> ContextSeal is not a chatbot. It is a bounded change-certification agent. It reads DataHub context, makes a deterministic safety decision, generates a reversible migration, pauses for scoped human approval, and writes an expiring change passport back to the graph.

## 0:35–1:20 — Analyze the risky rename

**Screen:** Keep **LOCAL FIXTURE · CONNECTED** visible. Select **Run local certification**. Move through request, risk, and graph without scrolling too fast.

**Narration:**

> For a reproducible judge run, this badge says fixture: the application is executing for real, but the metadata is synthetic. A team asks to rename customer email directly. ContextSeal validates the request, traces five downstream fixture assets, and preserves every path. The deepest path is four hops. Two synthetic query examples reference the field, and the target carries privacy and Tier-One signals. The requested destructive change scores eighty and is blocked.

## 1:20–1:50 — Explain the decision

**Screen:** Show the branching paths, owners, and `BREAKING_LINEAGE`, `SENSITIVE_DATA`, and `LIVE_QUERY_USAGE` fixture findings.

**Narration:**

> This is not model confidence. Each point comes from a named, versioned rule. The graph shows who owns every affected asset and how the change reaches it. If lineage or query evidence is truncated or cannot be inspected, live certification fails closed instead of quietly undercounting risk.

## 1:50–2:15 — Show real work

**Screen:** Preview the generated SQL, YAML tests, rollback, and owner brief.

**Narration:**

> ContextSeal refuses to generate the direct rename. It creates an expand–migrate–contract dbt model that keeps the source field, tests the new field, produces a separately named rollback, and briefs impacted owners. These are reviewable artifacts, not executed warehouse SQL.

## 2:15–2:35 — Human gate and passport

**Screen:** Show reviewer and note. Select **Approve safe plan**. Show passport ID, manifest hash, context hash, and validity.

**Narration:**

> The reviewer approves only this safe manifest, not the original destructive request. The passport binds the request, policy, raw and normalized evidence, impact, risk, every artifact, the exact approval, and its expiry. Change any bound input and write-back is rejected.

## 2:35–2:50 — Honest write-back boundary

**Screen:** Select **Prepare protected operations**. Hold on all three fixture operations as `NOT_RUN`, then cut to one pre-arranged proof view containing the synthetic-local DataHub target and returned decision document. Overlay: **10 MCP reads · 6 exact paths · 0 queries · 3 PASS mutations · read-back PASS**.

**Narration:**

> In fixture mode, all three payloads remain not run. Our separate synthetic-local DataHub proof records three successful mutation receipts and a passing durable read-back.

## 2:50–2:58 — Close

**Screen:** Return to the passport and evidence ledger. End on repository URL.

**Narration:**

> ContextSeal turns DataHub context into safe action and durable evidence. Every change ships with proof, not confidence.

## Accuracy rules

- Never crop out the hosted, fixture, or live badge.
- Say **five downstream fixture assets**, not “five-hop path.”
- Do not call fixture queries observed production queries.
- Keep the ML surfaces distinct: the fixture contains a synthetic `ML_MODEL` node; the live-local proof represents MLflow scoring metadata as a `DataJob`. Neither proves that inference ran.
- A prepared operation is `NOT_RUN`.
- A mutation `PASS` is not durable verification unless read-back is also `PASS`.
- Say “disposable local DataHub with synthetic metadata,” never production or customer DataHub.
- Do not show `.env`, terminal secrets, operator token, browser profile, notifications, or personal tabs.

## 90-second backup narration

Use the same screen order with faster cuts:

> A repository can validate SQL, but it cannot see the dashboard, pipeline, or model-scoring job a field will break. DataHub can. ContextSeal is a bounded certification agent, not a chatbot.
>
> This is the real application running against a clearly labeled synthetic fixture. We request a direct customer-email rename. ContextSeal reconstructs five downstream paths, finds privacy, criticality, and two synthetic query signals, and deterministically blocks the request at eighty.
>
> It does real work next: a non-destructive dbt expansion model, schema tests, a separate rollback, and an owner brief. A human approves only that safe manifest. ContextSeal creates an expiring passport bound to the request, policy, evidence, impact, risk, artifacts, and exact decision.
>
> Fixture write-back stays not run. In a separate disposable local DataHub proof, the approved three-operation write-back completed and structured metadata plus exact decision-document bindings were read back. No production data or warehouse SQL is claimed.
>
> ContextSeal turns DataHub's graph into a safe action the next human or agent can inherit. Every data change ships with proof, not confidence.
