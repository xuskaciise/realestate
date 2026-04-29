import { S3Client } from "@aws-sdk/client-s3";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizeEndpoint(endpoint: string): { url: string; hostname: string } {
  const withScheme = endpoint.startsWith("http://") || endpoint.startsWith("https://")
    ? endpoint
    : `http://${endpoint}`;
  const u = new URL(withScheme);
  return { url: u.origin, hostname: u.hostname };
}

function normalizePublicBaseUrl(raw: string, bucket: string): string {
  const withScheme = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
  const u = new URL(withScheme);

  // If someone pasted the MinIO Console URL (/:9001/browser/...), convert to the object endpoint.
  if (u.pathname.startsWith("/browser")) {
    u.pathname = `/${bucket}`;
  }

  // Console is commonly on 9001; S3 API is commonly on 9000.
  if (u.port === "9001") {
    u.port = "9000";
  }

  return u.toString().replace(/\/$/, "");
}

export function getMinioConfig() {
  const bucket = requiredEnv("MINIO_BUCKET");
  const endpointRaw = requiredEnv("MINIO_ENDPOINT");
  const port = process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 9000;

  const { url: endpointBase } = normalizeEndpoint(endpointRaw);
  const endpoint = `${endpointBase.replace(/\/$/, "")}:${port}`;

  const region = process.env.MINIO_REGION || "us-east-1";
  const accessKeyId = requiredEnv("MINIO_ACCESS_KEY");
  const secretAccessKey = requiredEnv("MINIO_SECRET_KEY");

  const publicBaseUrl = process.env.MINIO_PUBLIC_BASE_URL
    ? normalizePublicBaseUrl(process.env.MINIO_PUBLIC_BASE_URL, bucket)
    : `${endpoint}/${bucket}`;

  return {
    bucket,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
  };
}

export function createMinioS3Client() {
  const cfg = getMinioConfig();
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

