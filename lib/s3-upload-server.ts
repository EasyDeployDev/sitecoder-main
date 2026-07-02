import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "crypto";

export type PresignedUpload = {
  url: string;
  fields: Record<string, string>;
  key: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function isAllowedUploadType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.includes(contentType);
}

export function validateUploadRequest(input: {
  filename: string;
  contentType: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  if (!input.filename || !input.contentType) {
    return { ok: false, error: "Filename and content type are required." };
  }
  if (!isAllowedUploadType(input.contentType)) {
    return { ok: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed." };
  }
  if (input.size > MAX_FILE_SIZE) {
    return { ok: false, error: "File exceeds 5 MB limit." };
  }
  return { ok: true };
}

function getS3Client(): S3Client {
  const region = process.env.S3_UPLOAD_REGION;
  const endpoint = process.env.S3_UPLOAD_ENDPOINT;
  const accessKeyId = process.env.S3_UPLOAD_KEY;
  const secretAccessKey = process.env.S3_UPLOAD_SECRET;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 upload credentials are not configured.");
  }

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: Boolean(endpoint),
  });
}

export async function createPresignedUpload(input: {
  filename: string;
  contentType: string;
  size: number;
}): Promise<PresignedUpload> {
  const validation = validateUploadRequest(input);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const bucket = process.env.S3_UPLOAD_BUCKET;
  if (!bucket) {
    throw new Error("S3_UPLOAD_BUCKET is not configured.");
  }

  const ext = input.filename.split(".").pop() || "bin";
  const key = `uploads/${randomUUID()}.${ext}`;

  const client = getS3Client();
  const { url, fields } = await createPresignedPost(client, {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 0, MAX_FILE_SIZE],
      ["eq", "$Content-Type", input.contentType],
    ],
    Fields: {
      "Content-Type": input.contentType,
    },
    Expires: 300, // 5 minutes
  });

  return { url, fields, key };
}
