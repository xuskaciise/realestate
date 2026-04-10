import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  tenantId: z.string().optional(),
  roomId: z.string().optional(),
  issueIds: z.array(z.string()).min(1, "At least one issue must be selected"),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUserFromRequest(request);
    
    // Build query based on user type
    const where =
      currentUser && currentUser.type !== "Admin" ? { createdBy: currentUser.id } : {};

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { issues: true },
    });

    return NextResponse.json(
      requests.map((r) => ({
        ...r,
        issueIds: r.issues.map((i) => i.id),
      })),
      {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
      }
      }
    );
  } catch (error) {
    console.error("Error fetching maintenance requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = requestSchema.parse(body);
    // Fetch selected issues to calculate total price
    const issues = await prisma.maintenanceIssue.findMany({
      where: { id: { in: validated.issueIds } },
    });

    if (issues.length !== validated.issueIds.length) {
      return NextResponse.json(
        { error: "One or more maintenance issues not found" },
        { status: 404 }
      );
    }

    const totalPrice = issues.reduce((sum, issue) => sum + (issue.price || 0), 0);

    // Get current user to set createdBy
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      console.error("ERROR: No current user found when creating maintenance request");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const savedRequest = await prisma.maintenanceRequest.create({
      data: {
        tenantId: validated.tenantId ?? null,
        roomId: validated.roomId ?? null,
        totalPrice,
        status: "Pending",
        notes: validated.notes ?? null,
        createdBy: currentUser.id,
        issues: { connect: issues.map((i) => ({ id: i.id })) },
      },
      include: { issues: true },
    });

    return NextResponse.json(
      {
        ...savedRequest,
        issueIds: savedRequest.issues.map((i) => i.id),
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
    console.error("Error creating maintenance request:", error);
    return NextResponse.json(
      { error: "Failed to create maintenance request" },
      { status: 500 }
    );
  }
}
