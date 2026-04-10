import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
    const issue = await prisma.maintenanceIssue.findUnique({
      where: { id: params.id },
    });

    if (!issue) {
      return NextResponse.json(
        { error: "Maintenance issue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...issue,
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

    const issue = await prisma.maintenanceIssue.update({
      where: { id: params.id },
      data: validated,
    });

    if (!issue) {
      return NextResponse.json(
        { error: "Maintenance issue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...issue,
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
    await prisma.maintenanceIssue.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Maintenance issue deleted successfully" });
  } catch (error) {
    console.error("Error deleting maintenance issue:", error);
    return NextResponse.json(
      { error: "Failed to delete maintenance issue" },
      { status: 500 }
    );
  }
}
