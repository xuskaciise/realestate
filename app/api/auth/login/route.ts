import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setAuthSessionCookie } from "@/lib/cookie-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find user by username (case-insensitive, trim whitespace)
    const trimmedUsername = username.trim();

    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: trimmedUsername,
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      console.error(`[LOGIN] User not found: "${trimmedUsername}"`);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    console.log(`[LOGIN] User found: ${user.username}, status: ${user.status}`);

    // Check if user is active
    if (user.status !== "Active") {
      return NextResponse.json(
        { error: "Your account is not active. Please contact administrator." },
        { status: 403 }
      );
    }

    // Verify password
    if (!user.password) {
      console.error(`[LOGIN] User ${user.username} has no password set`);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Trim password hash in case of whitespace issues
    const passwordHash = user.password.trim();
    const isPasswordValid = await bcrypt.compare(password.trim(), passwordHash);

    if (!isPasswordValid) {
      console.error(`[LOGIN] Password mismatch for user: ${user.username}`);
      console.error(`[LOGIN] Hash length: ${passwordHash.length}, starts with: ${passwordHash.substring(0, 10)}`);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    console.log(`[LOGIN] Successful login for user: ${user.username}`);

    // Create session data (without password)
    const sessionData = {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      type: user.type,
      status: user.status,
      profile: user.profile,
      timestamp: Date.now(), // Add timestamp for session expiration
    };

    // Set cookie with session data (24 hours = 86400 seconds)
    await setAuthSessionCookie(sessionData);

    return NextResponse.json({
      message: "Login successful",
      user: sessionData,
    });
  } catch (error) {
    console.error("Error during login:", error);

    // Prisma connection errors often include code like P1001.
    const errCode = (error as any)?.code;
    if (errCode === "P1001") {
      return NextResponse.json(
        {
          error:
            "Database connection failed. Check your Neon `DATABASE_URL` in `.env.local`.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to login. Please try again." },
      { status: 500 }
    );
  }
}
