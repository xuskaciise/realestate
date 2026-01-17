import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import MonthlyService from "@/lib/models/MonthlyService";
import Room from "@/lib/models/Room";
import House from "@/lib/models/House";
import { z } from "zod";

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
    await connectDB();
    const service = await MonthlyService.findById(params.id).lean();

    if (!service) {
      return NextResponse.json(
        { error: "Monthly service not found" },
        { status: 404 }
      );
    }

    const room = await Room.findById(service.roomId).lean();
    let house = null;
    
    if (room) {
      house = await House.findById(room.houseId).lean();
    }

    return NextResponse.json({
      ...service,
      id: service._id.toString(),
      room: room
        ? {
            ...room,
            id: room._id.toString(),
            house: house
              ? {
                  ...house,
                  id: house._id.toString(),
                }
              : null,
          }
        : null,
    });
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

    await connectDB();

    // Check for duplicate service (same room and month, excluding current service)
    const existingService = await MonthlyService.findOne({
      roomId: validated.roomId,
      month: validated.month,
      _id: { $ne: params.id }, // Exclude current service
    }).lean();

    if (existingService) {
      return NextResponse.json(
        { 
          error: "Duplicate service", 
          message: `Another service already exists for this room in ${validated.month}. Cannot update to duplicate.` 
        },
        { status: 409 } // 409 Conflict
      );
    }

    const service = await MonthlyService.findByIdAndUpdate(
      params.id,
      {
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
      { new: true, runValidators: true }
    ).lean();

    if (!service) {
      return NextResponse.json(
        { error: "Monthly service not found" },
        { status: 404 }
      );
    }

    const room = await Room.findById(validated.roomId).lean();
    let house = null;
    
    if (room) {
      house = await House.findById(room.houseId).lean();
    }

    return NextResponse.json({
      ...service,
      id: service._id.toString(),
      room: room
        ? {
            ...room,
            id: room._id.toString(),
            house: house
              ? {
                  ...house,
                  id: house._id.toString(),
                }
              : null,
          }
        : null,
    });
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
    await connectDB();
    const service = await MonthlyService.findByIdAndDelete(params.id);

    if (!service) {
      return NextResponse.json(
        { error: "Monthly service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Monthly service deleted successfully" });
  } catch (error) {
    console.error("Error deleting monthly service:", error);
    return NextResponse.json(
      { error: "Failed to delete monthly service" },
      { status: 500 }
    );
  }
}
