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

    const service = await prisma.monthlyService.findUnique({
      where: { id: params.id },
      include: { room: { include: { house: true } } },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Monthly service not found" },
        { status: 404 }
      );
    }

    // Staff users can only access their own services
    if (currentUser.type !== "Admin") {
      if (!service.createdBy || service.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
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

    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingService = await prisma.monthlyService.findUnique({
      where: { id: params.id },
    });
    if (!existingService) {
      return NextResponse.json(
        { error: "Monthly service not found" },
        { status: 404 }
      );
    }

    // Staff users can only update their own services
    if (currentUser.type !== "Admin") {
      if (!existingService.createdBy || existingService.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Check for duplicate service (same room and month, excluding current service)
    const duplicateService = await prisma.monthlyService.findFirst({
      where: {
        roomId: validated.roomId,
        month: validated.month,
        id: { not: params.id },
      },
    });

    if (duplicateService) {
      return NextResponse.json(
        { 
          error: "Duplicate service", 
          message: `Another service already exists for this room in ${validated.month}. Cannot update to duplicate.` 
        },
        { status: 409 } // 409 Conflict
      );
    }

    const service = await prisma.monthlyService.update({
      where: { id: params.id },
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
      },
      include: { room: { include: { house: true } } },
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingService = await prisma.monthlyService.findUnique({
      where: { id: params.id },
    });
    if (!existingService) {
      return NextResponse.json(
        { error: "Monthly service not found" },
        { status: 404 }
      );
    }

    // Staff users can only delete their own services
    if (currentUser.type !== "Admin") {
      if (!existingService.createdBy || existingService.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    await prisma.monthlyService.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Monthly service deleted successfully" });
  } catch (error) {
    console.error("Error deleting monthly service:", error);
    return NextResponse.json(
      { error: "Failed to delete monthly service" },
      { status: 500 }
    );
  }
}
