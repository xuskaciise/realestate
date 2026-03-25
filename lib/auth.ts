import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  AUTH_SESSION_COOKIE_NAME,
  isSessionExpired,
  parseSessionCookieValue,
} from "@/lib/cookie-utils";

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
    const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const sessionData = parseSessionCookieValue(sessionCookie.value);
    if (!sessionData || isSessionExpired(sessionData)) {
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
    const authCookie = request.cookies.get(AUTH_SESSION_COOKIE_NAME);

    if (!authCookie || !authCookie.value) {
      return null;
    }

    const sessionData = parseSessionCookieValue(authCookie.value);
    if (!sessionData || isSessionExpired(sessionData)) {
      return null;
    }

    const { timestamp, ...user } = sessionData;
    return user as SessionUser;
  } catch (error) {
    console.error("Error getting current user from request:", error);
    return null;
  }
}
