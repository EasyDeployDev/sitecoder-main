import { getCachedS3UploadConfig } from "@/lib/s3-cache";
import type { NextRequest } from "next/server";
import { POST as uploadPost } from "next-s3-upload/route";

export async function POST(request: NextRequest) {
  await getCachedS3UploadConfig();
  return uploadPost(request);
}
