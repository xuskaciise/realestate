import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

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

    await connectDB();

    // Find user by username (case-insensitive, trim whitespace)
    const trimmedUsername = username.trim();
    
    // Try exact match first (faster)
    let user = await User.findOne({ username: trimmedUsername }).lean();
    
    // If not found, try case-insensitive search using regex
    if (!user) {
      user = await User.findOne({ 
        username: { $regex: `^${trimmedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
      }).lean();
    }

    if (!user) {
      console.error(`[LOGIN] User not found: "${trimmedUsername}"`);
      // Also try exact match for debugging
      const exactUser = await User.findOne({ username: trimmedUsername }).lean();
      if (exactUser) {
        console.error(`[LOGIN] User exists with exact case: "${exactUser.username}"`);
      }
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
    const { password: _, ...userWithoutPassword } = user;
    const sessionData = {
      id: user._id.toString(),
      username: user.username,
      fullname: user.fullname,
      type: user.type,
      status: user.status,
      profile: user.profile,
    };

    // Set cookie with session data
    const cookieStore = await cookies();
    cookieStore.set("auth-session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      message: "Login successful",
      user: sessionData,
    });
  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json(
      { error: "Failed to login. Please try again." },
      { status: 500 }
    );
  }
}
