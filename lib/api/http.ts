import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrganizationAccessError, type OrganizationContext, requireOrganizationContext } from "../auth/organization-context";
import { ConnectionServiceError } from "../connections/service";
import { InvitationError } from "../organizations/invitations";
import { RateLimitConfigurationError, RateLimitError } from "./rate-limit";
import { mutationMetadata } from "./idempotency";

export function noStoreJson<T>(body: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  return noStoreResponse(NextResponse.json(body, { ...init, headers }));
}

export function noStoreResponse<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export function correlationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id");
  return supplied && /^[a-zA-Z0-9._:-]{1,120}$/.test(supplied) ? supplied : crypto.randomUUID();
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError("CSRF_ORIGIN_MISMATCH", 403);
  if (fetchSite === "cross-site" || (!origin && !fetchSite && !["GET", "HEAD", "OPTIONS"].includes(request.method))) throw new HttpError("CSRF_ORIGIN_MISMATCH", 403);
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) mutationMetadata(request);
}

export function uuidPathParam(value: string) {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new HttpError("VALIDATION_FAILED", 400);
  return parsed.data;
}

export async function contextOrResponse(requestedOrganizationId?: string): Promise<OrganizationContext | NextResponse> {
  try {
    return await requireOrganizationContext(requestedOrganizationId);
  } catch (error) {
    if (isOrganizationAccessError(error)) {
      const status = error.code === "AUTHENTICATION_REQUIRED" ? 401 : error.code === "ORGANIZATION_ACCESS_PENDING" ? 403 : 409;
      return noStoreJson({ error: error.code }, { status });
    }
    throw error;
  }
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(code: string, status = 400) {
    super(code);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
  if (error instanceof HttpError) return noStoreJson({ error: error.code }, { status: error.status });
  if (error instanceof ConnectionServiceError) return noStoreJson({ error: error.code }, { status: error.status });
  if (error instanceof InvitationError) return noStoreJson({ error: error.code }, { status: error.status });
  if (error instanceof RateLimitError) return noStoreJson({ error: error.code }, { status: error.status, headers: { "Retry-After": String(error.retryAfterSeconds) } });
  if (error instanceof RateLimitConfigurationError) return noStoreJson({ error: error.code }, { status: error.status });
  if (error instanceof Error && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code)) {
    const declaredStatus = "status" in error && typeof error.status === "number" && error.status >= 400 && error.status <= 599 ? error.status : undefined;
    return noStoreJson({ error: error.code }, { status: declaredStatus ?? (error.code.includes("REQUIRED") || error.code.includes("DENIED") ? 403 : 400) });
  }
  if (isOrganizationAccessError(error)) return noStoreJson({ error: error.code }, { status: 403 });
  return noStoreJson({ error: "REQUEST_FAILED" }, { status: 500 });
}
