import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import House from "@/lib/models/House";
import Room from "@/lib/models/Room";
import { z } from "zod";

const houseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const house = await House.findById(params.id).lean();

    if (!house) {
      return NextResponse.json(
        { error: "House not found" },
        { status: 404 }
      );
    }

    const rooms = await Room.find({ houseId: params.id }).lean();

    return NextResponse.json({
      ...house,
      rooms: rooms.map((room) => ({
        ...room,
        id: room._id.toString(),
      })),
      id: house._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching house:", error);
    return NextResponse.json(
      { error: "Failed to fetch house" },
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
    const validated = houseSchema.parse(body);

    await connectDB();

    const house = await House.findByIdAndUpdate(
      params.id,
      {
        ...validated,
        description: validated.description || null,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!house) {
      return NextResponse.json(
        { error: "House not found" },
        { status: 404 }
      );
    }

    const rooms = await Room.find({ houseId: params.id }).lean();

    return NextResponse.json({
      ...house,
      rooms: rooms.map((room) => ({
        ...room,
        id: room._id.toString(),
      })),
      id: house._id.toString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating house:", error);
    return NextResponse.json(
      { error: "Failed to update house" },
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

    // Delete associated rooms first
    await Room.deleteMany({ houseId: params.id });

    // Delete the house
    const house = await House.findByIdAndDelete(params.id);

    if (!house) {
      return NextResponse.json(
        { error: "House not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "House deleted successfully" });
  } catch (error) {
    console.error("Error deleting house:", error);
    return NextResponse.json(
      { error: "Failed to delete house" },
      { status: 500 }
    );
  }
}
