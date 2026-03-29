import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireOperator();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shift = await prisma.operatorShift.findFirst({
      where: { staff_id: user.id, shift_date: today },
    });

    return NextResponse.json({
      shift: shift
        ? {
            id: shift.id,
            check_in_at: shift.check_in_at,
            check_out_at: shift.check_out_at,
            hours_worked: shift.hours_worked ? Number(shift.hours_worked) : null,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
