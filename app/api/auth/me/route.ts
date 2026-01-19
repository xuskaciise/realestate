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
    
    // Check if session has expired (30 minutes = 1800000 ms)
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
    if (sessionData.timestamp && Date.now() - sessionData.timestamp > SESSION_TIMEOUT) {
      // Session expired
      return NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
    }

    const { timestamp, ...user } = sessionData;
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error checking auth:", error);
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }
}
