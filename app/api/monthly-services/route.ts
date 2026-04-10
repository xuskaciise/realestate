import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const monthlyServiceSchema = z.object({
  roomId: z.string().min(1, "Room must be selected"),
  month: z.string().min(1, "Month is required"),
  waterPrevious: z.number().min(0).nullable().optional(),
  waterCurrent: z.number().min(0).nullable().optional(),
  waterPricePerUnit: z.number().min(0).nullable().optional(),
  waterTotal: z.number().min(0).nullable().optional(),
  electricityPrevious: z.number().min(0).nullable().optional(),
  electricityCurrent: z.number().min(0).nullable().optional(),
  electricityPricePerUnit: z.number().min(0).nullable().optional(),
  electricityTotal: z.number().min(0).nullable().optional(),
  trashFee: z.number().min(0).nullable().optional(),
  maintenanceFee: z.number().min(0).nullable().optional(),
  totalAmount: z.number().min(0, "Total amount must be positive"),
  notes: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUserFromRequest(request);
    
    // Build query based on user type
    const where =
      currentUser && currentUser.type !== "Admin" ? { createdBy: currentUser.id } : {};

    const services = await prisma.monthlyService.findMany({
      where,
      orderBy: { month: "desc" },
      include: { room: { include: { house: true } } },
    });

    return NextResponse.json(services, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
      }
    });
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
    // Check for duplicate service (same room and month)
    const existingService = await prisma.monthlyService.findFirst({
      where: { roomId: validated.roomId, month: validated.month },
    });

    if (existingService) {
      return NextResponse.json(
        {
          error: "Duplicate service",
          message: `A service already exists for this room in ${validated.month}. Please edit the existing service instead.`,
        },
        { status: 409 }
      );
    }

    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      console.error("ERROR: No current user found when creating monthly service");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const savedService = await prisma.monthlyService.create({
      data: {
        roomId: validated.roomId,
        month: validated.month,
        waterPrevious: validated.waterPrevious ?? null,
        waterCurrent: validated.waterCurrent ?? null,
        waterPricePerUnit: validated.waterPricePerUnit ?? null,
        waterTotal: validated.waterTotal ?? null,
        electricityPrevious: validated.electricityPrevious ?? null,
        electricityCurrent: validated.electricityCurrent ?? null,
        electricityPricePerUnit: validated.electricityPricePerUnit ?? null,
        electricityTotal: validated.electricityTotal ?? null,
        trashFee: validated.trashFee ?? null,
        maintenanceFee: validated.maintenanceFee ?? null,
        totalAmount: validated.totalAmount,
        notes: validated.notes ?? null,
        createdBy: currentUser.id,
      },
      include: { room: { include: { house: true } } },
    });

    return NextResponse.json(savedService, { status: 201 });
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
