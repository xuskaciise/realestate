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

    const payment = await Payment.findByIdAndUpdate(
      params.id,
      {
        tenantId: validated.tenantId,
        monthlyRent: validated.monthlyRent,
        paidAmount: validated.paidAmount,
        balance: validated.balance,
        status: validated.status,
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
