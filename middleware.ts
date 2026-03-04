import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCookieOptions, setAuthSessionCookieInResponse, deleteAuthSessionCookieInResponse } from "@/lib/cookie-utils";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing admin routes
  if (pathname.startsWith("/admin")) {
    const authCookie = request.cookies.get("auth-session");

    // If no auth cookie, redirect to login
    if (!authCookie || !authCookie.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify cookie is valid JSON and not expired
    try {
      const cookieValue = authCookie.value.trim();
      if (!cookieValue) {
        throw new Error("Empty cookie value");
      }
      const sessionData = JSON.parse(cookieValue);
      
      // Check if session has expired (24 hours = 86400000 ms)
      const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const now = Date.now();
      const sessionAge = sessionData.timestamp ? now - sessionData.timestamp : SESSION_TIMEOUT + 1;
      
      if (sessionData.timestamp && sessionAge > SESSION_TIMEOUT) {
        // Session expired, redirect to login
        const loginUrl = new URL("/login", request.url);
        const response = NextResponse.redirect(loginUrl);
        return deleteAuthSessionCookieInResponse(response);
      }
      
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
    const authCookie = request.cookies.get("auth-session");
    if (authCookie && authCookie.value) {
      try {
        const cookieValue = authCookie.value.trim();
        if (cookieValue) {
          JSON.parse(cookieValue);
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch {
        // Invalid cookie, allow access to login
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
