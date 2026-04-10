import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: { house: true },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    // Staff users can only access rooms in their own houses
    if (currentUser.type !== "Admin") {
      if (!room.house.createdBy || room.house.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      ...room,
      house: room.house ?? null,
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingRoom = await prisma.room.findUnique({
      where: { id: params.id },
      include: { house: true },
    });

    if (!existingRoom) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const existingHouse = existingRoom.house;
    if (!existingHouse) {
      return NextResponse.json(
        { error: "House not found" },
        { status: 404 }
      );
    }

    // Staff users can only update rooms in their own houses
    if (currentUser.type !== "Admin") {
      if (!existingHouse.createdBy || existingHouse.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Also check if the new houseId (if changed) belongs to the user
    if (validated.houseId !== existingRoom.houseId) {
      const newHouse = await prisma.house.findUnique({
        where: { id: validated.houseId },
      });
      if (!newHouse) {
        return NextResponse.json(
          { error: "House not found" },
          { status: 404 }
        );
      }

      if (currentUser.type !== "Admin") {
        if (!newHouse.createdBy || newHouse.createdBy !== currentUser.id) {
          return NextResponse.json(
            { error: "Access denied" },
            { status: 403 }
          );
        }
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id: params.id },
      data: {
        name: validated.name,
        monthlyRent: validated.monthlyRent,
        houseId: validated.houseId,
        status: validated.status ?? "available",
      },
      include: { house: true },
    });

    return NextResponse.json(updatedRoom);
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingRoom = await prisma.room.findUnique({
      where: { id: params.id },
      include: { house: true },
    });

    if (!existingRoom) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const house = existingRoom.house;
    if (!house) {
      return NextResponse.json({ error: "House not found" }, { status: 404 });
    }

    // Staff users can only delete rooms in their own houses
    if (currentUser.type !== "Admin") {
      if (!house.createdBy || house.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    await prisma.room.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
