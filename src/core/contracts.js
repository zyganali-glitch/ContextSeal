const CHANGE_TYPES = new Set(["rename_column", "drop_column", "type_change"]);

export class ContractError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ContractError";
    this.details = details;
  }
}

export function validateChangeRequest(value) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError("Change request must be an object.");
  }

  const requiredStrings = ["targetUrn", "entityName", "changeType", "sourceField", "requestedBy", "rationale"];
  for (const field of requiredStrings) {
    if (typeof value[field] !== "string" || value[field].trim() === "") {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (typeof value.changeType === "string" && !CHANGE_TYPES.has(value.changeType)) {
    errors.push(`changeType must be one of: ${[...CHANGE_TYPES].join(", ")}`);
  }
  if (value.changeType === "rename_column" && (!value.destinationField || !String(value.destinationField).trim())) {
    errors.push("destinationField is required for rename_column");
  }
  if (value.changeType === "type_change" && (!value.destinationType || !String(value.destinationType).trim())) {
    errors.push("destinationType is required for type_change");
  }
  if (errors.length) throw new ContractError("Invalid change request.", errors);

  return {
    targetUrn: value.targetUrn.trim(),
    entityName: value.entityName.trim(),
    changeType: value.changeType,
    sourceField: value.sourceField.trim(),
    destinationField: value.destinationField?.trim() || null,
    destinationType: value.destinationType?.trim() || null,
    requestedBy: value.requestedBy.trim(),
    rationale: value.rationale.trim()
  };
}
export function validateApproval(value) {
  const errors = [];
  if (!value || typeof value !== "object") throw new ContractError("Approval must be an object.");
  if (value.decision !== "APPROVE" && value.decision !== "REJECT") {
    errors.push("decision must be APPROVE or REJECT");
  }
  if (typeof value.reviewer !== "string" || !value.reviewer.trim()) errors.push("reviewer is required");
  if (typeof value.note !== "string" || value.note.trim().length < 8) errors.push("note must contain at least 8 characters");
  if (value.scopeAccepted !== true) errors.push("scopeAccepted must be true");
  if (errors.length) throw new ContractError("Invalid approval.", errors);
  return {
    decision: value.decision,
    reviewer: value.reviewer.trim(),
    note: value.note.trim(),
    scopeAccepted: true
  };
}
