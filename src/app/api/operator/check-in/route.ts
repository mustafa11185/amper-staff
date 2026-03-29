import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateGeofence } from "@/lib/geofence";

export async function POST(req: NextRequest) {
  try {
    const user = await requireOperator();
    const { lat, lng, selfie_url } = await req.json();

    const geo = await validateGeofence(user.branchId, lat, lng, user.geofenceRadius);
    if (!geo.valid) {
      return NextResponse.json(
        { error: `أنت خارج النطاق الجغرافي (${Math.round(geo.distance)}م) — النطاق المسموح: ${user.geofenceRadius}م` },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.operatorShift.findFirst({
      where: { staff_id: user.id, shift_date: today },
    });

    if (existing?.check_in_at) {
      return NextResponse.json({ error: "سجّلت حضورك مسبقاً اليوم" }, { status: 400 });
    }

    const generatorId = (
      await prisma.staff.findUnique({ where: { id: user.id }, select: { generator_id: true } })
    )?.generator_id;

    // Calculate late minutes
    let lateMinutes = 0;
    if (user.shiftStartTime) {
      const [sh, sm] = user.shiftStartTime.split(":").map(Number);
      const now = new Date();
      const shiftStartToday = new Date(now);
      shiftStartToday.setHours(sh, sm, 0, 0);
      if (now > shiftStartToday) {
        lateMinutes = Math.floor((now.getTime() - shiftStartToday.getTime()) / 60000);
      }
    }

    const shift = existing
      ? await prisma.operatorShift.update({
          where: { id: existing.id },
          data: {
            check_in_at: new Date(),
            check_in_lat: lat,
            check_in_lng: lng,
            check_in_selfie: selfie_url ?? null,
            check_in_valid: true,
            status: "active",
          },
        })
      : await prisma.operatorShift.create({
          data: {
            staff_id: user.id,
            generator_id: generatorId ?? "",
            branch_id: user.branchId,
            tenant_id: user.tenantId,
            shift_date: today,
            check_in_at: new Date(),
            check_in_lat: lat,
            check_in_lng: lng,
            check_in_selfie: selfie_url ?? null,
            check_in_valid: true,
            status: "active",
          },
        });

    // Log action
    await prisma.operationLog.create({
      data: {
        branch_id: user.branchId,
        staff_id: user.id,
        action: "check_in",
        notes: lateMinutes > 0
          ? `تسجيل حضور المشغل — تأخر ${lateMinutes} دقيقة`
          : `تسجيل حضور المشغل`,
      },
    });

    return NextResponse.json({ ok: true, shift_id: shift.id });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
