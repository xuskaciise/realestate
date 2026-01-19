import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/lib/models/User";
import { z } from "zod";
import bcrypt from "bcryptjs";

const userSchema = z.object({
  fullname: z.string().min(1, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  type: z.string().min(1, "User type is required"),
  status: z.string().min(1, "Status is required"),
  profile: z.string().optional(),
});

export async function GET() {
  try {
    await connectDB();
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(users.map(u => ({ ...u, id: u._id.toString() })), {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = userSchema.parse(body);

    await connectDB();

    // Check if username already exists
    const existingUser = await User.findOne({ username: validated.username });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    const user = new User({
      fullname: validated.fullname,
      username: validated.username,
      password: hashedPassword,
      type: validated.type,
      status: validated.status,
      profile: validated.profile || null,
    });

    const savedUser = await user.save();
    const userJson = savedUser.toJSON();
    const { password, ...userWithoutPassword } = userJson;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
