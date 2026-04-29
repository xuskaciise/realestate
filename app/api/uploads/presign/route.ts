import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

import { createMinioS3Client, getMinioConfig } from "@/lib/minio";

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/[^\w.\-()+\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 140);
}

type PresignRequest = {
  folder: "users" | "tenants" | "rents";
  filename: string;
  contentType: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as PresignRequest | null;
  if (!body?.folder || !body?.filename || !body?.contentType) {
    return NextResponse.json(
      { error: "folder, filename, and contentType are required" },
      { status: 400 }
    );
  }

  const allowedFolders = new Set(["users", "tenants", "rents"]);
  if (!allowedFolders.has(body.folder)) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }

  if (body.folder === "rents" && body.contentType !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF is allowed for rents" }, { status: 400 });
  }
  if (body.folder !== "rents" && !body.contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
  }

  const cfg = getMinioConfig();
  const s3 = createMinioS3Client();

  const safeName = sanitizeFilename(body.filename) || "file";
  const key = `${body.folder}/${uuidv4()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: body.contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
  const publicUrl = `${cfg.publicBaseUrl}/${key}`;

  // Return both: key is for private buckets, publicUrl is optional for public buckets.
  return NextResponse.json({ uploadUrl, key, publicUrl });
}

