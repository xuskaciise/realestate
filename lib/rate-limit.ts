import type { NextRequest } from "next/server";

const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX = 20;

const buckets = new Map<string, number[]>();

function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.ip || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Simple in-memory sliding-window limiter for Edge middleware.
 * Suitable for a single Node/Edge instance (typical single VPS). For horizontal scale, use Redis (e.g. Upstash).
 */
export function rateLimitLogin(request: NextRequest): boolean {
  if (request.method !== "POST") {
    return true;
  }
  const key = getClientKey(request);
  const now = Date.now();
  const windowStart = now - LOGIN_WINDOW_MS;
  let stamps = buckets.get(key)?.filter((t) => t > windowStart) ?? [];
  if (stamps.length >= LOGIN_MAX) {
    buckets.set(key, stamps);
    return false;
  }
  stamps = [...stamps, now];
  buckets.set(key, stamps);
  if (buckets.size > 10_000) {
    for (const [k, times] of buckets) {
      if (times.every((t) => t <= windowStart)) {
        buckets.delete(k);
      }
    }
  }
  return true;
}
