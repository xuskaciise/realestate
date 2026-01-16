import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const roomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  monthlyRent: z.number().positive("Monthly rent must be positive"),
  houseId: z.string().uuid("House must be selected"),
});

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        house: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(rooms);
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

    const room = await prisma.room.create({
      data: validated,
      include: {
        house: true,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
