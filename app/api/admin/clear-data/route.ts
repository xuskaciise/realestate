import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUserFromRequest(request);

    // Only Admin can clear data
    if (!currentUser || currentUser.type !== "Admin") {
      return NextResponse.json(
        { error: "Unauthorized. Only Admin users can clear database." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Verify admin password
    const adminUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { password: true },
    });
    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 }
      );
    }

    if (!adminUser.password) {
      return NextResponse.json(
        { error: "Admin password not set" },
        { status: 400 }
      );
    }

    const passwordHash = adminUser.password.trim();
    const isPasswordValid = await bcrypt.compare(password.trim(), passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Clear all data (except users)
    await prisma.$transaction([
      prisma.maintenanceRequest.deleteMany(),
      prisma.maintenanceIssue.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.monthlyService.deleteMany(),
      prisma.rent.deleteMany(),
      prisma.room.deleteMany(),
      prisma.house.deleteMany(),
      prisma.tenant.deleteMany(),
    ]);

    return NextResponse.json(
      { 
        message: "All data has been cleared successfully",
        cleared: {
          houses: true,
          rooms: true,
          tenants: true,
          rents: true,
          payments: true,
          monthlyServices: true,
          maintenanceRequests: true,
          maintenanceIssues: true,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error clearing database:", error);
    return NextResponse.json(
      { error: "Failed to clear database" },
      { status: 500 }
    );
  }
}
