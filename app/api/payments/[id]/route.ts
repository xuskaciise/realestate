import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const paymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant must be selected"),
  monthlyRent: z.number().positive("Monthly rent must be positive"),
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
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        tenant: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(payment);
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

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: {
        ...validated,
        paymentDate: new Date(validated.paymentDate),
      },
      include: {
        tenant: true,
      },
    });

    return NextResponse.json(payment);
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
    await prisma.payment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
