import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Room from "@/lib/models/Room";
import House from "@/lib/models/House";
import { z } from "zod";

const roomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  monthlyRent: z.number().positive("Monthly rent must be positive"),
  houseId: z.string().min(1, "Invalid house ID"),
  status: z.enum(["available", "rented"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const room = await Room.findById(params.id).lean();

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const house = await House.findById(room.houseId).lean();

    return NextResponse.json({
      ...room,
      house: house
        ? {
            ...house,
            id: house._id.toString(),
          }
        : null,
      id: room._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
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
    const validated = roomSchema.parse(body);

    await connectDB();

    const room = await Room.findByIdAndUpdate(
      params.id,
      {
        name: validated.name,
        monthlyRent: validated.monthlyRent,
        houseId: validated.houseId,
        status: validated.status || "available",
      },
      { new: true, runValidators: true }
    ).lean();

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const house = await House.findById(validated.houseId).lean();

    return NextResponse.json({
      ...room,
      house: house
        ? {
            ...house,
            id: house._id.toString(),
          }
        : null,
      id: room._id.toString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating room:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update room";
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
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

    const room = await Room.findByIdAndDelete(params.id);

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
