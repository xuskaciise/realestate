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

export async function GET() {
  try {
    const services = await prisma.monthlyService.findMany({
      include: {
        room: {
          include: {
            house: true,
          },
        },
      },
      orderBy: {
        month: "desc",
      },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching monthly services:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly services" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = monthlyServiceSchema.parse(body);

    const service = await prisma.monthlyService.create({
      data: validated,
      include: {
        room: {
          include: {
            house: true,
          },
        },
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating monthly service:", error);
    return NextResponse.json(
      { error: "Failed to create monthly service" },
      { status: 500 }
    );
  }
}
