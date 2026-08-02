export const REQUIRED_RENAME_ARTIFACT_KINDS = Object.freeze([
  "DBT_MODEL",
  "DBT_TESTS",
  "DBT_DATA_TEST",
  "ROLLBACK",
  "OWNER_BRIEF"
]);

export function assertRenameArtifactContract(files) {
  if (!Array.isArray(files)) throw new Error("Rename artifact contract requires an artifact array.");
  const kinds = files.map((file) => file?.kind);
  const missing = REQUIRED_RENAME_ARTIFACT_KINDS.filter((kind) => !kinds.includes(kind));
  const unexpected = kinds.filter((kind) => !REQUIRED_RENAME_ARTIFACT_KINDS.includes(kind));
  if (files.length !== REQUIRED_RENAME_ARTIFACT_KINDS.length || missing.length || unexpected.length || new Set(kinds).size !== kinds.length) {
    throw new Error(`Rename artifact contract requires exactly ${REQUIRED_RENAME_ARTIFACT_KINDS.join(", ")}.`);
  }
  return files;
}
