import { contextOrResponse, errorResponse, noStoreJson } from "../../../../lib/api/http";
import { listConnections } from "../../../../lib/connections/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    return noStoreJson({ connections: await listConnections(context) });
  } catch (error) {
    return errorResponse(error);
  }
}
