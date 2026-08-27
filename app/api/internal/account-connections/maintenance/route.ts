import { errorResponse, noStoreJson } from "../../../../../lib/api/http";
import { maintenanceRequestAuthorized, runAccountConnectionsMaintenance } from "../../../../../lib/connections/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!maintenanceRequestAuthorized(request.headers.get("authorization"))) {
      return noStoreJson({ error: "MAINTENANCE_AUTHORIZATION_REQUIRED" }, { status: 401 });
    }
    const result = await runAccountConnectionsMaintenance();
    console.info(JSON.stringify({ event: "account_connections.maintenance", ...result }));
    return noStoreJson({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
