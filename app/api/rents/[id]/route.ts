import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const rentSchema = z.object({
  roomId: z.string().uuid("Room must be selected"),
  tenantId: z.string().uuid("Tenant must be selected"),
  guarantorName: z.string().min(1, "Guarantor name is required"),
  guarantorPhone: z.string().min(1, "Guarantor phone is required"),
  monthlyRent: z.number().positive("Monthly rent must be positive"),
  months: z.number().int().min(1).max(12),
  totalRent: z.number().positive("Total rent must be positive"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  contract: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rent = await prisma.rent.findUnique({
      where: { id: params.id },
      include: {
        room: {
          include: {
            house: true,
          },
        },
        tenant: true,
      },
    });

    if (!rent) {
      return NextResponse.json(
        { error: "Rent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rent);
  } catch (error) {
    console.error("Error fetching rent:", error);
    return NextResponse.json(
      { error: "Failed to fetch rent" },
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
    const validated = rentSchema.parse(body);

    const rent = await prisma.rent.update({
      where: { id: params.id },
      data: {
        ...validated,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
      },
      include: {
        room: {
          include: {
            house: true,
          },
        },
        tenant: true,
      },
    });

    return NextResponse.json(rent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating rent:", error);
    return NextResponse.json(
      { error: "Failed to update rent" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.rent.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Rent deleted successfully" });
  } catch (error) {
    console.error("Error deleting rent:", error);
    return NextResponse.json(
      { error: "Failed to delete rent" },
      { status: 500 }
    );
  }
}
