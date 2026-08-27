import { contextOrResponse, errorResponse, noStoreJson, uuidPathParam } from "../../../../../lib/api/http";
import { getConnectionDetail } from "../../../../../lib/connections/service";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    return noStoreJson({ connection: await getConnectionDetail(context, id) });
  } catch (error) {
    return errorResponse(error);
  }
}
