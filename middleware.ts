import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_SESSION_COOKIE_NAME,
  deleteAuthSessionCookieInResponse,
  isSessionExpired,
  parseSessionCookieValue,
  setAuthSessionCookieInResponse,
} from "@/lib/cookie-utils";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing admin routes
  if (pathname.startsWith("/admin")) {
    const authCookie = request.cookies.get(AUTH_SESSION_COOKIE_NAME);

    // If no auth cookie, redirect to login
    if (!authCookie || !authCookie.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify cookie is valid JSON and not expired
    try {
      const sessionData = parseSessionCookieValue(authCookie.value);
      if (!sessionData || isSessionExpired(sessionData)) {
        // Session expired, redirect to login
        const loginUrl = new URL("/login", request.url);
        const response = NextResponse.redirect(loginUrl);
        return deleteAuthSessionCookieInResponse(response);
      }

      const now = Date.now();
      // Update session timestamp on each request (sliding expiration)
      // This extends the session as long as the user is active
      const updatedSessionData = {
        ...sessionData,
        timestamp: now, // Use the same timestamp for consistency
      };
      
      const response = NextResponse.next();
      return setAuthSessionCookieInResponse(response, updatedSessionData);
    } catch (error) {
      // Invalid cookie, redirect to login
      console.error("Middleware cookie error:", error);
      const loginUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      return deleteAuthSessionCookieInResponse(response);
    }
  }

  // If accessing login page and already authenticated, redirect to admin
  if (pathname === "/login") {
    const authCookie = request.cookies.get(AUTH_SESSION_COOKIE_NAME);
    if (authCookie && authCookie.value) {
      const sessionData = parseSessionCookieValue(authCookie.value);
      if (sessionData && !isSessionExpired(sessionData)) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
