import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Tenant from "@/lib/models/Tenant";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import mongoose from "mongoose";

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  profile: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const tenant = await Tenant.findById(params.id).lean();

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Staff users can only access their own tenants
    if (currentUser.type !== "Admin") {
      const userId = new mongoose.Types.ObjectId(currentUser.id);
      if (!tenant.createdBy || !tenant.createdBy.equals(userId)) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      ...tenant,
      id: tenant._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant" },
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
    const validated = tenantSchema.parse(body);

    await connectDB();
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingTenant = await Tenant.findById(params.id).lean();
    if (!existingTenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Staff users can only update their own tenants
    if (currentUser.type !== "Admin") {
      const userId = new mongoose.Types.ObjectId(currentUser.id);
      if (!existingTenant.createdBy || !existingTenant.createdBy.equals(userId)) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      params.id,
      {
        name: validated.name,
        phone: validated.phone,
        address: validated.address,
        profile: validated.profile || null,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...tenant,
      id: tenant._id.toString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating tenant:", error);
    return NextResponse.json(
      { error: "Failed to update tenant" },
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingTenant = await Tenant.findById(params.id).lean();
    if (!existingTenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Staff users can only delete their own tenants
    if (currentUser.type !== "Admin") {
      const userId = new mongoose.Types.ObjectId(currentUser.id);
      if (!existingTenant.createdBy || !existingTenant.createdBy.equals(userId)) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    const tenant = await Tenant.findByIdAndDelete(params.id);

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Tenant deleted successfully" });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json(
      { error: "Failed to delete tenant" },
      { status: 500 }
    );
  }
}
