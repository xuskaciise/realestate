import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setAuthSessionCookie, deleteAuthSessionCookie } from "@/lib/cookie-utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auth-session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const cookieValue = sessionCookie.value.trim();
    if (!cookieValue) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(cookieValue);
    
    // Check if session has expired (24 hours = 86400000 ms)
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = Date.now();
    const sessionAge = sessionData.timestamp ? now - sessionData.timestamp : SESSION_TIMEOUT + 1;
    
    if (sessionData.timestamp && sessionAge > SESSION_TIMEOUT) {
      // Session expired - delete cookie and return error
      await deleteAuthSessionCookie();
      return NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

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
