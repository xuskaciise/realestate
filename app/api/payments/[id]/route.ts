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

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { tenant: true },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Staff users can only access their own payments
    if (currentUser.type !== "Admin") {
      if (!payment.createdBy || payment.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      ...payment,
      tenant: payment.tenant ?? null,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
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
    const validated = paymentSchema.parse(body);
    const currentUser = getCurrentUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the existing payment to exclude it from previous payments calculation
    const existingPayment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: { createdBy: true },
    });
    if (!existingPayment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Staff users can only update their own payments
    if (currentUser.type !== "Admin") {
      if (!existingPayment.createdBy || existingPayment.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Calculate total due amount
    let totalDue = validated.monthlyRent;
    if (validated.monthlyServiceId) {
      const service = await prisma.monthlyService.findUnique({
        where: { id: validated.monthlyServiceId },
      });
      if (service) totalDue += service.totalAmount;
    }

    // Find all previous payments for this tenant (excluding the current payment being updated)
    const query: any = { tenantId: validated.tenantId, id: { not: params.id } };
    if (validated.monthlyServiceId) {
      query.monthlyServiceId = validated.monthlyServiceId;
    } else {
      // If no service, only count payments without service or with same monthlyRent
      query.OR = [{ monthlyServiceId: null }, { monthlyRent: validated.monthlyRent }];
    }

    const previousPayments = await prisma.payment.findMany({
      where: query,
      select: { paidAmount: true },
    });
    
    // Calculate cumulative paid amount (excluding the payment being updated)
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

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: {
        tenantId: validated.tenantId,
        monthlyRent: validated.monthlyRent,
        paidAmount: validated.paidAmount,
        balance: newBalance,
        status: status,
        paymentDate: new Date(validated.paymentDate),
        monthlyServiceId: validated.monthlyServiceId ?? null,
        notes: validated.notes ?? null,
      },
      include: { tenant: true },
    });

    return NextResponse.json({
      ...payment,
      tenant: payment.tenant ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
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

    const existingPayment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: { createdBy: true },
    });
    if (!existingPayment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Staff users can only delete their own payments
    if (currentUser.type !== "Admin") {
      if (!existingPayment.createdBy || existingPayment.createdBy !== currentUser.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }
    await prisma.payment.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
