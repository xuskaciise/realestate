import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import MaintenanceIssue from "@/lib/models/MaintenanceIssue";
import { z } from "zod";

const issueSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
});

export async function GET() {
  try {
    await connectDB();
    const issues = await MaintenanceIssue.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(issues.map(i => ({ ...i, id: i._id.toString() })), {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error("Error fetching maintenance issues:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance issues" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = issueSchema.parse(body);

    await connectDB();

    const issue = new MaintenanceIssue({
      name: validated.name,
      description: validated.description || null,
      price: validated.price,
    });

    const savedIssue = await issue.save();
    const issueJson = savedIssue.toJSON();

    return NextResponse.json(issueJson, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating maintenance issue:", error);
    return NextResponse.json(
      { error: "Failed to create maintenance issue" },
      { status: 500 }
    );
  }
}
