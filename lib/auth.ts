import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export interface SessionUser {
  id: string;
  username: string;
  fullname: string;
  type: string;
  status: string;
  profile?: string | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auth-session");

    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const cookieValue = sessionCookie.value.trim();
    if (!cookieValue) {
      return null;
    }

    const sessionData = JSON.parse(cookieValue);
    
    // Check if session has expired (24 hours = 86400000 ms)
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (sessionData.timestamp && Date.now() - sessionData.timestamp > SESSION_TIMEOUT) {
      return null;
    }

    const { timestamp, ...user } = sessionData;
    return user as SessionUser;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export function getCurrentUserFromRequest(request: NextRequest): SessionUser | null {
  try {
    const authCookie = request.cookies.get("auth-session");

    if (!authCookie || !authCookie.value) {
      return null;
    }

    const cookieValue = authCookie.value.trim();
    if (!cookieValue) {
      return null;
    }

    const sessionData = JSON.parse(cookieValue);
    
    // Check if session has expired (24 hours = 86400000 ms)
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (sessionData.timestamp && Date.now() - sessionData.timestamp > SESSION_TIMEOUT) {
      return null;
    }

    const { timestamp, ...user } = sessionData;
    return user as SessionUser;
  } catch (error) {
    console.error("Error getting current user from request:", error);
    return null;
  }
}
