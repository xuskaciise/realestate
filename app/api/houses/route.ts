import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import House from "@/lib/models/House";
import Room from "@/lib/models/Room";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import mongoose from "mongoose";

const houseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const currentUser = getCurrentUserFromRequest(request);
    
    console.log("Fetching houses - Current user:", currentUser ? { id: currentUser.id, type: currentUser.type } : "null");
    
    // Build query based on user type
    let query: any = {};
    if (currentUser && currentUser.type !== "Admin") {
      // Staff users can only see their own houses
      query.createdBy = new mongoose.Types.ObjectId(currentUser.id);
    }

    const houses = await House.find(query).sort({ createdAt: -1 }).lean();

    // Populate rooms for each house
    const housesWithRooms = await Promise.all(
      houses.map(async (house) => {
        const rooms = await Room.find({ houseId: house._id.toString() }).lean();
        return {
          ...house,
          rooms: rooms.map((room) => ({
            ...room,
            id: room._id.toString(),
          })),
          id: house._id.toString(),
        };
      })
    );

    return NextResponse.json(housesWithRooms, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("Error fetching houses:", error);
    return NextResponse.json(
      { error: "Failed to fetch houses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = houseSchema.parse(body);

    await connectDB();
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      console.error("ERROR: No current user found when creating house");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    console.log("Creating house - Current user:", { 
      id: currentUser.id, 
      type: currentUser.type,
      username: currentUser.username 
    });
    console.log("Creating house - User ID (raw):", currentUser.id);
    console.log("Creating house - User ID (trimmed):", String(currentUser.id).trim());

    // Ensure user ID is valid
    if (!currentUser.id || !mongoose.Types.ObjectId.isValid(currentUser.id)) {
      console.error("ERROR: Invalid user ID:", currentUser.id);
      return NextResponse.json(
        { error: "Invalid user session" },
        { status: 401 }
      );
    }

    const createdByValue = new mongoose.Types.ObjectId(currentUser.id);

    const houseData: any = {
      name: validated.name,
      address: validated.address,
      description: validated.description || null,
      createdBy: createdByValue,
    };

    // Use create() method which ensures all fields are saved
    const savedHouse = await House.create(houseData);

    const houseJson = savedHouse.toJSON();
    return NextResponse.json(
      {
        ...houseJson,
        id: savedHouse._id.toString(),
        rooms: [],
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
    console.error("Error creating house:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create house" },
      { status: 500 }
    );
  }
}
