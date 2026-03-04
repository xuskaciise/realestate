import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { getCurrentUserFromRequest } from "@/lib/auth";
import User from "@/lib/models/User";
import House from "@/lib/models/House";
import Room from "@/lib/models/Room";
import Tenant from "@/lib/models/Tenant";
import Rent from "@/lib/models/Rent";
import Payment from "@/lib/models/Payment";
import MonthlyService from "@/lib/models/MonthlyService";
import MaintenanceRequest from "@/lib/models/MaintenanceRequest";
import MaintenanceIssue from "@/lib/models/MaintenanceIssue";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
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
    const adminUser = await User.findById(currentUser.id).lean();
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
    await Promise.all([
      MaintenanceRequest.deleteMany({}),
      MaintenanceIssue.deleteMany({}),
      Payment.deleteMany({}),
      MonthlyService.deleteMany({}),
      Rent.deleteMany({}),
      Room.deleteMany({}),
      House.deleteMany({}),
      Tenant.deleteMany({}),
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
