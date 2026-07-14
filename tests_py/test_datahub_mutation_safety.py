"""Standard-library tests for the DataHub bootstrap mutation boundary."""

from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from datahub_mutation_safety import (  # noqa: E402
    GENERAL_CONFIRMATION,
    REMOTE_OPT_IN,
    SafetyError,
    build_certification_plan_hash,
    classify_entity_ownership,
    combine_disjoint_exact_scopes,
    hash_apply_contract,
    has_exact_markers,
    parse_gms_endpoint,
    validate_apply_gate,
    validate_read_only_preflight,
)


class EndpointSafetyTests(unittest.TestCase):
    def test_loopback_variants_are_local(self) -> None:
        self.assertTrue(parse_gms_endpoint("http://localhost:8080").is_loopback)
        self.assertTrue(parse_gms_endpoint("http://127.0.0.1:8080/").is_loopback)
        self.assertTrue(parse_gms_endpoint("http://[::1]:8080").is_loopback)

    def test_lookalike_and_ambiguous_urls_are_rejected(self) -> None:
        for url in (
            "http://localhost.example:8080",
            "http://localhost:8080/api/gms",
            "https://user@example.com",
            "https://example.com/path?next=localhost",
            "https://example.com/%2e%2e/gms",
        ):
            with self.subTest(url=url), self.assertRaises(SafetyError):
                parse_gms_endpoint(url)

    def test_remote_http_is_rejected(self) -> None:
        with self.assertRaises(SafetyError):
            parse_gms_endpoint("http://datahub.example.com")


class ApplyGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.scope = ("urn:li:dataset:one", "urn:li:dataset:two")
        self.base = {
            "DATAHUB_GMS_URL": "http://127.0.0.1:8080",
            "DATAHUB_MCP_MUTATIONS_ENABLED": "true",
            "CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION": GENERAL_CONFIRMATION,
            "CONTEXTSEAL_SEED_CONFIRMATION": "SEED_EXACT",
            "CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256": "a" * 64,
        }

    def test_loopback_still_requires_both_exact_confirmations(self) -> None:
        endpoint = validate_apply_gate(
            self.base,
            operation_confirmation_variable="CONTEXTSEAL_SEED_CONFIRMATION",
            operation_confirmation="SEED_EXACT",
            expected_urns=self.scope,
            remote_scope_variable="CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
            certification_plan_sha256="a" * 64,
        )
        self.assertTrue(endpoint.is_loopback)
        for key in (
            "CONTEXTSEAL_DATAHUB_MUTATION_CONFIRMATION",
            "CONTEXTSEAL_SEED_CONFIRMATION",
            "CONTEXTSEAL_APPROVED_BOOTSTRAP_PLAN_SHA256",
            "DATAHUB_MCP_MUTATIONS_ENABLED",
        ):
            invalid = dict(self.base)
            invalid[key] = "almost"
            with self.subTest(key=key), self.assertRaises(SafetyError):
                validate_apply_gate(
                    invalid,
                    operation_confirmation_variable="CONTEXTSEAL_SEED_CONFIRMATION",
                    operation_confirmation="SEED_EXACT",
                    expected_urns=self.scope,
                    remote_scope_variable="CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
                    certification_plan_sha256="a" * 64,
                )
            missing = dict(self.base)
            missing.pop(key)
            with self.subTest(missing=key), self.assertRaises(SafetyError):
                validate_apply_gate(
                    missing,
                    operation_confirmation_variable="CONTEXTSEAL_SEED_CONFIRMATION",
                    operation_confirmation="SEED_EXACT",
                    expected_urns=self.scope,
                    remote_scope_variable="CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
                    certification_plan_sha256="a" * 64,
                )

    def test_preflight_requires_the_runtime_gate_closed(self) -> None:
        validate_read_only_preflight({})
        validate_read_only_preflight({"DATAHUB_MCP_MUTATIONS_ENABLED": "false"})
        for value in ("true", "TRUE", "", "1"):
            with self.subTest(value=value), self.assertRaises(SafetyError):
                validate_read_only_preflight({"DATAHUB_MCP_MUTATIONS_ENABLED": value})

    def test_remote_requires_opt_in_exact_url_and_exact_scope(self) -> None:
        remote = {
            **self.base,
            "DATAHUB_GMS_URL": "https://datahub.example.com/api/gms",
            "CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP": REMOTE_OPT_IN,
            "CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS": json.dumps(
                ["https://datahub.example.com/api/gms"]
            ),
            "CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS": json.dumps(self.scope),
        }
        endpoint = validate_apply_gate(
            remote,
            operation_confirmation_variable="CONTEXTSEAL_SEED_CONFIRMATION",
            operation_confirmation="SEED_EXACT",
            expected_urns=self.scope,
            remote_scope_variable="CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
            certification_plan_sha256="a" * 64,
        )
        self.assertFalse(endpoint.is_loopback)

        for key, bad_value in (
            ("CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP", "true"),
            ("CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS", '["https://other.example.com"]'),
            ("CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS", '["urn:li:dataset:one"]'),
            ("CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS", '["urn:li:dataset:*"]'),
        ):
            invalid = dict(remote)
            invalid[key] = bad_value
            with self.subTest(key=key, value=bad_value), self.assertRaises(SafetyError):
                validate_apply_gate(
                    invalid,
                    operation_confirmation_variable="CONTEXTSEAL_SEED_CONFIRMATION",
                    operation_confirmation="SEED_EXACT",
                    expected_urns=self.scope,
                    remote_scope_variable="CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
                    certification_plan_sha256="a" * 64,
                )
        for key in (
            "CONTEXTSEAL_REMOTE_DATAHUB_BOOTSTRAP",
            "CONTEXTSEAL_REMOTE_DATAHUB_ALLOWED_GMS_URLS",
            "CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
        ):
            missing = dict(remote)
            missing.pop(key)
            with self.subTest(missing=key), self.assertRaises(SafetyError):
                validate_apply_gate(
                    missing,
                    operation_confirmation_variable="CONTEXTSEAL_SEED_CONFIRMATION",
                    operation_confirmation="SEED_EXACT",
                    expected_urns=self.scope,
                    remote_scope_variable="CONTEXTSEAL_REMOTE_DATAHUB_SEED_URNS",
                    certification_plan_sha256="a" * 64,
                )

    def test_markers_require_every_exact_value(self) -> None:
        expected = {"contextseal_fixture": "true", "evidence_boundary": "synthetic-local"}
        self.assertTrue(has_exact_markers({**expected, "unrelated": "ok"}, expected))
        self.assertFalse(has_exact_markers({"contextseal_fixture": "true"}, expected))
        self.assertFalse(
            has_exact_markers(
                {"contextseal_fixture": "TRUE", "evidence_boundary": "synthetic-local"},
                expected,
            )
        )
        self.assertEqual(
            classify_entity_ownership(entity_exists=False, properties=None, markers=expected),
            "ABSENT",
        )
        self.assertEqual(
            classify_entity_ownership(entity_exists=True, properties=expected, markers=expected),
            "OWNED",
        )
        with self.assertRaises(SafetyError):
            classify_entity_ownership(
                entity_exists=True,
                properties={"contextseal_fixture": "true"},
                markers=expected,
            )

    def test_mutation_scopes_must_be_unique_and_disjoint(self) -> None:
        self.assertEqual(
            combine_disjoint_exact_scopes(["urn:current"], ["urn:cleanup"]),
            ["urn:current", "urn:cleanup"],
        )
        for current, cleanup in (
            (["urn:same"], ["urn:same"]),
            (["urn:duplicate", "urn:duplicate"], []),
            (["urn:*"], []),
        ):
            with self.subTest(current=current, cleanup=cleanup), self.assertRaises(SafetyError):
                combine_disjoint_exact_scopes(current, cleanup)

    def test_any_apply_contract_change_changes_the_certification_hash(self) -> None:
        first = hash_apply_contract({"seed.py": b"owners=v1", "safety.py": b"gates=v1"})
        second = hash_apply_contract({"seed.py": b"owners=v2", "safety.py": b"gates=v1"})
        self.assertNotEqual(first, second)
        endpoint = parse_gms_endpoint("http://127.0.0.1:8080")
        plan_a = build_certification_plan_hash(
            operation="seed-v1",
            endpoint=endpoint,
            expected_urns=["urn:a"],
            contract_sha256=first,
        )
        plan_b = build_certification_plan_hash(
            operation="seed-v1",
            endpoint=endpoint,
            expected_urns=["urn:a"],
            contract_sha256=second,
        )
        self.assertNotEqual(plan_a, plan_b)


if __name__ == "__main__":
    unittest.main()
