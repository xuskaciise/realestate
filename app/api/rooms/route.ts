import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const roomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  monthlyRent: z.number().positive("Monthly rent must be positive"),
  houseId: z.string().min(1, "House must be selected"),
  status: z.enum(["available", "rented"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUserFromRequest(request);

    const where =
      currentUser && currentUser.type !== "Admin"
        ? { house: { createdBy: currentUser.id } }
        : {};

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { house: true },
    });

    return NextResponse.json(rooms, {
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify house exists
    const house = await prisma.house.findUnique({
      where: { id: validated.houseId },
    });
    if (!house) {
      return NextResponse.json(
        { error: "House not found" },
        { status: 404 }
      );
    }

    // Staff users can only create rooms in their own houses
    if (currentUser.type !== "Admin") {
      if (!house.createdBy || house.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    const savedRoom = await prisma.room.create({
      data: {
        name: validated.name,
        monthlyRent: validated.monthlyRent,
        houseId: validated.houseId,
        status: validated.status ?? "available",
      },
      include: { house: true },
    });

    return NextResponse.json(savedRoom, { status: 201 });
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
