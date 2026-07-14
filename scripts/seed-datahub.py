"""Seed a disposable DataHub Core instance with ContextSeal-owned synthetic metadata.

The graph uses native DataHub entity types where the public SDK supports the
lineage pair: Dataset -> DataJob -> Dataset -> Dashboard, with a second
Dataset -> DataJob -> Dataset -> Dashboard branch. No source rows are emitted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import warnings

warnings.simplefilter("ignore")

from datahub.sdk import Dashboard, DataFlow, DataHubClient, DataJob, Dataset
from datahub.errors import ItemNotFoundError

from datahub_mutation_safety import (
    SafetyError,
    build_certification_plan_hash,
    classify_entity_ownership,
    combine_disjoint_exact_scopes,
    hash_apply_contract,
    parse_gms_endpoint,
    validate_apply_gate,
    validate_read_only_preflight,
)


ROOT = Path(__file__).resolve().parents[1]
BOUNDARY = {
    "contextseal_fixture": "true",
    "evidence_boundary": "synthetic-local",
}
SEED_CONFIRMATION = "SEED_CONTEXTSEAL_SYNTHETIC_METADATA_V1"

# These are legacy ContextSeal-owned synthetic entities from the first seed
# format, where every platform was represented as a Dataset. Removing only
# these exact URNs keeps repeated local seeding deterministic without touching
# any unrelated catalog entity.
LEGACY_URNS = [
    "urn:li:dataset:(urn:li:dataPlatform:airflow,customer_360.build_segments,PROD)",
    "urn:li:dataset:(urn:li:dataPlatform:looker,executive_customer_health,PROD)",
    "urn:li:dataset:(urn:li:dataPlatform:mlflow,churn_prediction,PROD)",
    "urn:li:dataset:(urn:li:dataPlatform:powerbi,retention_campaign,PROD)",
]


def load_local_env() -> None:
    """Load only GMS connection/runtime-gate values, never confirmations."""

    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key in {
            "DATAHUB_GMS_URL",
            "DATAHUB_GMS_TOKEN",
            "DATAHUB_MCP_MUTATIONS_ENABLED",
        } and key not in os.environ:
            os.environ[key] = value


def owner(name: str) -> str:
    return f"urn:li:corpuser:{name}"


def remove_owned_legacy_entity(client: DataHubClient, urn: str) -> None:
    """Delete an old seed entity only after its two ownership markers match."""

    try:
        entity = client.entities.get(urn)
    except ItemNotFoundError:
        return
    try:
        classify_entity_ownership(
            entity_exists=True,
            properties=entity.custom_properties,
            markers=BOUNDARY,
        )
    except SafetyError:
        raise SafetyError(
            f"Refusing to delete unowned legacy entity {urn}; ContextSeal synthetic markers do not match."
        ) from None
    client.entities.delete(urn, check_exists=True, hard=True)


def build_seed_entities() -> tuple[list[object], list[object], dict[str, object]]:
    """Build the fixed synthetic scope without connecting to DataHub."""

    customers = Dataset(
        platform="snowflake",
        name="retail.gold.customers",
        env="PROD",
        display_name="gold_customers",
        description="Tier-1 customer contact dataset for the ContextSeal synthetic-local proof.",
        schema=[
            ("customer_id", "varchar", "Stable synthetic customer identifier"),
            ("customer_email", "varchar", "Synthetic personal-email field"),
            ("updated_at", "timestamp", "Synthetic source update time"),
        ],
        owners=[owner("customer-data")],
        tags=["urn:li:tag:PII", "urn:li:tag:Tier1"],
        custom_properties=BOUNDARY,
    )
    segments = Dataset(
        platform="snowflake",
        name="retail.analytics.customer_segments",
        env="PROD",
        display_name="customer_segments",
        description="Synthetic customer segments produced by the ContextSeal Airflow job.",
        schema=[("customer_id", "varchar"), ("segment", "varchar")],
        owners=[owner("growth-data")],
        tags=["urn:li:tag:Tier1"],
        custom_properties=BOUNDARY,
    )
    churn_scores = Dataset(
        platform="snowflake",
        name="retail.ml.churn_scores",
        env="PROD",
        display_name="churn_scores",
        description="Synthetic model-scoring output used by the retention dashboard.",
        schema=[("customer_id", "varchar"), ("churn_probability", "double")],
        owners=[owner("ml-platform")],
        tags=["urn:li:tag:Tier1", "urn:li:tag:Synthetic"],
        custom_properties=BOUNDARY,
    )

    customer_flow = DataFlow(
        platform="airflow",
        name="contextseal_customer_360",
        env="PROD",
        display_name="ContextSeal customer 360",
        description="Synthetic-local Airflow flow used only for ContextSeal evidence.",
        owners=[owner("growth-data")],
        tags=["urn:li:tag:Synthetic"],
        custom_properties=BOUNDARY,
    )
    build_segments = DataJob(
        name="build_segments",
        flow=customer_flow,
        display_name="build_segments",
        description="Builds the synthetic customer-segments dataset.",
        inlets=[str(customers.urn)],
        outlets=[str(segments.urn)],
        owners=[owner("growth-data")],
        tags=["urn:li:tag:Tier1", "urn:li:tag:Synthetic"],
        custom_properties=BOUNDARY,
    )

    scoring_flow = DataFlow(
        platform="mlflow",
        name="contextseal_churn_scoring",
        env="PROD",
        display_name="ContextSeal churn scoring",
        description="Synthetic-local model-scoring flow; no model inference is executed.",
        owners=[owner("ml-platform")],
        tags=["urn:li:tag:Synthetic"],
        custom_properties=BOUNDARY,
    )
    score_churn = DataJob(
        name="score_churn",
        flow=scoring_flow,
        display_name="score_churn",
        description="Represents synthetic churn scoring metadata; it does not execute a model.",
        inlets=[str(segments.urn)],
        outlets=[str(churn_scores.urn)],
        owners=[owner("ml-platform")],
        tags=["urn:li:tag:Tier1", "urn:li:tag:Synthetic"],
        custom_properties=BOUNDARY,
    )

    customer_health = Dashboard(
        platform="looker",
        name="executive_customer_health",
        display_name="Executive Customer Health",
        description="Synthetic-local Looker dashboard metadata.",
        input_datasets=[str(segments.urn)],
        owners=[owner("customer-success")],
        tags=["urn:li:tag:Synthetic"],
        custom_properties=BOUNDARY,
    )
    retention_campaign = Dashboard(
        platform="powerbi",
        name="retention_campaign",
        display_name="Retention Campaign",
        description="Synthetic-local Power BI dashboard metadata.",
        input_datasets=[str(churn_scores.urn)],
        owners=[owner("marketing-analytics")],
        tags=["urn:li:tag:Synthetic"],
        custom_properties=BOUNDARY,
    )

    endpoints = [customers, segments, churn_scores, customer_flow, scoring_flow]
    relationships = [build_segments, score_churn, customer_health, retention_campaign]
    lineage_entities = [
        customers,
        build_segments,
        segments,
        customer_health,
        score_churn,
        churn_scores,
        retention_campaign,
    ]
    summary = {
        "status": "PASS",
        "evidenceBoundary": "Disposable local DataHub with synthetic ContextSeal metadata; no source rows, production data, or customer data.",
        "nativeEntityTypes": ["Dataset", "DataJob", "Dashboard"],
        "lineageAssetCount": len(lineage_entities),
        "expectedDownstreamCount": len(lineage_entities) - 1,
        "targetUrn": str(customers.urn),
        "urns": {
            "customers": str(customers.urn),
            "build_segments": str(build_segments.urn),
            "segments": str(segments.urn),
            "customer_health": str(customer_health.urn),
            "score_churn": str(score_churn.urn),
            "churn_scores": str(churn_scores.urn),
            "retention_campaign": str(retention_campaign.urn),
        },
    }
    return endpoints, relationships, summary


def expected_mutation_urns(entities: list[object]) -> list[str]:
    """Return the exact compiled upsert/delete scope, with no wildcards."""

    upsert_urns = [str(entity.urn) for entity in entities]
    return combine_disjoint_exact_scopes(upsert_urns, LEGACY_URNS)


def inspect_entity_ownership(client: DataHubClient, urn: str) -> str:
    """Classify an exact URN as absent or ContextSeal-owned; refuse conflicts."""

    try:
        entity = client.entities.get(urn)
    except ItemNotFoundError:
        return classify_entity_ownership(entity_exists=False, properties=None, markers=BOUNDARY)
    try:
        return classify_entity_ownership(
            entity_exists=True,
            properties=entity.custom_properties,
            markers=BOUNDARY,
        )
    except SafetyError:
        raise SafetyError(
            f"Refusing to overwrite existing entity {urn}; exact ContextSeal synthetic markers are absent."
        ) from None


def preflight_ownership(
    client: DataHubClient,
    entities: list[object],
) -> dict[str, int]:
    """Inspect the complete scope before the first mutation is attempted."""

    observations = {"absent": 0, "owned": 0}
    for urn in expected_mutation_urns(entities):
        state = inspect_entity_ownership(client, urn)
        observations[state.lower()] += 1
    return observations


def verify_applied_ownership(client: DataHubClient, entities: list[object]) -> dict[str, int]:
    """Read back current markers and prove every cleanup URN is absent."""

    for entity in entities:
        if inspect_entity_ownership(client, str(entity.urn)) != "OWNED":
            raise SafetyError("Seed ownership read-back did not find every current entity.")
    for legacy_urn in LEGACY_URNS:
        if inspect_entity_ownership(client, legacy_urn) != "ABSENT":
            raise SafetyError(
                f"Seed cleanup read-back still found the owned legacy entity {legacy_urn}."
            )
    return {"ownedCurrent": len(entities), "absentCleanup": len(LEGACY_URNS)}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Preflight or apply the fixed ContextSeal synthetic DataHub seed."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--preflight", action="store_true", help="Read-only ownership inspection (default).")
    mode.add_argument("--apply", action="store_true", help="Apply only after every exact gate passes.")
    mode.add_argument("--print-scope", action="store_true", help="Print the compiled synthetic URN scope only.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    endpoints, relationships, summary = build_seed_entities()
    entities = endpoints + relationships
    scope = expected_mutation_urns(entities)

    if args.print_scope:
        print(json.dumps(scope, indent=2))
        return

    load_local_env()
    endpoint = parse_gms_endpoint(os.environ.get("DATAHUB_GMS_URL", ""))
    contract_sha256 = hash_apply_contract({
        "seed-datahub.py": Path(__file__).read_bytes(),
        "datahub_mutation_safety.py": (Path(__file__).parent / "datahub_mutation_safety.py").read_bytes(),
    })
    plan_sha256 = build_certification_plan_hash(
        operation="contextseal-synthetic-seed-v1",
        endpoint=endpoint,
        expected_urns=scope,
        contract_sha256=contract_sha256,
    )
    if args.apply:
        endpoint = validate_apply_gate(
            os.environ,
            operation_confirmation_variable="CONTEXTSEAL_SEED_CONFIRMATION",
            operation_confirmation=SEED_CONFIRMATION,
            expected_urns=scope,
            remote_scope_variable="CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
            certification_plan_sha256=plan_sha256,
        )
    else:
        validate_read_only_preflight(os.environ)

    client = DataHubClient.from_env()
    ownership = preflight_ownership(client, entities)

    if not args.apply:
        print(json.dumps({
            "status": "PASS",
            "mutationState": "NOT_RUN",
            "endpointBoundary": "loopback" if endpoint.is_loopback else "remote-read-only",
            "endpointSha256": hashlib.sha256(endpoint.canonical_url.encode("utf-8")).hexdigest(),
            "scopeUrnCount": len(scope),
            "certificationState": "PASS",
            "approvalState": "NOT_RUN",
            "certificationPlanSha256": plan_sha256,
            "ownership": ownership,
            "nextStep": "Use --apply only with the documented exact, shell-scoped confirmations.",
        }, indent=2))
        return

    # Recheck each exact URN immediately before mutation. This protects the
    # bootstrap absent/existing distinction against drift after preflight.
    for entity in endpoints:
        inspect_entity_ownership(client, str(entity.urn))
        client.entities.upsert(entity)
    for entity in relationships:
        inspect_entity_ownership(client, str(entity.urn))
        client.entities.upsert(entity)
    for legacy_urn in LEGACY_URNS:
        remove_owned_legacy_entity(client, legacy_urn)
    ownership_readback = verify_applied_ownership(client, entities)

    summary.update({
        "mutationState": "PASS",
        "endpointBoundary": "loopback" if endpoint.is_loopback else "remote-exact-allowlisted",
        "scopeUrnCount": len(scope),
        "certificationState": "PASS",
        "approvalState": "PASS",
        "certificationPlanSha256": plan_sha256,
        "ownershipPreflight": ownership,
        "ownershipReadbackState": "PASS",
        "ownershipReadback": ownership_readback,
    })
    print(json.dumps(summary, indent=2))


def run_cli() -> None:
    try:
        main()
    except SafetyError as error:
        print(json.dumps({"status": "FAIL", "error": str(error)}, indent=2), file=sys.stderr)
        raise SystemExit(2) from None
    except Exception as error:
        # Do not render SDK/HTTP exception bodies: they may include headers or
        # tenant details. The exception class is enough for operator triage.
        print(json.dumps({
            "status": "FAIL",
            "error": "DataHub seed preflight/apply failed without exposing response content.",
            "errorType": type(error).__name__,
        }, indent=2), file=sys.stderr)
        raise SystemExit(1) from None


if __name__ == "__main__":
    run_cli()
