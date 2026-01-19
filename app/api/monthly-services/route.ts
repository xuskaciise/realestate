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

export async function GET() {
  try {
    await connectDB();
    const services = await MonthlyService.find({}).sort({ month: -1 }).lean();

    // Populate room and house for each service
    const servicesWithRelations = await Promise.all(
      services.map(async (service) => {
        const room = await Room.findById(service.roomId).lean();
        let house = null;
        
        if (room) {
          house = await House.findById(room.houseId).lean();
        }

        return {
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
        };
      })
    );

    return NextResponse.json(servicesWithRelations, {
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

    await connectDB();

    // Check for duplicate service (same room and month)
    const existingService = await MonthlyService.findOne({
      roomId: validated.roomId,
      month: validated.month,
    }).lean();

    if (existingService) {
      return NextResponse.json(
        { 
          error: "Duplicate service", 
          message: `A service already exists for this room in ${validated.month}. Please edit the existing service instead.` 
        },
        { status: 409 } // 409 Conflict
      );
    }

    const service = new MonthlyService({
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
    });

    const savedService = await service.save();

    // Populate relations for response
    const room = await Room.findById(validated.roomId).lean();
    let house = null;
    
    if (room) {
      house = await House.findById(room.houseId).lean();
    }

    return NextResponse.json(
      {
        ...savedService.toJSON(),
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
      },
      { status: 201 }
    );
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
