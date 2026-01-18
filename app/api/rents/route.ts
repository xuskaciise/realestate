import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Rent from "@/lib/models/Rent";
import Room from "@/lib/models/Room";
import House from "@/lib/models/House";
import Tenant from "@/lib/models/Tenant";
import { z } from "zod";

const rentSchema = z.object({
  roomId: z.string().min(1, "Room must be selected"),
  tenantId: z.string().min(1, "Tenant must be selected"),
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
    await connectDB();
    const rents = await Rent.find({}).sort({ createdAt: -1 }).lean();

    // Return normalized data (only IDs, no populated objects)
    const normalizedRents = rents.map((rent) => ({
      ...rent,
      id: rent._id.toString(),
      roomId: rent.roomId.toString(),
      tenantId: rent.tenantId.toString(),
      startDate: rent.startDate ? rent.startDate.toISOString() : null,
      endDate: rent.endDate ? rent.endDate.toISOString() : null,
      createdAt: rent.createdAt ? rent.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: rent.updatedAt ? rent.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json(normalizedRents, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
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

    await connectDB();

    // Check if room has an active rent that overlaps with the new rent period
    const newStartDate = new Date(validated.startDate);
    const newEndDate = new Date(validated.endDate);

    const existingRents = await Rent.find({
      roomId: validated.roomId,
    }).lean();

    // Check for overlapping rent periods
    const hasOverlap = existingRents.some((existingRent) => {
      const existingStart = new Date(existingRent.startDate);
      const existingEnd = new Date(existingRent.endDate);
      
      // Check if the new rent period overlaps with any existing rent
      // Overlap occurs if: newStart < existingEnd AND newEnd > existingStart
      return newStartDate < existingEnd && newEndDate > existingStart;
    });

    if (hasOverlap) {
      return NextResponse.json(
        { error: "This room is already rented for the selected period. Please choose a different room or adjust the dates." },
        { status: 400 }
      );
    }

    const rent = new Rent({
      roomId: validated.roomId,
      tenantId: validated.tenantId,
      guarantorName: validated.guarantorName,
      guarantorPhone: validated.guarantorPhone,
      monthlyRent: validated.monthlyRent,
      months: validated.months,
      totalRent: validated.totalRent,
      startDate: newStartDate,
      endDate: newEndDate,
      contract: validated.contract || null,
    });

    const savedRent = await rent.save();

    // Return normalized data
    return NextResponse.json(
      {
        ...savedRent.toJSON(),
        id: savedRent._id.toString(),
        roomId: savedRent.roomId.toString(),
        tenantId: savedRent.tenantId.toString(),
        startDate: savedRent.startDate ? savedRent.startDate.toISOString() : null,
        endDate: savedRent.endDate ? savedRent.endDate.toISOString() : null,
        createdAt: savedRent.createdAt ? savedRent.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: savedRent.updatedAt ? savedRent.updatedAt.toISOString() : new Date().toISOString(),
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
    console.error("Error creating rent:", error);
    return NextResponse.json(
      { error: "Failed to create rent" },
      { status: 500 }
    );
  }
}
