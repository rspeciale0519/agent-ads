import { NextResponse } from "next/server";
import { uploadRequestSchema } from "../../../../lib/onboarding-schema";
import { getStorageBucket, getSupabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the file name, type, and size." }, { status: 400 });

  const { submissionId, fileName, contentType } = parsed.data;
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  const storagePath = `onboarding/${submissionId}/${crypto.randomUUID()}-${safeName}`;
  try {
    const supabase = getSupabaseAdmin();
    const bucket = getStorageBucket();
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(storagePath);
    if (error || !data?.token) {
      console.error("Unable to create Supabase upload URL", error);
      return NextResponse.json({ error: "We could not prepare that upload. Try again." }, { status: 502 });
    }
    return NextResponse.json({ bucket, path: storagePath, token: data.token, contentType }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Supabase upload configuration error", error);
    return NextResponse.json({ error: "File uploads are not configured yet." }, { status: 503 });
  }
}
