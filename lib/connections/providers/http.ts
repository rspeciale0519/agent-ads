import { ProviderAdapterError } from "./provider-adapter";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

export function safeProviderUrl(value: string, hosts: readonly string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !hosts.includes(url.hostname)) throw new ProviderAdapterError("PROVIDER_REDIRECT_BLOCKED");
    return url;
  } catch (error) {
    if (error instanceof ProviderAdapterError) throw error;
    throw new ProviderAdapterError("PROVIDER_REDIRECT_BLOCKED");
  }
}

export function configuredRedirectUri(value: string | undefined, missingCode: string) {
  if (!value) throw new ProviderAdapterError(missingCode);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("invalid redirect URI");
    return url.toString();
  } catch {
    throw new ProviderAdapterError(`${missingCode}_INVALID`);
  }
}

export async function requestJson(url: string, init: RequestInit, failureCode: string, hosts: readonly string[]) {
  safeProviderUrl(url, hosts);
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new ProviderAdapterError(`${failureCode}_UNAVAILABLE`);
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new ProviderAdapterError(`${failureCode}_UNAUTHORIZED`);
    if (response.status === 429) throw new ProviderAdapterError(`${failureCode}_RATE_LIMITED`);
    throw new ProviderAdapterError(`${failureCode}_FAILED`);
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_RESPONSE_BYTES) throw new ProviderAdapterError(`${failureCode}_RESPONSE_TOO_LARGE`);
  try {
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_RESPONSE_BYTES) throw new ProviderAdapterError(`${failureCode}_RESPONSE_TOO_LARGE`);
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch (error) {
    if (error instanceof ProviderAdapterError) throw error;
    throw new ProviderAdapterError(`${failureCode}_INVALID_RESPONSE`);
  }
}

export function nextPageUrl(payload: unknown, hosts: readonly string[]) {
  if (!isJsonObject(payload) || !isJsonObject(payload.paging)) return undefined;
  const next = stringValue(payload.paging.next);
  return next ? safeProviderUrl(next, hosts).toString() : undefined;
}

export function parseLatency(startedAt: number) {
  return Math.max(0, Date.now() - startedAt);
}
