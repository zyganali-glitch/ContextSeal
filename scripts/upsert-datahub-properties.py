"""Fail-closed ContextSeal structured-property bootstrap.

The helper defaults to read-only preflight. It creates a missing definition,
skips an exact existing definition, and refuses to overwrite any mismatch.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
from typing import Any

from datahub.api.entities.structuredproperties.structuredproperties import StructuredProperties
from datahub.ingestion.graph.client import get_default_graph
from datahub.ingestion.graph.config import ClientMode

from datahub_mutation_safety import (
    SafetyError,
    build_certification_plan_hash,
    hash_apply_contract,
    parse_gms_endpoint,
    validate_apply_gate,
    validate_read_only_preflight,
)


ROOT = Path(__file__).resolve().parents[1]
PROPERTY_FILE = ROOT / "config" / "contextseal-structured-properties.yml"
PROPERTIES_CONFIRMATION = "UPSERT_CONTEXTSEAL_STRUCTURED_PROPERTIES_V1"


def load_local_env() -> None:
    """Load GMS connection/runtime-gate values; confirmations stay shell-only."""

    env_file = ROOT / ".env"
    if not env_file.exists():
        raise SafetyError("Create .env from .env.example before configuring DataHub properties.")
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


def property_contract(prop: StructuredProperties) -> dict[str, Any]:
    """Canonical fields the helper is authorized to create, never overwrite."""

    return {
        "urn": prop.urn,
        "qualifiedName": prop.fqn,
        "type": prop.type,
        "version": prop.version,
        "displayName": prop.display_name,
        "description": prop.description,
        "entityTypes": tuple(prop.entity_types or ()),
        "cardinality": prop.cardinality,
        "allowedValues": tuple(
            (allowed.value, allowed.description) for allowed in (prop.allowed_values or ())
        ),
        "typeQualifier": tuple(prop.type_qualifier.allowed_types)
        if prop.type_qualifier is not None
        else (),
        "immutable": bool(prop.immutable),
    }


def inspect_definition(graph: Any, desired: StructuredProperties) -> str:
    """Return ABSENT/EXACT and fail closed on an existing name collision."""

    assert desired.urn is not None
    if not graph.exists(desired.urn):
        return "ABSENT"
    existing = StructuredProperties.from_datahub(graph=graph, urn=desired.urn)
    if property_contract(existing) != property_contract(desired):
        raise SafetyError(
            f"Refusing to overwrite structured property {desired.urn}; its existing definition is not exact."
        )
    return "EXACT"


def preflight_definitions(graph: Any, desired: list[StructuredProperties]) -> dict[str, int]:
    """Inspect every definition before the first possible create."""

    observations = {"absent": 0, "exact": 0}
    for prop in desired:
        state = inspect_definition(graph, prop)
        observations[state.lower()] += 1
    return observations


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Preflight or create the fixed ContextSeal structured-property definitions."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--preflight", action="store_true", help="Read-only definition inspection (default).")
    mode.add_argument("--apply", action="store_true", help="Create missing exact definitions after every gate passes.")
    mode.add_argument("--print-scope", action="store_true", help="Print the compiled structured-property URNs only.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    desired = StructuredProperties.from_yaml(str(PROPERTY_FILE))
    scope = [prop.urn for prop in desired]
    if any(urn is None for urn in scope):
        raise SafetyError("Every ContextSeal structured property must have an exact URN.")
    exact_scope = [str(urn) for urn in scope]

    if args.print_scope:
        print(json.dumps(exact_scope, indent=2))
        return

    load_local_env()
    endpoint = parse_gms_endpoint(os.environ.get("DATAHUB_GMS_URL", ""))
    contract_sha256 = hash_apply_contract({
        "contextseal-structured-properties.yml": PROPERTY_FILE.read_bytes(),
        "upsert-datahub-properties.py": Path(__file__).read_bytes(),
        "datahub_mutation_safety.py": (Path(__file__).parent / "datahub_mutation_safety.py").read_bytes(),
    })
    plan_sha256 = build_certification_plan_hash(
        operation="contextseal-structured-properties-v1",
        endpoint=endpoint,
        expected_urns=exact_scope,
        contract_sha256=contract_sha256,
    )
    if args.apply:
        endpoint = validate_apply_gate(
            os.environ,
            operation_confirmation_variable="CONTEXTSEAL_PROPERTIES_CONFIRMATION",
            operation_confirmation=PROPERTIES_CONFIRMATION,
            expected_urns=exact_scope,
            remote_scope_variable="CONTEXTSEAL_REMOTE_DATAHUB_PROPERTY_URNS",
            certification_plan_sha256=plan_sha256,
        )
    else:
        validate_read_only_preflight(os.environ)

    with get_default_graph(ClientMode.CLI) as graph:
        observations = preflight_definitions(graph, desired)
        if not args.apply:
            print(json.dumps({
                "status": "PASS",
                "mutationState": "NOT_RUN",
                "endpointBoundary": "loopback" if endpoint.is_loopback else "remote-read-only",
                "endpointSha256": hashlib.sha256(endpoint.canonical_url.encode("utf-8")).hexdigest(),
                "scopeUrnCount": len(exact_scope),
                "certificationState": "PASS",
                "approvalState": "NOT_RUN",
                "certificationPlanSha256": plan_sha256,
                "definitions": observations,
                "nextStep": "Use --apply only with the documented exact, shell-scoped confirmations.",
            }, indent=2))
            return

        created = 0
        skipped = 0
        for prop in desired:
            state = inspect_definition(graph, prop)
            if state == "EXACT":
                skipped += 1
                continue
            for proposal in prop.generate_mcps():
                graph.emit_mcp(proposal)
            created += 1
        readback = preflight_definitions(graph, desired)
        if readback != {"absent": 0, "exact": len(desired)}:
            raise SafetyError("Structured-property read-back did not match every exact definition.")

    print(json.dumps({
        "status": "PASS",
        "mutationState": "PASS" if created else "NOT_RUN",
        "endpointBoundary": "loopback" if endpoint.is_loopback else "remote-exact-allowlisted",
        "scopeUrnCount": len(exact_scope),
        "certificationState": "PASS",
        "approvalState": "PASS",
        "certificationPlanSha256": plan_sha256,
        "created": created,
        "skippedExact": skipped,
        "definitionsPreflight": observations,
        "definitionReadbackState": "PASS",
        "definitionsReadback": readback,
    }, indent=2))


def run_cli() -> None:
    try:
        main()
    except SafetyError as error:
        print(json.dumps({"status": "FAIL", "error": str(error)}, indent=2), file=sys.stderr)
        raise SystemExit(2) from None
    except Exception as error:
        # Avoid rendering SDK/HTTP response bodies, which may contain tenant
        # details or headers. Operators can diagnose by exception class.
        print(json.dumps({
            "status": "FAIL",
            "error": "Structured-property preflight/apply failed without exposing response content.",
            "errorType": type(error).__name__,
        }, indent=2), file=sys.stderr)
        raise SystemExit(1) from None


if __name__ == "__main__":
    run_cli()
