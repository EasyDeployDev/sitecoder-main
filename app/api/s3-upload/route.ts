import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createPresignedUpload } from "@/lib/s3-upload-server";

export const dynamic = "force-dynamic";

// Auth-guarded presigned POST for S3 uploads. The client (next-s3-upload)
// still calls /api/s3-upload, but now we verify the user is signed in,
// validate file type and size, and generate a short-lived presigned URL
// server-side instead of exposing credentials or an unguarded endpoint.
export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const body = (await request.json()) as {
      filename?: string;
      contentType?: string;
      size?: number;
    };

    const upload = await createPresignedUpload({
      filename: body.filename || "",
      contentType: body.contentType || "",
      size: body.size || 0,
    });

    return NextResponse.json(upload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload denied.";
    const status = message.includes("not configured")
      ? 503
      : message.toLowerCase().includes("unauthorized") ||
          message.toLowerCase().includes("signed in")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
