import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  profile: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUserFromRequest(request);
    
    // Build query based on user type
    const where =
      currentUser && currentUser.type !== "Admin" ? { createdBy: currentUser.id } : {};

    const tenants = await prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tenants, {
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
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      console.error("ERROR: No current user found when creating tenant");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const savedTenant = await prisma.tenant.create({
      data: {
        name: validated.name,
        phone: validated.phone,
        address: validated.address,
        profile: validated.profile ?? null,
        createdBy: currentUser.id,
      },
    });

    return NextResponse.json(savedTenant, { status: 201 });
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
