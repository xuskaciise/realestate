import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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
    if (sessionData.timestamp && Date.now() - sessionData.timestamp > SESSION_TIMEOUT) {
      // Session expired
      return NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    // Update session timestamp (sliding expiration)
    const updatedSessionData = {
      ...sessionData,
      timestamp: Date.now(),
    };

    // Update cookie with new timestamp (reuse existing cookieStore)
    cookieStore.set("auth-session", JSON.stringify(updatedSessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

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
