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

export async function GET() {
  try {
    await connectDB();
    
    const houses = await House.find({}).sort({ createdAt: -1 }).lean();

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
        'Cache-Control': 'no-cache, no-store, must-revalidate',
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

    const house = new House({
      name: validated.name,
      address: validated.address,
      description: validated.description || null,
    });

    const savedHouse = await house.save();

    return NextResponse.json(
      {
        ...savedHouse.toJSON(),
        rooms: [],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating house:", error);
    return NextResponse.json(
      { error: "Failed to create house" },
      { status: 500 }
    );
  }
}
