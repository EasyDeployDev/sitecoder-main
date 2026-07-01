import { kvRemember } from "@/lib/kv-cache";

type S3UploadConfig = {
  bucket?: string;
  region?: string;
  hasCredentials: boolean;
};

export async function getCachedS3UploadConfig(): Promise<S3UploadConfig> {
  return kvRemember(
    "s3:upload-config",
    {
      ttlMs: 10 * 60 * 1000,
      tags: ["s3", "s3:upload-config"],
    },
    async () => ({
      bucket: process.env.S3_UPLOAD_BUCKET,
      region: process.env.S3_UPLOAD_REGION,
      hasCredentials: Boolean(
        process.env.S3_UPLOAD_KEY && process.env.S3_UPLOAD_SECRET,
      ),
    }),
  );
}
