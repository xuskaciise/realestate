import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import MaintenanceRequest from "@/lib/models/MaintenanceRequest";
import MaintenanceIssue from "@/lib/models/MaintenanceIssue";
import { z } from "zod";

const updateRequestSchema = z.object({
  tenantId: z.string().optional(),
  roomId: z.string().optional(),
  issueIds: z.array(z.string()).optional(),
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled"]).optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const maintenanceRequest = await MaintenanceRequest.findById(params.id).lean();

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    // Populate issue details
    const issues = await MaintenanceIssue.find({
      _id: { $in: maintenanceRequest.issueIds }
    }).lean();

    return NextResponse.json({
      ...maintenanceRequest,
      id: maintenanceRequest._id.toString(),
      issues: issues.map(i => ({
        ...i,
        id: i._id.toString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching maintenance request:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance request" },
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
    const validated = updateRequestSchema.parse(body);

    await connectDB();

    const existingRequest = await MaintenanceRequest.findById(params.id).lean();
    if (!existingRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (validated.tenantId !== undefined) updateData.tenantId = validated.tenantId || null;
    if (validated.roomId !== undefined) updateData.roomId = validated.roomId || null;
    if (validated.status) updateData.status = validated.status;
    if (validated.notes !== undefined) updateData.notes = validated.notes || null;

    // If issueIds are updated, recalculate total price
    if (validated.issueIds) {
      updateData.issueIds = validated.issueIds;
      const issues = await MaintenanceIssue.find({
        _id: { $in: validated.issueIds }
      }).lean();
      updateData.totalPrice = issues.reduce((sum, issue) => sum + (issue.price || 0), 0);
    }

    const updatedRequest = await MaintenanceRequest.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    // Populate issue details
    const issues = await MaintenanceIssue.find({
      _id: { $in: updatedRequest.issueIds }
    }).lean();

    return NextResponse.json({
      ...updatedRequest,
      id: updatedRequest._id.toString(),
      issues: issues.map(i => ({
        ...i,
        id: i._id.toString(),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating maintenance request:", error);
    return NextResponse.json(
      { error: "Failed to update maintenance request" },
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
    const maintenanceRequest = await MaintenanceRequest.findByIdAndDelete(params.id);

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Maintenance request deleted successfully" });
  } catch (error) {
    console.error("Error deleting maintenance request:", error);
    return NextResponse.json(
      { error: "Failed to delete maintenance request" },
      { status: 500 }
    );
  }
}
