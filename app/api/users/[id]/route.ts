import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/lib/models/User";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateUserSchema = z.object({
  fullname: z.string().min(1, "Full name is required").optional(),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  type: z.string().min(1, "User type is required").optional(),
  status: z.string().min(1, "Status is required").optional(),
  profile: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await User.findById(params.id).select("-password").lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...user,
      id: user._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    await connectDB();

    // Check if user exists
    const existingUser = await User.findById(params.id);

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if username is being changed and if it already exists
    if (validated.username && validated.username !== existingUser.username) {
      const usernameExists = await User.findOne({ username: validated.username });

      if (usernameExists) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (validated.fullname) updateData.fullname = validated.fullname;
    if (validated.username) updateData.username = validated.username;
    if (validated.type) updateData.type = validated.type;
    if (validated.status) updateData.status = validated.status;
    if (validated.profile !== undefined) updateData.profile = validated.profile || null;

    // Hash password if provided
    if (validated.password) {
      updateData.password = await bcrypt.hash(validated.password, 10);
    }

    const user = await User.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password").lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...user,
      id: user._id.toString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await User.findByIdAndDelete(params.id);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
