import argparse
import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path


RENAME_RULE = "RENAME_COLUMN_REQUIRES_COMPATIBILITY_FIELD"
TYPE_RULE = "TYPE_CHANGE_REQUIRES_PARALLEL_TYPED_FIELD"
DROP_RULE = "DROP_REQUIRES_DEPRECATION_BEFORE_REMOVAL"


class SandboxError(RuntimeError):
    pass


def fail(message: str) -> None:
    raise SandboxError(message)


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf8")


def read_json(path: Path):
    return json.loads(read_text(path))


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf8")).hexdigest()


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def stable_validated_at(manifest: dict) -> str:
    passport = manifest.get("passportContext") or {}
    valid_until = parse_iso_datetime(passport.get("validUntil"))
    if valid_until is None:
        return iso_now()
    baseline = valid_until - timedelta(days=1)
    rounded = baseline.replace(microsecond=0)
    if baseline.microsecond:
        rounded += timedelta(seconds=1)
    return rounded.isoformat().replace("+00:00", "Z")


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf8")


def display_path(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def validate_manifest(manifest: dict) -> None:
    require(manifest.get("manifestVersion") == "1.0", "manifestVersion must be 1.0")
    passport = manifest.get("passportContext") or {}
    grounding = manifest.get("grounding") or {}
    require(passport.get("artifactGroundingContractVersion") == grounding.get("contractVersion"), "passport grounding contract version must match manifest grounding version")
    require(passport.get("artifactGroundingRuleId") == (grounding.get("migrationRule") or {}).get("ruleId"), "passport grounding rule id must match manifest migration rule id")
    delivery = manifest.get("deliveryMetadata") or {}
    require(delivery.get("contextsealRunId") == manifest.get("generatedFromRunId"), "delivery metadata run id must match manifest run id")
    require(delivery.get("passportId") == passport.get("passportId"), "delivery metadata passport id must match manifest passport context")
    require(delivery.get("migrationStrategy") == (grounding.get("migrationRule") or {}).get("strategy"), "delivery metadata migration strategy must match grounding")
    require(delivery.get("targetPlatform") == (grounding.get("target") or {}).get("platform"), "delivery metadata target platform must match grounding")
    require(delivery.get("dialect") == (grounding.get("target") or {}).get("dialect"), "delivery metadata dialect must match grounding")
    require(isinstance(delivery.get("policyVersion"), str) and delivery["policyVersion"], "delivery metadata must include policy version")
    require(isinstance(delivery.get("policyHash"), str) and len(delivery["policyHash"]) == 64, "delivery metadata must include policy hash")
    require(isinstance(delivery.get("intendedDeprecationWindow"), str) and delivery["intendedDeprecationWindow"], "delivery metadata must include deprecation window")
    require(isinstance(manifest.get("artifacts"), list) and manifest["artifacts"], "manifest must include at least one artifact")
    schema_inputs = grounding.get("schemaInputs") or {}
    captured_fields = schema_inputs.get("capturedSchemaFields")
    require(isinstance(captured_fields, list) and captured_fields, "schema grounding must include the authoritative captured schema fields")
    require(schema_inputs.get("capturedFieldCount") == len(captured_fields), "captured field count must match the authoritative schema fields")
    require(all(isinstance(field.get("fieldPath"), str) and field["fieldPath"] for field in captured_fields), "captured schema fields must have field paths")


def projection_prefix(text: str) -> str:
    prefix, separator, _ = text.partition("from {{ ref(")
    require(separator, "SQL projection must select from a dbt model reference")
    return prefix


def require_explicit_projection(text: str, grounding: dict, artifact_name: str) -> None:
    projection = projection_prefix(text)
    require("select *" not in projection.lower(), f"{artifact_name} must use the authoritative explicit schema projection")
    for field in grounding["schemaInputs"]["capturedSchemaFields"]:
        field_path = field["fieldPath"]
        require(
            re.search(rf"(?m)^\s*{re.escape(field_path)}(?:,|\s*$)", projection) is not None,
            f"{artifact_name} must project authoritative schema field {field_path}"
        )


def validate_model_sql(text: str, grounding: dict) -> None:
    entity = grounding["target"]["entityName"]
    source = grounding["schemaInputs"]["sourceField"]
    destination = grounding["schemaInputs"]["destinationField"]
    destination_type = grounding["schemaInputs"]["destinationType"]
    rule_id = grounding["migrationRule"]["ruleId"]
    normalized = " ".join(text.split())

    require(f"ref('{entity}')" in normalized, "DBT model must reference the grounded target model")
    require_explicit_projection(text, grounding, "DBT model")
    if rule_id == RENAME_RULE:
        require(destination is not None, "rename rule requires a destination field")
        require(f"{source} as {destination}" in normalized, "DBT model must backfill the destination field from the source field")
    elif rule_id == TYPE_RULE:
        require(destination_type is not None, "type-change rule requires a destination type")
        require(f"try_cast({source} as {destination_type}) as {source}_typed" in normalized, "DBT model must cast into the typed compatibility field")
    elif rule_id == DROP_RULE:
        require("direct destructive removal is not generated" in text.lower(), "drop-preserving model must keep the explicit non-destructive notice")
        require(source in normalized, "drop-preserving model should still mention the grounded source field")
    else:
        fail(f"Unsupported migration rule id: {rule_id}")


def validate_tests_yaml(text: str, grounding: dict) -> None:
    generated_model = grounding["schemaInputs"]["generatedModelName"]
    source = grounding["schemaInputs"]["sourceField"]
    destination = grounding["schemaInputs"]["destinationField"]
    rule_id = grounding["migrationRule"]["ruleId"]

    if rule_id == RENAME_RULE:
        expected_field = destination
    elif rule_id == TYPE_RULE:
        expected_field = f"{source}_typed"
    elif rule_id == DROP_RULE:
        expected_field = source
    else:
        fail(f"Unsupported migration rule id in tests yaml: {rule_id}")

    require(f"name: {generated_model}" in text, "tests yaml must name the grounded generated model")
    require(f"- name: {source}" in text, "tests yaml must cover the grounded source field")
    require(f"- name: {expected_field}" in text, "tests yaml must cover the grounded compatibility field")
    expected_tests = grounding["schemaInputs"].get("generatedTests") or []
    source_block_match = re.search(rf"(?ms)^\s*- name: {re.escape(source)}\s*(.*?)(?=^\s*- name: |\Z)", text)
    require(source_block_match is not None, "tests yaml must preserve the grounded source field block")
    source_block = source_block_match.group(0)
    require(("- not_null" in source_block) == ("not_null" in expected_tests), "source not_null test must match the grounded schema constraint")
    require(("- unique" in source_block) == ("unique" in expected_tests), "source unique test must match the grounded schema constraint")


def validate_data_test_sql(text: str, grounding: dict) -> None:
    source = grounding["schemaInputs"]["sourceField"]
    destination = grounding["schemaInputs"]["destinationField"]
    generated_model = grounding["schemaInputs"]["generatedModelName"]
    normalized = " ".join(text.split())
    require(grounding["migrationRule"]["ruleId"] == RENAME_RULE, "only rename artifacts may emit a parity data test")
    require(f"ref('{generated_model}')" in normalized, "parity data test must target the grounded generated model")
    require(f"{source} is distinct from {destination}" in normalized, "parity data test must compare source and compatibility fields")


def validate_rollback_sql(text: str, grounding: dict) -> None:
    generated_model = grounding["schemaInputs"]["generatedModelName"]
    source = grounding["schemaInputs"]["sourceField"]
    destination = grounding["schemaInputs"]["destinationField"]
    rule_id = grounding["migrationRule"]["ruleId"]
    normalized = " ".join(text.split())

    require_explicit_projection(text, grounding, "rollback")

    if rule_id == RENAME_RULE:
        require(destination is not None, "rename rule requires a destination field")
        require(f"ref('{generated_model}')" in normalized, "rollback must target the canonical grounded generated model")
    elif rule_id == TYPE_RULE:
        require(f"ref('{generated_model}')" in normalized, "rollback must target the canonical grounded generated model")
    elif rule_id == DROP_RULE:
        require(f"ref('{generated_model}')" in normalized, "drop-preserving rollback must target the canonical grounded generated model")
    else:
        fail(f"Unsupported migration rule id in rollback sql: {rule_id}")


def validate_owner_brief(text: str, grounding: dict) -> None:
    verdict = grounding["policyInputs"]["verdict"]
    strategy = grounding["migrationRule"]["strategy"]
    require(f"Risk verdict: **{verdict}**" in text, "owner brief must include the grounded risk verdict")
    require(f"Migration strategy: **{strategy}**" in text, "owner brief must include the grounded migration strategy")
    for owner in grounding["lineageInputs"]["downstreamOwners"]:
        require(owner in text, f"owner brief must mention downstream owner {owner}")


def validate_artifact(artifact: dict, grounding: dict, outputs_root: Path) -> None:
    artifact_path = outputs_root / artifact["path"]
    require(artifact_path.exists(), f"artifact file is missing: {artifact['path']}")
    text = read_text(artifact_path)
    require(sha256_text(text) == artifact["sha256"], f"artifact hash mismatch: {artifact['path']}")

    for ref in artifact.get("groundingRefs", []):
        require(ref in grounding, f"artifact {artifact['path']} references missing grounding key {ref}")

    kind = artifact["kind"]
    if kind == "DBT_MODEL":
        validate_model_sql(text, grounding)
    elif kind == "DBT_TESTS":
        validate_tests_yaml(text, grounding)
    elif kind == "DBT_DATA_TEST":
        validate_data_test_sql(text, grounding)
    elif kind == "ROLLBACK":
        validate_rollback_sql(text, grounding)
    elif kind == "OWNER_BRIEF":
        validate_owner_brief(text, grounding)
    else:
        fail(f"unsupported artifact kind: {kind}")


def build_evidence(manifest_path: Path, repo_root: Path, manifest: dict, status: str, message: str) -> dict:
    return {
        "status": status,
        "validatedAt": stable_validated_at(manifest),
        "evidenceBoundary": "Deterministic local conformance harness for generated ContextSeal artifacts; not warehouse execution.",
        "command": "python scripts/run-generated-sandbox.py --evidence-output examples/outputs/sandbox/generated-sandbox-evidence.json",
        "manifestPath": display_path(manifest_path, repo_root),
        "manifestVersion": manifest.get("manifestVersion"),
        "generatedFromRunId": manifest.get("generatedFromRunId"),
        "passportContext": manifest.get("passportContext"),
        "deliveryMetadata": manifest.get("deliveryMetadata"),
        "artifactCount": len(manifest.get("artifacts") or []),
        "artifacts": manifest.get("artifacts") or [],
        "message": message
    }


def run(manifest_path: Path) -> tuple[dict, str]:
    manifest = read_json(manifest_path)
    validate_manifest(manifest)
    outputs_root = manifest_path.parent.parent
    grounding = manifest["grounding"]
    for artifact in manifest["artifacts"]:
        validate_artifact(artifact, grounding, outputs_root)
    return manifest, f"PASS generated artifact sandbox: {len(manifest['artifacts'])} artifact(s) validated against manifest {manifest_path.name}"


def serialized_evidence(manifest_path: Path, repo_root: Path, manifest: dict, status: str, message: str) -> str:
    return json.dumps(build_evidence(manifest_path, repo_root, manifest, status, message), indent=2) + "\n"


def assert_evidence_matches(manifest_path: Path, repo_root: Path, manifest: dict, evidence_output: Path, message: str) -> None:
    expected = serialized_evidence(manifest_path, repo_root, manifest, "PASS", message)
    if not evidence_output.exists():
        fail(f"sandbox evidence file is missing: {display_path(evidence_output, repo_root)}")
    actual = evidence_output.read_text(encoding="utf8")
    if actual != expected:
        fail(f"sandbox evidence differs from deterministic generation: {display_path(evidence_output, repo_root)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the generated ContextSeal artifact bundle with deterministic local conformance checks.")
    parser.add_argument(
        "--manifest",
        default=str(Path(__file__).resolve().parents[1] / "examples" / "outputs" / "generated" / "ARTIFACT_MANIFEST.json"),
        help="Path to the generated artifact manifest JSON."
    )
    parser.add_argument(
        "--evidence-output",
        default=None,
        help="Optional path to write a JSON evidence record for this sandbox run."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Compare the committed evidence artifact against deterministic generation without rewriting it."
    )
    args = parser.parse_args()
    manifest_path = Path(args.manifest).resolve()
    evidence_output = Path(args.evidence_output).resolve() if args.evidence_output else None
    repo_root = Path(__file__).resolve().parents[1]

    try:
        manifest, message = run(manifest_path)
        if evidence_output:
            if args.check:
                assert_evidence_matches(manifest_path, repo_root, manifest, evidence_output, message)
            else:
                write_json(evidence_output, build_evidence(manifest_path, repo_root, manifest, "PASS", message))
        if args.check:
            print(f"PASS generated artifact sandbox check: deterministic evidence matches {evidence_output.name if evidence_output else manifest_path.name}")
        else:
            print(message)
        return 0
    except SandboxError as error:
        if evidence_output and manifest_path.exists() and not args.check:
            try:
                manifest = read_json(manifest_path)
                write_json(evidence_output, build_evidence(manifest_path, repo_root, manifest, "FAIL", str(error)))
            except Exception:
                pass
        print(f"FAIL generated artifact sandbox: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
