import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const paymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant must be selected"),
  monthlyRent: z.number().min(0, "Monthly rent must be non-negative"), // Allow 0 for service-only payments
  paidAmount: z.number().min(0, "Paid amount must be non-negative"),
  balance: z.number(),
  status: z.enum(["Paid", "Partial", "Pending", "Overdue"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  monthlyServiceId: z.string().optional(),
  maintenanceRequestId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUserFromRequest(request);
    
    const where =
      currentUser && currentUser.type !== "Admin" ? { createdBy: currentUser.id } : {};

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      include: { tenant: true },
    });

    const paymentsWithTenant = payments.map((payment) => ({
      ...payment,
      tenant: payment.tenant ?? null,
    }));

    return NextResponse.json(paymentsWithTenant, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = paymentSchema.parse(body);

    // Calculate total due amount
    let totalDue = validated.monthlyRent;
    if (validated.maintenanceRequestId) {
      const maintenanceRequest = await prisma.maintenanceRequest.findUnique({
        where: { id: validated.maintenanceRequestId },
      });
      if (maintenanceRequest) totalDue = maintenanceRequest.totalPrice;
    } else if (validated.monthlyServiceId) {
      const service = await prisma.monthlyService.findUnique({
        where: { id: validated.monthlyServiceId },
      });
      if (service) totalDue += service.totalAmount;
    }

    // Find all previous payments for this tenant (and same service/maintenance request if applicable)
    const previousPaymentsWhere: any = { tenantId: validated.tenantId };
    if (validated.maintenanceRequestId) {
      previousPaymentsWhere.maintenanceRequestId = validated.maintenanceRequestId;
    } else if (validated.monthlyServiceId) {
      previousPaymentsWhere.monthlyServiceId = validated.monthlyServiceId;
    } else {
      // If no service, only count payments without service or with same monthlyRent
      previousPaymentsWhere.OR = [
        { monthlyServiceId: null, maintenanceRequestId: null },
        { monthlyRent: validated.monthlyRent },
      ];
    }

    const previousPayments = await prisma.payment.findMany({
      where: previousPaymentsWhere,
      select: { paidAmount: true },
    });
    
    // Calculate cumulative paid amount (excluding current payment)
    const previousPaidAmount = previousPayments.reduce(
      (sum, payment) => sum + (payment.paidAmount || 0),
      0
    );

    // Calculate new balance: total due - (previous payments + current payment)
    const totalPaidAmount = previousPaidAmount + validated.paidAmount;
    const newBalance = totalDue - totalPaidAmount;

    // Determine status based on balance
    let status: "Paid" | "Partial" | "Pending" | "Overdue" = validated.status;
    if (newBalance <= 0) {
      status = "Paid";
    } else if (totalPaidAmount > 0) {
      status = "Partial";
    } else {
      status = "Pending";
    }

    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      console.error("ERROR: No current user found when creating payment");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const savedPayment = await prisma.payment.create({
      data: {
        tenantId: validated.tenantId,
        monthlyRent: validated.monthlyRent,
        paidAmount: validated.paidAmount,
        balance: newBalance,
        status: status,
        paymentDate: new Date(validated.paymentDate),
        monthlyServiceId: validated.monthlyServiceId ?? null,
        maintenanceRequestId: validated.maintenanceRequestId ?? null,
        notes: validated.notes ?? null,
        createdBy: currentUser.id,
      },
      include: { tenant: true },
    });

    return NextResponse.json(
      {
        ...savedPayment,
        tenant: savedPayment.tenant ?? null,
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
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
