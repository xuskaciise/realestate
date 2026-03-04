import { NextResponse } from "next/server";
import { deleteAuthSessionCookie } from "@/lib/cookie-utils";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await deleteAuthSessionCookie();

    return NextResponse.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}
