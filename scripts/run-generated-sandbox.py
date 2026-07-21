import argparse
import hashlib
import json
from datetime import datetime, timezone
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
    require(isinstance(manifest.get("artifacts"), list) and manifest["artifacts"], "manifest must include at least one artifact")


def validate_model_sql(text: str, grounding: dict) -> None:
    entity = grounding["target"]["entityName"]
    source = grounding["schemaInputs"]["sourceField"]
    destination = grounding["schemaInputs"]["destinationField"]
    destination_type = grounding["schemaInputs"]["destinationType"]
    rule_id = grounding["migrationRule"]["ruleId"]
    normalized = " ".join(text.split())

    require(f"ref('{entity}')" in normalized, "DBT model must reference the grounded target model")
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
    entity = grounding["target"]["entityName"]
    source = grounding["schemaInputs"]["sourceField"]
    destination = grounding["schemaInputs"]["destinationField"]
    destination_type = grounding["schemaInputs"]["destinationType"]
    rule_id = grounding["migrationRule"]["ruleId"]

    if rule_id == RENAME_RULE:
        expected_field = destination
    elif rule_id == TYPE_RULE:
        expected_field = f"{source}_typed"
    elif rule_id == DROP_RULE:
        expected_field = source
    else:
        fail(f"Unsupported migration rule id in tests yaml: {rule_id}")

    require(f"name: {entity}_contextseal" in text, "tests yaml must name the grounded generated model")
    require(f"- name: {expected_field}" in text, "tests yaml must cover the grounded compatibility field")
    require("- not_null" in text, "tests yaml must preserve the not_null expectation")


def validate_rollback_sql(text: str, grounding: dict) -> None:
    entity = grounding["target"]["entityName"]
    source = grounding["schemaInputs"]["sourceField"]
    destination = grounding["schemaInputs"]["destinationField"]
    rule_id = grounding["migrationRule"]["ruleId"]
    normalized = " ".join(text.split())

    if rule_id == RENAME_RULE:
        require(destination is not None, "rename rule requires a destination field")
        require(f"exclude ({destination})" in normalized, "rollback must exclude the grounded compatibility field")
        require(f"ref('{entity}_compat')" in normalized, "rollback must target the grounded compatibility model")
    elif rule_id == TYPE_RULE:
        require(f"exclude ({source}_typed)" in normalized, "rollback must exclude the typed compatibility field")
        require(f"ref('{entity}_typed')" in normalized, "rollback must target the typed grounded compatibility model")
    elif rule_id == DROP_RULE:
        require("select 1;" in text.lower(), "drop-preserving rollback should remain a no-op")
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
    elif kind == "ROLLBACK":
        validate_rollback_sql(text, grounding)
    elif kind == "OWNER_BRIEF":
        validate_owner_brief(text, grounding)
    else:
        fail(f"unsupported artifact kind: {kind}")


def build_evidence(manifest_path: Path, repo_root: Path, manifest: dict, status: str, message: str) -> dict:
    return {
        "status": status,
        "validatedAt": iso_now(),
        "evidenceBoundary": "Deterministic local conformance harness for generated ContextSeal artifacts; not warehouse execution.",
        "command": "python scripts/run-generated-sandbox.py --evidence-output examples/outputs/sandbox/generated-sandbox-evidence.json",
        "manifestPath": display_path(manifest_path, repo_root),
        "manifestVersion": manifest.get("manifestVersion"),
        "generatedFromRunId": manifest.get("generatedFromRunId"),
        "passportContext": manifest.get("passportContext"),
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
    args = parser.parse_args()
    manifest_path = Path(args.manifest).resolve()
    evidence_output = Path(args.evidence_output).resolve() if args.evidence_output else None
    repo_root = Path(__file__).resolve().parents[1]

    try:
        manifest, message = run(manifest_path)
        if evidence_output:
            write_json(evidence_output, build_evidence(manifest_path, repo_root, manifest, "PASS", message))
        print(message)
        return 0
    except SandboxError as error:
        if evidence_output and manifest_path.exists():
            try:
                manifest = read_json(manifest_path)
                write_json(evidence_output, build_evidence(manifest_path, repo_root, manifest, "FAIL", str(error)))
            except Exception:
                pass
        print(f"FAIL generated artifact sandbox: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())