import { NextRequest, NextResponse } from "next/server";
import { requireOperatorOrDual } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOperatorOrDual();
    if (!user.canAddFuel) {
      return NextResponse.json({ error: "لا تملك صلاحية إضافة الوقود" }, { status: 403 });
    }

    const { id } = await params;
    const { liters, cost_iqd, notes, distance_cm, fuel_pct } = await req.json();

    const engine = await prisma.engine.findUnique({
      where: { id },
      include: { generator: true },
    });
    if (!engine) {
      return NextResponse.json({ error: "Engine not found" }, { status: 404 });
    }

    // Create fuel log
    await prisma.fuelLog.create({
      data: {
        engine_id: id,
        fuel_level_percent: fuel_pct ?? 0,
        distance_cm: distance_cm ?? null,
        fuel_added_liters: liters > 0 ? liters : null,
        source: "manual",
        cost_iqd: cost_iqd ?? null,
        notes: notes ?? null,
      },
    });

    // Update generator fuel level if we have a calculated pct
    if (fuel_pct !== undefined) {
      await prisma.generator.update({
        where: { id: engine.generator_id },
        data: { fuel_level_pct: fuel_pct, last_fuel_update: new Date() },
      });
    }

    await prisma.operationLog.create({
      data: {
        branch_id: user.branchId,
        staff_id: user.id,
        engine_id: id,
        action: "add_fuel",
        notes: liters > 0
          ? `إضافة ${liters} لتر وقود${cost_iqd ? ` — ${cost_iqd} د.ع` : ""}`
          : `قراءة يدوية: ${distance_cm}سم = ${fuel_pct?.toFixed(0)}%`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
