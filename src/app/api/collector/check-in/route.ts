import { NextRequest, NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateGeofence } from "@/lib/geofence";

export async function POST(req: NextRequest) {
  try {
    const user = await requireCollector();
    const { lat, lng, selfie_url } = await req.json();

    // Validate geofence server-side
    const geo = await validateGeofence(user.branchId, lat, lng, user.geofenceRadius);
    if (!geo.valid) {
      return NextResponse.json(
        {
          error: `أنت خارج النطاق الجغرافي (${Math.round(geo.distance)}م) — النطاق المسموح: ${user.geofenceRadius}م`,
        },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existing = await prisma.collectorShift.findFirst({
      where: {
        staff_id: user.id,
        shift_date: today,
      },
    });

    if (existing?.check_in_at) {
      return NextResponse.json({ error: "سجّلت حضورك مسبقاً اليوم" }, { status: 400 });
    }

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

    const checkInData = {
      check_in_at: new Date(),
      check_in_lat: lat,
      check_in_lng: lng,
      check_in_selfie: selfie_url ?? null,
      check_in_valid: true,
      status: "active",
      late_minutes: lateMinutes,
    };

    const shift = existing
      ? await prisma.collectorShift.update({
          where: { id: existing.id },
          data: checkInData,
        })
      : await prisma.collectorShift.create({
          data: {
            staff_id: user.id,
            branch_id: user.branchId,
            tenant_id: user.tenantId,
            shift_date: today,
            ...checkInData,
            target_subscribers: user.dailyTarget ?? 0,
          },
        });

    return NextResponse.json({ ok: true, shift_id: shift.id, late_minutes: lateMinutes });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
