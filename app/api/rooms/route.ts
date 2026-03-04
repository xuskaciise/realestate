import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Room from "@/lib/models/Room";
import House from "@/lib/models/House";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import mongoose from "mongoose";

const roomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  monthlyRent: z.number().positive("Monthly rent must be positive"),
  houseId: z.string().min(1, "House must be selected"),
  status: z.enum(["available", "rented"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const currentUser = getCurrentUserFromRequest(request);
    
    // Build query based on user type
    let houseQuery: any = {};
    if (currentUser && currentUser.type !== "Admin") {
      // Staff users can only see rooms in their own houses
      houseQuery.createdBy = new mongoose.Types.ObjectId(currentUser.id);
    }
    
    // Get houses first, then filter rooms
    const houses = await House.find(houseQuery).lean();
    const houseIds = houses.map(h => h._id.toString());
    
    // If Staff user has no houses, return empty array
    if (currentUser && currentUser.type !== "Admin" && houseIds.length === 0) {
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
        }
      });
    }
    
    const rooms = await Room.find(houseIds.length > 0 ? { houseId: { $in: houseIds } } : {}).sort({ createdAt: -1 }).lean();

    // Populate house for each room
    const roomsWithHouse = await Promise.all(
      rooms.map(async (room) => {
        const house = await House.findById(room.houseId).lean();
        return {
          ...room,
          house: house
            ? {
                ...house,
                id: house._id.toString(),
              }
            : null,
          id: room._id.toString(),
        };
      })
    );

    return NextResponse.json(roomsWithHouse, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = roomSchema.parse(body);

    await connectDB();
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify house exists
    const house = await House.findById(validated.houseId).lean();
    if (!house) {
      return NextResponse.json(
        { error: "House not found" },
        { status: 404 }
      );
    }

    // Staff users can only create rooms in their own houses
    if (currentUser.type !== "Admin") {
      const userId = new mongoose.Types.ObjectId(currentUser.id);
      if (!house.createdBy || !house.createdBy.equals(userId)) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    const room = new Room({
      name: validated.name,
      monthlyRent: validated.monthlyRent,
      houseId: validated.houseId,
      status: validated.status || "available",
    });

    const savedRoom = await room.save();

    return NextResponse.json(
      {
        ...savedRoom.toJSON(),
        house: {
          ...house,
          id: house._id.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating room:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create room";
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
