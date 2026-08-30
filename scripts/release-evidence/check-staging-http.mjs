import { pathToFileURL } from "node:url";

const CODE_PREFIX = "STAGING_HTTP";
const REQUIRED_HEADERS = Object.freeze([
  "content-security-policy",
  "referrer-policy",
  "x-content-type-options",
  "cache-control",
  "strict-transport-security",
]);

class StagingHttpError extends Error {
  constructor(code) {
    super(code);
    this.name = "StagingHttpError";
    this.code = code;
  }
}

function fail(code) {
  throw new StagingHttpError(code);
}

function parseStagingUrl(value) {
  if (typeof value !== "string" || value.length === 0) fail(`${CODE_PREFIX}_URL_REQUIRED`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${CODE_PREFIX}_URL_INVALID`);
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username !== ""
    || parsed.password !== ""
    || parsed.search !== ""
    || parsed.hash !== ""
    || parsed.pathname !== "/"
  ) fail(`${CODE_PREFIX}_URL_INVALID`);
  return parsed;
}

function sameOriginPath(location, origin) {
  if (!location) return null;
  let parsed;
  try {
    parsed = new URL(location, origin);
  } catch {
    return null;
  }
  if (parsed.origin !== origin.origin || parsed.search !== "" || parsed.hash !== "") return null;
  return parsed.pathname;
}

function headerChecks(headers) {
  const values = Object.fromEntries(REQUIRED_HEADERS.map((name) => [name, headers.get(name) ?? ""]));
  return {
    present: Object.fromEntries(REQUIRED_HEADERS.map((name) => [name, values[name].trim().length > 0])),
    referrerPolicy: values["referrer-policy"].trim() === "no-referrer",
    contentTypeOptions: values["x-content-type-options"].trim().toLowerCase() === "nosniff",
    noStore: /(?:^|,\s*)no-store(?:,|$)/iu.test(values["cache-control"]),
    strictTransportSecurity: values["strict-transport-security"].trim().length > 0,
  };
}

export async function checkStagingHttp({ url, fetchImpl = fetch } = {}) {
  const stagingUrl = parseStagingUrl(url);
  const codes = [];
  let rootResponse;
  try {
    rootResponse = await fetchImpl(stagingUrl, { redirect: "manual" });
  } catch {
    return Object.freeze({
      codes: Object.freeze([`${CODE_PREFIX}_REQUEST_FAILED`]),
      rootStatus: null,
      authStatus: null,
      redirectPath: null,
      headers: Object.freeze({}),
    });
  }

  const redirectPath = sameOriginPath(rootResponse.headers.get("location"), stagingUrl);
  if (rootResponse.status < 300 || rootResponse.status >= 400) {
    codes.push(`${CODE_PREFIX}_ROOT_REDIRECT_INVALID`);
  } else if (redirectPath !== "/auth") {
    codes.push(`${CODE_PREFIX}_AUTH_REDIRECT_INVALID`);
  }

  let authResponse = null;
  if (redirectPath === "/auth") {
    try {
      authResponse = await fetchImpl(new URL("/auth", stagingUrl), { redirect: "manual" });
    } catch {
      codes.push(`${CODE_PREFIX}_AUTH_REQUEST_FAILED`);
    }
  }
  if (authResponse && authResponse.status !== 200) {
    codes.push(`${CODE_PREFIX}_AUTH_STATUS_INVALID`);
  }

  const headers = authResponse ? headerChecks(authResponse.headers) : {};
  if (authResponse) {
    if (!headers.referrerPolicy) codes.push(`${CODE_PREFIX}_REFERRER_POLICY_INVALID`);
    if (!headers.contentTypeOptions) codes.push(`${CODE_PREFIX}_CONTENT_TYPE_OPTIONS_INVALID`);
    if (!headers.noStore) codes.push(`${CODE_PREFIX}_CACHE_CONTROL_INVALID`);
    if (!headers.strictTransportSecurity) codes.push(`${CODE_PREFIX}_HSTS_INVALID`);
    if (Object.values(headers.present).some((present) => !present)) {
      codes.push(`${CODE_PREFIX}_SECURITY_HEADER_MISSING`);
    }
  }

  return Object.freeze({
    codes: Object.freeze(codes.length === 0 ? [`${CODE_PREFIX}_VALID`] : [...codes].sort()),
    rootStatus: rootResponse.status,
    authStatus: authResponse?.status ?? null,
    redirectPath,
    headers: Object.freeze(headers),
  });
}

function parseArguments(args) {
  if (args.length !== 2 || args[0] !== "--url") fail(`${CODE_PREFIX}_ARGUMENT_INVALID`);
  return { url: args[1] };
}

const invokedPath = process.argv[1];
const invokedDirectly = typeof invokedPath === "string"
  && pathToFileURL(invokedPath).href === import.meta.url;

if (invokedDirectly) {
  try {
    const { url } = parseArguments(process.argv.slice(2));
    const result = await checkStagingHttp({ url });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.codes.length === 1 && result.codes[0] === `${CODE_PREFIX}_VALID` ? 0 : 1;
  } catch (error) {
    const code = error instanceof StagingHttpError ? error.code : `${CODE_PREFIX}_INTERNAL_ERROR`;
    process.stdout.write(`${JSON.stringify({ codes: [code] })}\n`);
    process.exitCode = 1;
  }
}
