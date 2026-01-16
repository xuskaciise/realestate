import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        fullname: true,
        username: true,
        type: true,
        status: true,
        profile: true,
        createdAt: true,
        updatedAt: true,
        // Don't return password
      },
    });
    return NextResponse.json(users);
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

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: validated.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        fullname: validated.fullname,
        username: validated.username,
        password: hashedPassword,
        type: validated.type,
        status: validated.status,
        profile: validated.profile || null,
      },
      select: {
        id: true,
        fullname: true,
        username: true,
        type: true,
        status: true,
        profile: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
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
