import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get cookie options for production and development
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  
  return {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: "lax" as const, // Works with HTTPS in production
    maxAge: 60 * 60 * 24, // 24 hours in seconds
    path: "/",
    // Don't set domain - let browser handle it automatically
  };
}

/**
 * Set auth session cookie (for server components)
 */
export async function setAuthSessionCookie(sessionData: any) {
  const cookieStore = await cookies();
  cookieStore.set("auth-session", JSON.stringify(sessionData), getCookieOptions());
}

/**
 * Set auth session cookie in response (for middleware)
 */
export function setAuthSessionCookieInResponse(
  response: NextResponse,
  sessionData: any
) {
  response.cookies.set("auth-session", JSON.stringify(sessionData), getCookieOptions());
  return response;
}

/**
 * Delete auth session cookie (for server components)
 * Note: cookies().delete() only accepts the cookie name, not options
 */
export async function deleteAuthSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-session");
}

/**
 * Delete auth session cookie in response (for middleware)
 * Note: response.cookies.delete() only accepts the cookie name
 */
export function deleteAuthSessionCookieInResponse(response: NextResponse) {
  response.cookies.delete("auth-session");
  return response;
}
