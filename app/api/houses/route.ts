import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const houseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUserFromRequest(request);
    
    console.log("Fetching houses - Current user:", currentUser ? { id: currentUser.id, type: currentUser.type } : "null");
    
    // Build query based on user type
    const where =
      currentUser && currentUser.type !== "Admin" ? { createdBy: currentUser.id } : {};

    const houses = await prisma.house.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        rooms: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(houses, {
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

    const savedHouse = await prisma.house.create({
      data: {
        name: validated.name,
        address: validated.address,
        description: validated.description ?? null,
        createdBy: currentUser.id,
      },
      include: {
        rooms: true,
      },
    });

    return NextResponse.json(
      {
        ...savedHouse,
        rooms: savedHouse.rooms ?? [],
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
