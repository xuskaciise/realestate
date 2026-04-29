import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { createMinioS3Client, getMinioConfig } from "@/lib/minio";

type SignGetRequest = {
  key: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SignGetRequest | null;
  const key = body?.key?.trim();
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  // Basic safety: prevent weird absolute URLs etc.
  if (key.startsWith("http://") || key.startsWith("https://") || key.includes("..")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const cfg = getMinioConfig();
  const s3 = createMinioS3Client();

  const command = new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return NextResponse.json({ signedUrl });
}

