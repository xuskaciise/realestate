import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

    // Verify cookie is valid JSON
    try {
      const cookieValue = authCookie.value.trim();
      if (!cookieValue) {
        throw new Error("Empty cookie value");
      }
      JSON.parse(cookieValue);
    } catch (error) {
      // Invalid cookie, redirect to login
      const loginUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("auth-session");
      return response;
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
