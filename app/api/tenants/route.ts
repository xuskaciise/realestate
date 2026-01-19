import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Tenant from "@/lib/models/Tenant";
import { z } from "zod";

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  profile: z.string().optional(),
});

export async function GET() {
  try {
    await connectDB();
    const tenants = await Tenant.find({}).sort({ createdAt: -1 }).lean();
    const formattedTenants = tenants.map(t => ({
      ...t,
      id: t._id.toString(),
      _id: undefined,
    }));
    return NextResponse.json(formattedTenants, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch tenants";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = tenantSchema.parse(body);

    await connectDB();

    const tenant = new Tenant({
      name: validated.name,
      phone: validated.phone,
      address: validated.address,
      profile: validated.profile || null,
    });

    const savedTenant = await tenant.save();
    const tenantJson = savedTenant.toJSON();
    return NextResponse.json(tenantJson, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating tenant:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create tenant";
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
