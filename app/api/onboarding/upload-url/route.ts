import { uploadRequestSchema } from "../../../../lib/onboarding-schema";
import { errorResponse, noStoreJson, requireSameOrigin } from "../../../../lib/api/http";
import { getStorageBucket, getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { enforceRateLimit } from "../../../../lib/api/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch (error) { return errorResponse(error); }
  const body = await request.json().catch(() => null);
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: "Check the file name, type, and size." }, { status: 400 });

  const authClient = await getSupabaseServer();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return noStoreJson({ error: "Sign in to upload business files." }, { status: 401 });
  try { await enforceRateLimit(`onboarding-upload:${user.id}`, 30, 60 * 60_000); } catch (error) { return errorResponse(error); }

  const { submissionId, attachmentId, fileName, contentType } = parsed.data;
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  const storagePath = `onboarding/${user.id}/${submissionId}/${attachmentId}-${safeName}`;
  try {
    const supabase = getSupabaseAdmin();
    const bucket = getStorageBucket();
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(storagePath);
    if (error || !data?.token) {
      console.error("Unable to create Supabase upload URL", error);
      return noStoreJson({ error: "We could not prepare that upload. Try again." }, { status: 502 });
    }
    return noStoreJson({ bucket, path: storagePath, token: data.token, contentType });
  } catch (error) {
    console.error("Supabase upload configuration error", error);
    return noStoreJson({ error: "File uploads are not configured yet." }, { status: 503 });
  }
}
