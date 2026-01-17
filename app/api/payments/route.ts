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

export async function GET() {
  try {
    await connectDB();
    const payments = await Payment.find({}).sort({ paymentDate: -1 }).lean();

    // Populate tenant for each payment
    const paymentsWithTenant = await Promise.all(
      payments.map(async (payment) => {
        const tenant = await Tenant.findById(payment.tenantId).lean();
        return {
          ...payment,
          id: payment._id.toString(),
          tenant: tenant
            ? {
                ...tenant,
                id: tenant._id.toString(),
              }
            : null,
        };
      })
    );

    return NextResponse.json(paymentsWithTenant);
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

    await connectDB();

    // Calculate total due amount
    let totalDue = validated.monthlyRent;
    if (validated.monthlyServiceId) {
      const service = await MonthlyService.findById(validated.monthlyServiceId).lean();
      if (service) {
        totalDue += service.totalAmount;
      }
    }

    // Find all previous payments for this tenant (and same service if applicable)
    const query: any = { tenantId: validated.tenantId };
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

    const payment = new Payment({
      tenantId: validated.tenantId,
      monthlyRent: validated.monthlyRent,
      paidAmount: validated.paidAmount,
      balance: newBalance,
      status: status,
      paymentDate: new Date(validated.paymentDate),
      monthlyServiceId: validated.monthlyServiceId || null,
      notes: validated.notes || null,
    });

    const savedPayment = await payment.save();

    // Populate tenant for response
    const tenant = await Tenant.findById(validated.tenantId).lean();

    return NextResponse.json(
      {
        ...savedPayment.toJSON(),
        tenant: tenant
          ? {
              ...tenant,
              id: tenant._id.toString(),
            }
          : null,
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
