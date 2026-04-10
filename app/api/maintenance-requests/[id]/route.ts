import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: { issues: true },
    });

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    // Staff users can only access their own requests
    if (currentUser.type !== "Admin") {
      if (!maintenanceRequest.createdBy || maintenanceRequest.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      ...maintenanceRequest,
      issueIds: maintenanceRequest.issues.map((i) => i.id),
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingRequest = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: { issues: true },
    });
    if (!existingRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    // Staff users can only update their own requests
    if (currentUser.type !== "Admin") {
      if (!existingRequest.createdBy || existingRequest.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    const data: any = {};
    if (validated.tenantId !== undefined) data.tenantId = validated.tenantId ?? null;
    if (validated.roomId !== undefined) data.roomId = validated.roomId ?? null;
    if (validated.status !== undefined) data.status = validated.status;
    if (validated.notes !== undefined) data.notes = validated.notes ?? null;

    if (validated.issueIds) {
      const issues = await prisma.maintenanceIssue.findMany({
        where: { id: { in: validated.issueIds } },
      });

      if (issues.length !== validated.issueIds.length) {
        return NextResponse.json(
          { error: "One or more maintenance issues not found" },
          { status: 404 }
        );
      }

      data.issues = { set: issues.map((i) => ({ id: i.id })) };
      data.totalPrice = issues.reduce((sum, issue) => sum + (issue.price || 0), 0);
    }

    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id: params.id },
      data,
      include: { issues: true },
    });

    return NextResponse.json({
      ...updatedRequest,
      issueIds: updatedRequest.issues.map((i) => i.id),
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const existingRequest = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      select: { id: true, createdBy: true },
    });
    if (!existingRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    // Staff users can only delete their own requests
    if (currentUser.type !== "Admin") {
      if (!existingRequest.createdBy || existingRequest.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    await prisma.maintenanceRequest.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Maintenance request deleted successfully" });
  } catch (error) {
    console.error("Error deleting maintenance request:", error);
    return NextResponse.json(
      { error: "Failed to delete maintenance request" },
      { status: 500 }
    );
  }
}
