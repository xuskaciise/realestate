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

export async function GET() {
  try {
    const rents = await prisma.rent.findMany({
      include: {
        room: {
          include: {
            house: true,
          },
        },
        tenant: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(rents);
  } catch (error) {
    console.error("Error fetching rents:", error);
    return NextResponse.json(
      { error: "Failed to fetch rents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = rentSchema.parse(body);

    const rent = await prisma.rent.create({
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

    return NextResponse.json(rent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating rent:", error);
    return NextResponse.json(
      { error: "Failed to create rent" },
      { status: 500 }
    );
  }
}
