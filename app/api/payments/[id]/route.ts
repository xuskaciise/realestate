import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Payment from "@/lib/models/Payment";
import Tenant from "@/lib/models/Tenant";
import MonthlyService from "@/lib/models/MonthlyService";
import { z } from "zod";

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
    await connectDB();
    const payment = await Payment.findById(params.id).lean();

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const tenant = await Tenant.findById(payment.tenantId).lean();

    return NextResponse.json({
      ...payment,
      id: payment._id.toString(),
      tenant: tenant
        ? {
            ...tenant,
            id: tenant._id.toString(),
          }
        : null,
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

    await connectDB();

    // Get the existing payment to exclude it from previous payments calculation
    const existingPayment = await Payment.findById(params.id).lean();
    if (!existingPayment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Calculate total due amount
    let totalDue = validated.monthlyRent;
    if (validated.monthlyServiceId) {
      const service = await MonthlyService.findById(validated.monthlyServiceId).lean();
      if (service) {
        totalDue += service.totalAmount;
      }
    }

    // Find all previous payments for this tenant (excluding the current payment being updated)
    const query: any = { 
      tenantId: validated.tenantId,
      _id: { $ne: params.id } // Exclude current payment
    };
    if (validated.monthlyServiceId) {
      query.monthlyServiceId = validated.monthlyServiceId;
    } else {
      // If no service, only count payments without service or with same monthlyRent
      query.$or = [
        { monthlyServiceId: null },
        { monthlyRent: validated.monthlyRent }
      ];
    }

    const previousPayments = await Payment.find(query).lean();
    
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

    const payment = await Payment.findByIdAndUpdate(
      params.id,
      {
        tenantId: validated.tenantId,
        monthlyRent: validated.monthlyRent,
        paidAmount: validated.paidAmount,
        balance: newBalance,
        status: status,
        paymentDate: new Date(validated.paymentDate),
        monthlyServiceId: validated.monthlyServiceId || null,
        notes: validated.notes || null,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const tenant = await Tenant.findById(validated.tenantId).lean();

    return NextResponse.json({
      ...payment,
      id: payment._id.toString(),
      tenant: tenant
        ? {
            ...tenant,
            id: tenant._id.toString(),
          }
        : null,
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
    await connectDB();
    const payment = await Payment.findByIdAndDelete(params.id);

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
