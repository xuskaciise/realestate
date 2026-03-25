import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const AUTH_SESSION_COOKIE_NAME = "auth-session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const SESSION_TIMEOUT_MS = SESSION_MAX_AGE_SECONDS * 1000;

function getSameSitePolicy(): "lax" | "strict" {
  const raw = (process.env.SESSION_COOKIE_SAME_SITE || "lax").toLowerCase();
  return raw === "strict" ? "strict" : "lax";
}

/**
 * Get cookie options for production and development
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  return {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: getSameSitePolicy(),
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires,
    path: "/",
    // Don't set domain - let browser handle it automatically
  };
}

export function serializeSessionData(sessionData: unknown): string {
  return encodeURIComponent(JSON.stringify(sessionData));
}

export function parseSessionCookieValue(cookieValue: string): any | null {
  try {
    if (!cookieValue || !cookieValue.trim()) {
      return null;
    }
    const decoded = decodeURIComponent(cookieValue.trim());
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isSessionExpired(sessionData: any): boolean {
  const timestamp = Number(sessionData?.timestamp);
  if (!Number.isFinite(timestamp)) {
    return true;
  }
  return Date.now() - timestamp > SESSION_TIMEOUT_MS;
}

/**
 * Set auth session cookie (for server components)
 */
export async function setAuthSessionCookie(sessionData: any) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE_NAME, serializeSessionData(sessionData), getCookieOptions());
}

/**
 * Set auth session cookie in response (for middleware)
 */
export function setAuthSessionCookieInResponse(
  response: NextResponse,
  sessionData: any
) {
  response.cookies.set(AUTH_SESSION_COOKIE_NAME, serializeSessionData(sessionData), getCookieOptions());
  return response;
}

/**
 * Delete auth session cookie (for server components)
 * Note: cookies().delete() only accepts the cookie name, not options
 */
export async function deleteAuthSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE_NAME);
}

/**
 * Delete auth session cookie in response (for middleware)
 * Note: response.cookies.delete() only accepts the cookie name
 */
export function deleteAuthSessionCookieInResponse(response: NextResponse) {
  response.cookies.delete(AUTH_SESSION_COOKIE_NAME);
  return response;
}
