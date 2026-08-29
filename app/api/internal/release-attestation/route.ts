import { noStoreJson } from "../../../../lib/api/http";
import { createReleaseAttestation } from "../../../../lib/release-attestation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return noStoreJson(createReleaseAttestation());
  } catch {
    return noStoreJson(
      { error: "RELEASE_ATTESTATION_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
