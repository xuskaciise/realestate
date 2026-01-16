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

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        tenant: true,
      },
      orderBy: {
        paymentDate: "desc",
      },
    });
    return NextResponse.json(payments);
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

    const payment = await prisma.payment.create({
      data: {
        ...validated,
        paymentDate: new Date(validated.paymentDate),
      },
      include: {
        tenant: true,
      },
    });

    return NextResponse.json(payment, { status: 201 });
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
