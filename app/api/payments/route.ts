import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Payment from "@/lib/models/Payment";
import Tenant from "@/lib/models/Tenant";
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

    const payment = new Payment({
      tenantId: validated.tenantId,
      monthlyRent: validated.monthlyRent,
      paidAmount: validated.paidAmount,
      balance: validated.balance,
      status: validated.status,
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
