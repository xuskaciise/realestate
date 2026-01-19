import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import MaintenanceRequest from "@/lib/models/MaintenanceRequest";
import MaintenanceIssue from "@/lib/models/MaintenanceIssue";
import { z } from "zod";

const requestSchema = z.object({
  tenantId: z.string().optional(),
  roomId: z.string().optional(),
  issueIds: z.array(z.string()).min(1, "At least one issue must be selected"),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    await connectDB();
    const requests = await MaintenanceRequest.find({}).sort({ createdAt: -1 }).lean();
    
    // Populate issue details for each request
    const requestsWithIssues = await Promise.all(
      requests.map(async (request) => {
        const issues = await MaintenanceIssue.find({
          _id: { $in: request.issueIds }
        }).lean();
        
        return {
          ...request,
          id: request._id.toString(),
          issues: issues.map(i => ({
            ...i,
            id: i._id.toString(),
          })),
        };
      })
    );

    return NextResponse.json(requestsWithIssues, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
      }
    });
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

    await connectDB();

    // Fetch selected issues to calculate total price
    const issues = await MaintenanceIssue.find({
      _id: { $in: validated.issueIds }
    }).lean();

    if (issues.length !== validated.issueIds.length) {
      return NextResponse.json(
        { error: "One or more maintenance issues not found" },
        { status: 404 }
      );
    }

    const totalPrice = issues.reduce((sum, issue) => sum + (issue.price || 0), 0);

    const maintenanceRequest = new MaintenanceRequest({
      tenantId: validated.tenantId || null,
      roomId: validated.roomId || null,
      issueIds: validated.issueIds,
      totalPrice: totalPrice,
      status: "Pending",
      notes: validated.notes || null,
    });

    const savedRequest = await maintenanceRequest.save();
    const requestJson = savedRequest.toJSON();

    return NextResponse.json({
      ...requestJson,
      issues: issues.map(i => ({
        ...i,
        id: i._id.toString(),
      })),
    }, { status: 201 });
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
