import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireOperator();
    const { lat, lng } = await req.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shift = await prisma.operatorShift.findFirst({
      where: { staff_id: user.id, shift_date: today, check_in_at: { not: null } },
    });

    if (!shift) {
      return NextResponse.json({ error: "لم تسجّل حضورك اليوم" }, { status: 400 });
    }

    const hoursWorked = (Date.now() - new Date(shift.check_in_at!).getTime()) / 3600000;

    await prisma.operatorShift.update({
      where: { id: shift.id },
      data: {
        check_out_at: new Date(),
        check_out_lat: lat,
        check_out_lng: lng,
        hours_worked: Math.round(hoursWorked * 100) / 100,
        status: "completed",
      },
    });

    await prisma.operationLog.create({
      data: {
        branch_id: user.branchId,
        staff_id: user.id,
        action: "check_out",
        notes: `إنهاء الدوام — ${(Math.round(hoursWorked * 100) / 100).toFixed(1)} ساعة`,
      },
    });

    return NextResponse.json({ ok: true, hours_worked: Math.round(hoursWorked * 100) / 100 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
