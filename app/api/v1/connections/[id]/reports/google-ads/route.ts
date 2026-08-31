import { z } from "zod";
import { contextOrResponse, errorResponse, noStoreJson, uuidPathParam } from "../../../../../../../lib/api/http";
import { readGoogleAdsCampaignReport } from "../../../../../../../lib/connections/service";

export const runtime = "nodejs";

const reportQuerySchema = z.object({
  customerId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await contextOrResponse();
    if (context instanceof Response) return context;
    const { id: rawId } = await params;
    const id = uuidPathParam(rawId);
    const query = reportQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!query.success) return noStoreJson({ error: "VALIDATION_FAILED" }, { status: 400 });
    return noStoreJson({ report: await readGoogleAdsCampaignReport(context, id, query.data) });
  } catch (error) {
    return errorResponse(error);
  }
}
