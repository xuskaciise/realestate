"use client";

const cache = new Map<string, { url: string; expiresAt: number }>();

export function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export async function getSignedGetUrl(key: string): Promise<string> {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now + 10_000) return existing.url;

  const res = await fetch("/api/uploads/sign-get", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to sign url");
  }

  const data = (await res.json()) as { signedUrl: string };
  // Server signs for 5 min; cache for 4 min to stay safe.
  cache.set(key, { url: data.signedUrl, expiresAt: now + 240_000 });
  return data.signedUrl;
}

