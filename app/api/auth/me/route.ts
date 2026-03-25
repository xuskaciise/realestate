import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_SESSION_COOKIE_NAME,
  deleteAuthSessionCookie,
  isSessionExpired,
  parseSessionCookieValue,
  setAuthSessionCookie,
} from "@/lib/cookie-utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const sessionData = parseSessionCookieValue(sessionCookie.value);
    if (!sessionData || isSessionExpired(sessionData)) {
      // Session expired - delete cookie and return error
      await deleteAuthSessionCookie();
      return NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    const now = Date.now();
    // Update session timestamp (sliding expiration)
    const updatedSessionData = {
      ...sessionData,
      timestamp: now, // Use the same timestamp for consistency
    };

    // Update cookie with new timestamp
    await setAuthSessionCookie(updatedSessionData);

    const { timestamp, ...user } = updatedSessionData;
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error checking auth:", error);
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }
}
