const secretPatterns: Array<[string, RegExp]> = [
  ["private key", /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/i],
  ["JWT", /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/],
  ["cookie", /(?:^|\b)(?:session|sid|auth|access_token|refresh_token)\s*=/i],
  ["bearer token", /\bbearer\s+[a-zA-Z0-9._~+/=-]{16,}/i],
  ["password", /\b(?:password|passwd|pwd)\s*[:=]/i],
  ["API token", /\b(?:api[_ -]?key|api[_ -]?token|client[_ -]?secret|access[_ -]?token|refresh[_ -]?token)\s*[:=]/i],
  ["cloud access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["MFA or recovery code", /\b(?:mfa|2fa|otp|recovery|backup)[_ -]?(?:code|codes)?\s*[:=]\s*[A-Za-z0-9 -]{4,}/i],
];

const credentialDocumentNames = [
  /(?:^|[-_ ])(?:passwords?|credentials?|secrets?)(?=(?:\.[^.]+)?$|[-_ ](?:list|export|backup|vault)(?:\.[^.]+)?$)/i,
  /(?:^|[-_ ])(?:recovery[-_ ]?codes?|mfa[-_ ]?codes?|api[-_ ]?(?:keys?|tokens?)|cookie[-_ ]?(?:export|jar)|session[-_ ]?(?:export|tokens?))(?=(?:\.[^.]+)?$)/i,
];

export function findSecretPattern(value: string | undefined | null) {
  if (!value) return null;
  for (const [label, pattern] of secretPatterns) if (pattern.test(value)) return label;
  return null;
}

export function isUnsafeCredentialDocumentName(value: string) {
  return credentialDocumentNames.some((pattern) => pattern.test(value));
}
