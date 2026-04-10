import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const house = await prisma.house.findUnique({
      where: { id: params.id },
      include: { rooms: true },
    });

    if (!house) {
      return NextResponse.json(
        { error: "House not found" },
        { status: 404 }
      );
    }

    // Staff users can only access their own houses
    if (currentUser.type !== "Admin") {
      if (!house.createdBy || house.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      ...house,
      rooms: house.rooms,
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingHouse = await prisma.house.findUnique({
      where: { id: params.id },
    });
    if (!existingHouse) {
      return NextResponse.json(
        { error: "House not found" },
        { status: 404 }
      );
    }

    // Staff users can only update their own houses
    if (currentUser.type !== "Admin") {
      if (!existingHouse.createdBy || existingHouse.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    const house = await prisma.house.update({
      where: { id: params.id },
      data: {
        name: validated.name,
        address: validated.address,
        description: validated.description ?? null,
      },
      include: { rooms: true },
    });

    return NextResponse.json({
      ...house,
      rooms: house.rooms,
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingHouse = await prisma.house.findUnique({
      where: { id: params.id },
      include: { rooms: false },
    });
    if (!existingHouse) {
      return NextResponse.json(
        { error: "House not found" },
        { status: 404 }
      );
    }

    // Staff users can only delete their own houses
    if (currentUser.type !== "Admin") {
      if (!existingHouse.createdBy || existingHouse.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    await prisma.house.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "House deleted successfully" });
  } catch (error) {
    console.error("Error deleting house:", error);
    return NextResponse.json(
      { error: "Failed to delete house" },
      { status: 500 }
    );
  }
}
