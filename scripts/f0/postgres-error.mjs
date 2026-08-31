const serverPrefix = String.raw`\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)? [A-Za-z0-9_:+-]+ \[\d+\]`;
const psqlFilePrefix = String.raw`psql:[^\r\n]*?:\d+:`;
const diagnosticLine = new RegExp(
  String.raw`^(?:(?:${serverPrefix}|${psqlFilePrefix})[ \t]+)?(ERROR|FATAL|PANIC|error|WARNING|NOTICE|INFO|LOG|DEBUG[1-5]?|DETAIL|HINT|QUERY|CONTEXT|STATEMENT|LOCATION):[ \t]+(.*)$`,
  "u",
);
const contextFields = new Set(["DETAIL", "HINT", "QUERY", "CONTEXT", "STATEMENT", "LOCATION"]);

function firstErrorMessage(stderr) {
  let primaryMessage = null;
  for (const line of stderr.split(/\r?\n/u)) {
    const diagnostic = diagnosticLine.exec(line);
    if (primaryMessage !== null) {
      if (line === "") continue;
      // Another diagnostic field/record ends this one-line primary message.
      // Unframed continuation text makes exact message equality unproven.
      return diagnostic ? primaryMessage : null;
    }
    if (diagnostic) {
      const [, severity, message] = diagnostic;
      if (severity === "ERROR") {
        primaryMessage = message;
        continue;
      }
      if (severity === "FATAL" || severity === "PANIC" || severity === "error" || contextFields.has(severity)) return null;
      continue;
    }
    // Unknown prefixes or orphaned context cannot prove which failure came first.
    if (/(?:ERROR|FATAL|PANIC):|^psql: error:/u.test(line)) return null;
  }
  return primaryMessage;
}

// PostgreSQL and psql send diagnostics to stderr. stdout can contain echoed SQL.
// Support the tracked default server prefix, psql file locations, and bare errors.
// An unsupported or ambiguous format fails closed instead of searching later text.
export function matchesPrimaryPostgresError(result, expectedMessage) {
  if (!result || result.error != null || result.signal != null
      || !Number.isInteger(result.status) || result.status < 0
      || typeof result.stderr !== "string" || typeof expectedMessage !== "string"
      || expectedMessage.length === 0 || /[\r\n]/u.test(expectedMessage)) {
    return false;
  }
  // The single-user backend can exit zero after a SQL ERROR. psql callers retain
  // their separate nonzero-exit checks before accepting this message comparison.
  return firstErrorMessage(result.stderr) === expectedMessage;
}
