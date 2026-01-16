import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const monthlyServiceSchema = z.object({
  roomId: z.string().min(1, "Room must be selected"),
  month: z.string().min(1, "Month is required"),
  waterPrevious: z.number().min(0).optional(),
  waterCurrent: z.number().min(0).optional(),
  waterPricePerUnit: z.number().min(0).optional(),
  waterTotal: z.number().min(0).optional(),
  electricityPrevious: z.number().min(0).optional(),
  electricityCurrent: z.number().min(0).optional(),
  electricityPricePerUnit: z.number().min(0).optional(),
  electricityTotal: z.number().min(0).optional(),
  trashFee: z.number().min(0).optional(),
  maintenanceFee: z.number().min(0).optional(),
  totalAmount: z.number().min(0, "Total amount must be positive"),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = await prisma.monthlyService.findUnique({
      where: { id: params.id },
      include: {
        room: {
          include: {
            house: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Monthly service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error fetching monthly service:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly service" },
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
    const validated = monthlyServiceSchema.parse(body);

    const service = await prisma.monthlyService.update({
      where: { id: params.id },
      data: validated,
      include: {
        room: {
          include: {
            house: true,
          },
        },
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating monthly service:", error);
    return NextResponse.json(
      { error: "Failed to update monthly service" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.monthlyService.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Monthly service deleted successfully" });
  } catch (error) {
    console.error("Error deleting monthly service:", error);
    return NextResponse.json(
      { error: "Failed to delete monthly service" },
      { status: 500 }
    );
  }
}
