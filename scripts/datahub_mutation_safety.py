"""Fail-closed gates shared by ContextSeal's DataHub bootstrap helpers.

This module is deliberately standard-library-only so its URL, confirmation,
and exact-scope checks can be tested without a DataHub installation.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import ipaddress
import json
from typing import Mapping, Sequence
from urllib.parse import urlsplit, urlunsplit


GENERAL_CONFIRMATION = "I_UNDERSTAND_THIS_COMMAND_MUTATES_DATAHUB"
REMOTE_OPT_IN = "I_ACCEPT_REMOTE_DATAHUB_BOOTSTRAP_RISK"


class SafetyError(RuntimeError):
    """An operator-controlled mutation boundary was not satisfied."""


@dataclass(frozen=True)
class EndpointBoundary:
    canonical_url: str
    is_loopback: bool


def hash_apply_contract(parts: Mapping[str, bytes]) -> str:
    """Hash named immutable apply inputs without concatenation ambiguity."""

    if not parts or any(not name or not isinstance(content, bytes) for name, content in parts.items()):
        raise SafetyError("Apply contract requires named byte inputs.")
    digest = hashlib.sha256()
    for name in sorted(parts):
        encoded_name = name.encode("utf-8")
        content = parts[name]
        digest.update(len(encoded_name).to_bytes(8, "big"))
        digest.update(encoded_name)
        digest.update(len(content).to_bytes(8, "big"))
        digest.update(content)
    return digest.hexdigest()


def build_certification_plan_hash(
    *,
    operation: str,
    endpoint: EndpointBoundary,
    expected_urns: Sequence[str],
    contract_sha256: str,
) -> str:
    """Bind a bootstrap approval to one operation, endpoint, scope, and contract."""

    if not operation or not contract_sha256:
        raise SafetyError("Certification plan requires an operation and contract hash.")
    if len(set(expected_urns)) != len(expected_urns):
        raise SafetyError("Certification plan mutation URNs must be unique.")
    plan = {
        "version": 1,
        "operation": operation,
        "endpointSha256": hashlib.sha256(endpoint.canonical_url.encode("utf-8")).hexdigest(),
        "expectedUrns": sorted(expected_urns),
        "contractSha256": contract_sha256,
    }
    canonical = json.dumps(plan, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _is_loopback_host(hostname: str) -> bool:
    if hostname.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(hostname).is_loopback
    except ValueError:
        return False


def parse_gms_endpoint(raw_url: str) -> EndpointBoundary:
    """Return an unambiguous canonical URL and whether it is loopback-only."""

    if not isinstance(raw_url, str) or not raw_url or raw_url != raw_url.strip():
        raise SafetyError("DATAHUB_GMS_URL must be a non-empty URL without surrounding whitespace.")
    if any(character in raw_url for character in ("\\", "\r", "\n", "\t")):
        raise SafetyError("DATAHUB_GMS_URL contains an ambiguous or invalid character.")

    parsed = urlsplit(raw_url)
    if parsed.scheme not in {"http", "https"}:
        raise SafetyError("DATAHUB_GMS_URL must use exactly http or https.")
    if not parsed.hostname or parsed.username is not None or parsed.password is not None:
        raise SafetyError("DATAHUB_GMS_URL must not contain credentials and must include a host.")
    if parsed.query or parsed.fragment:
        raise SafetyError("DATAHUB_GMS_URL must not contain a query string or fragment.")
    try:
        port = parsed.port
    except ValueError as error:
        raise SafetyError("DATAHUB_GMS_URL contains an invalid port.") from error

    hostname = parsed.hostname.lower()
    loopback = _is_loopback_host(hostname)
    if loopback and parsed.path not in {"", "/"}:
        raise SafetyError("Loopback DATAHUB_GMS_URL must point to the GMS root path.")
    if not loopback and parsed.scheme != "https":
        raise SafetyError("Remote DataHub bootstrap requires HTTPS.")
    if "%" in parsed.netloc or "%" in parsed.path:
        raise SafetyError("Percent-encoded endpoint components are not accepted for mutation commands.")

    rendered_host = f"[{hostname}]" if ":" in hostname else hostname
    netloc = rendered_host if port is None else f"{rendered_host}:{port}"
    path = parsed.path.rstrip("/")
    return EndpointBoundary(
        canonical_url=urlunsplit((parsed.scheme, netloc, path, "", "")),
        is_loopback=loopback,
    )


def parse_exact_json_list(raw_value: str, variable_name: str) -> tuple[str, ...]:
    """Parse a JSON string array, rejecting blanks, duplicates, and wildcards."""

    try:
        parsed = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError) as error:
        raise SafetyError(f"{variable_name} must be a JSON array of exact strings.") from error
    if not isinstance(parsed, list) or not parsed:
        raise SafetyError(f"{variable_name} must be a non-empty JSON array.")
    if any(not isinstance(value, str) or not value or value != value.strip() for value in parsed):
        raise SafetyError(f"{variable_name} may contain only non-empty exact strings.")
    if any("*" in value for value in parsed):
        raise SafetyError(f"{variable_name} does not accept wildcards.")
    if len(set(parsed)) != len(parsed):
        raise SafetyError(f"{variable_name} must not contain duplicates.")
    return tuple(parsed)


def combine_disjoint_exact_scopes(current_urns: Sequence[str], cleanup_urns: Sequence[str]) -> list[str]:
    """Combine two exact mutation scopes only when each is unique and disjoint."""

    if any(not urn or "*" in urn for urn in (*current_urns, *cleanup_urns)):
        raise SafetyError("Mutation scopes require non-empty exact URNs without wildcards.")
    if len(set(current_urns)) != len(current_urns):
        raise SafetyError("Current mutation URNs are not unique.")
    if len(set(cleanup_urns)) != len(cleanup_urns):
        raise SafetyError("Cleanup mutation URNs are not unique.")
    if set(current_urns).intersection(cleanup_urns):
        raise SafetyError("Cleanup mutation scope intersects the current mutation scope.")
    return [*current_urns, *cleanup_urns]


def validate_apply_gate(
    environment: Mapping[str, str],
    *,
    operation_confirmation_variable: str,
    operation_confirmation: str,
    expected_urns: Sequence[str],
    remote_scope_variable: str,
    certification_plan_sha256: str,
) -> EndpointBoundary:
    """Validate confirmations and, for remote GMS, exact endpoint/URN scope."""

    endpoint = parse_gms_endpoint(environment.get("DATAHUB_GMS_URL", ""))
    if environment.get("DATAHUB_MCP_MUTATIONS_ENABLED") != "true":
        raise SafetyError("DATAHUB_MCP_MUTATIONS_ENABLED must be exactly true during the bounded apply window.")
    if environment.get("CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256") != certification_plan_sha256:
        raise SafetyError(
            "CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256 must exactly match the latest read-only preflight plan."
        )
    if environment.get("CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION") != GENERAL_CONFIRMATION:
        raise SafetyError(
            "Set CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION to the documented exact phrase for this shell."
        )
    if environment.get(operation_confirmation_variable) != operation_confirmation:
        raise SafetyError(
            f"Set {operation_confirmation_variable} to its documented operation-specific exact phrase."
        )

    if endpoint.is_loopback:
        return endpoint

    if environment.get("CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP") != REMOTE_OPT_IN:
        raise SafetyError("Remote bootstrap requires the documented exact remote-risk opt-in.")

    allowed_urls = parse_exact_json_list(
        environment.get("CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS", ""),
        "CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS",
    )
    canonical_allowed_urls = tuple(parse_gms_endpoint(value).canonical_url for value in allowed_urls)
    if any(parse_gms_endpoint(value).is_loopback for value in allowed_urls):
        raise SafetyError("The remote GMS allowlist may contain only remote HTTPS endpoints.")
    if canonical_allowed_urls != (endpoint.canonical_url,):
        raise SafetyError("Remote GMS allowlist must contain exactly the active canonical endpoint.")

    allowed_urns = set(
        parse_exact_json_list(environment.get(remote_scope_variable, ""), remote_scope_variable)
    )
    if allowed_urns != set(expected_urns) or len(allowed_urns) != len(expected_urns):
        raise SafetyError("Remote mutation URN allowlist must exactly equal the compiled operation scope.")
    return endpoint


def validate_read_only_preflight(environment: Mapping[str, str]) -> None:
    """Require the shared runtime mutation gate to be closed for preflight."""

    if environment.get("DATAHUB_MCP_MUTATIONS_ENABLED", "false") != "false":
        raise SafetyError("Read-only bootstrap preflight requires DATAHUB_MCP_MUTATIONS_ENABLED=false.")


def has_exact_markers(properties: Mapping[str, object] | None, markers: Mapping[str, str]) -> bool:
    """Return true only when every ownership marker has the exact expected value."""

    return isinstance(properties, Mapping) and all(
        properties.get(key) == value for key, value in markers.items()
    )


def classify_entity_ownership(
    *, entity_exists: bool, properties: Mapping[str, object] | None, markers: Mapping[str, str]
) -> str:
    """Classify safe bootstrap state and reject every existing marker conflict."""

    if not entity_exists:
        return "ABSENT"
    if not has_exact_markers(properties, markers):
        raise SafetyError("Existing entity does not have every exact ContextSeal ownership marker.")
    return "OWNED"
