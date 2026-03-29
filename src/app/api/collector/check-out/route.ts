import { NextRequest, NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireCollector();
    const { lat, lng } = await req.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shift = await prisma.collectorShift.findFirst({
      where: { staff_id: user.id, shift_date: today, check_in_at: { not: null } },
    });

    if (!shift) {
      return NextResponse.json({ error: "لم تسجّل حضورك اليوم" }, { status: 400 });
    }

    const hoursWorked =
      (Date.now() - new Date(shift.check_in_at!).getTime()) / 3600000;

    await prisma.collectorShift.update({
      where: { id: shift.id },
      data: {
        check_out_at: new Date(),
        hours_worked: Math.round(hoursWorked * 100) / 100,
        status: "completed",
      },
    });

    return NextResponse.json({
      ok: true,
      hours_worked: Math.round(hoursWorked * 100) / 100,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
