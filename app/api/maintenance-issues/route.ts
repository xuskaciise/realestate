import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const issueSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
});

export async function GET() {
  try {
    const issues = await prisma.maintenanceIssue.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(issues, {
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
    const savedIssue = await prisma.maintenanceIssue.create({
      data: {
        name: validated.name,
        description: validated.description ?? null,
        price: validated.price,
      },
    });
    return NextResponse.json(savedIssue, { status: 201 });
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
