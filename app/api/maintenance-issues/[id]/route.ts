import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import MaintenanceIssue from "@/lib/models/MaintenanceIssue";
import { z } from "zod";

const updateIssueSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative").optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const issue = await MaintenanceIssue.findById(params.id).lean();

    if (!issue) {
      return NextResponse.json(
        { error: "Maintenance issue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...issue,
      id: issue._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching maintenance issue:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance issue" },
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
    const validated = updateIssueSchema.parse(body);

    await connectDB();

    const issue = await MaintenanceIssue.findByIdAndUpdate(
      params.id,
      validated,
      { new: true, runValidators: true }
    ).lean();

    if (!issue) {
      return NextResponse.json(
        { error: "Maintenance issue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...issue,
      id: issue._id.toString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating maintenance issue:", error);
    return NextResponse.json(
      { error: "Failed to update maintenance issue" },
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
    const issue = await MaintenanceIssue.findByIdAndDelete(params.id);

    if (!issue) {
      return NextResponse.json(
        { error: "Maintenance issue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Maintenance issue deleted successfully" });
  } catch (error) {
    console.error("Error deleting maintenance issue:", error);
    return NextResponse.json(
      { error: "Failed to delete maintenance issue" },
      { status: 500 }
    );
  }
}
