const credentialPatterns = [
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b(?:datahub_pat_|dh_pat_|dhp_|acryl_pat_)[A-Za-z0-9._-]{20,}\b/i
];

const runtimeAssignment = /(?:^|[\s,;{(])(["']?)(datahub(?:_gms)?[_ -]?token|contextseal[_ -]?(?:operator|api)[_ -]?token|github[_ -]?(?:pat|token)|gh[_ -]?token|personal[_ -]?access[_ -]?token|access[_ -]?token|auth(?:orization)?[_ -]?token|operator[_ -]?token|api[_ -]?key|client[_ -]?secret|token|credential|secret|password|pat)\1\s*(?:=|:)\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s,;}\])]+))/gim;

const explicitCredentialKey = /^(?:datahub|contextseal|github|gh|personal|access|auth|authorization|operator|api|client)/i;

function placeholderCredential(value) {
  const normalized = String(value || "").trim().replace(/^["']|["']$/g, "").trim();
  return !normalized
    || /^(?:<[^>]+>|\$\{[^}]+\}|\$\(.*\)|\*+|x+|redacted|null|none)$/i.test(normalized)
    || /^(?:(?:paste|generate|your)[-_].*(?:token|credential|value|secret).*|local[-_]token(?:[-_]only)?|token[-_]here|buraya_.*(?:anahtar|token).*)$/i.test(normalized)
    || /(?:your[_ -]?(?:token|secret)|replace[_ -]?me|change[_ -]?me|example|placeholder|test-only|secrets\.|process\.env|env\.)/i.test(normalized);
}

function strongCredentialSignatures(content) {
  const signatures = [];
  for (const pattern of credentialPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) signatures.push("token-pattern");
  }
  return signatures;
}

function tokenLikeAssignmentValue(value) {
  const normalized = String(value || "").trim();
  if (placeholderCredential(normalized)) return false;
  if (!/^[A-Za-z0-9._~+/=-]+$/.test(normalized)) return false;
  return normalized.length >= 16
    || (normalized.length >= 12
      && /[A-Za-z]/.test(normalized)
      && /[0-9._~+/=-]/.test(normalized));
}

export function runtimeCredentialSignatures(value) {
  const content = String(value ?? "");
  const signatures = strongCredentialSignatures(content);

  const bearer = /\bbearer[ \t]+(["']?)([A-Za-z0-9._~+/=-]{12,})\1/gi;
  for (const match of content.matchAll(bearer)) {
    if (!placeholderCredential(match[2])) signatures.push("bearer-credential");
  }

  runtimeAssignment.lastIndex = 0;
  for (const match of content.matchAll(runtimeAssignment)) {
    const key = match[2];
    const assigned = match[3] ?? match[4] ?? match[5] ?? "";
    if (placeholderCredential(assigned)) continue;
    if (explicitCredentialKey.test(key) || tokenLikeAssignmentValue(assigned)) {
      signatures.push("credential-assignment");
    }
  }
  return [...new Set(signatures)];
}

export function containsRuntimeCredential(value) {
  return runtimeCredentialSignatures(value).length > 0;
}

export function credentialSignatures(content) {
  const signatures = strongCredentialSignatures(content);
  const assignments = /^[ \t]*(?:-[ \t]*)?(?:(?:export|set)[ \t]+|\$env:)?["']?(DATAHUB_GMS_TOKEN|CONTEXTSEAL_OPERATOR_TOKEN|CONTEXTSEAL_API_TOKEN)["']?[ \t]*(?:=|:)[ \t]*([^\r\n#]*)/gim;
  for (const match of content.matchAll(assignments)) {
    if (!placeholderCredential(match[2])) signatures.push(`non-empty-${match[1].toUpperCase()}`);
  }
  const setxAssignments = /^[ \t]*setx[ \t]+(DATAHUB_GMS_TOKEN|CONTEXTSEAL_OPERATOR_TOKEN|CONTEXTSEAL_API_TOKEN)[ \t]+([^\r\n#]*)/gim;
  for (const match of content.matchAll(setxAssignments)) {
    if (!placeholderCredential(match[2])) signatures.push(`non-empty-${match[1].toUpperCase()}`);
  }
  return [...new Set(signatures)];
}