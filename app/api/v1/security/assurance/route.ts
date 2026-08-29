import { getAssuranceStatus } from "../../../../../lib/auth/assurance";
import { contextOrResponse, errorResponse, noStoreJson } from "../../../../../lib/api/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    return noStoreJson({ assurance: await getAssuranceStatus(context) });
  } catch (error) {
    return errorResponse(error);
  }
}
