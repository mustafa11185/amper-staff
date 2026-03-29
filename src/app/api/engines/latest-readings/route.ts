import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireStaff();

    const branchId = user.branchId;
    if (!branchId) return NextResponse.json({ error: "No branch" }, { status: 400 });

    const generator = await prisma.generator.findFirst({
      where: { branch_id: branchId, is_active: true },
      include: { engines: { take: 1 } },
    });

    if (!generator || !generator.engines[0]) {
      return NextResponse.json({ run_status: false, temperature: null, fuel_pct: null, oil_pressure: null, load_amps: null, last_updated: null });
    }

    const engineId = generator.engines[0].id;

    let temperature: number | null = null;
    let tempAt: string | null = null;
    let fuel_pct: number | null = generator.fuel_level_pct;
    let fuelAt: string | null = null;
    const oil_pressure: number | null = null;
    const oilAt: string | null = null;

    try {
      const t = await prisma.temperatureLog.findFirst({ where: { engine_id: engineId }, orderBy: { logged_at: "desc" } });
      if (t) { temperature = t.temp_celsius; tempAt = t.logged_at.toISOString(); }
    } catch {}

    try {
      const f = await prisma.fuelLog.findFirst({ where: { engine_id: engineId }, orderBy: { logged_at: "desc" } });
      if (f) { fuel_pct = f.fuel_level_percent; fuelAt = f.logged_at.toISOString(); }
    } catch {}

    // OilPressureLog model not in schema yet — oil_pressure stays null

    return NextResponse.json({
      run_status: generator.run_status,
      generator_name: generator.name,
      temperature: temperature !== null ? { value: temperature, logged_at: tempAt } : null,
      fuel_pct: fuel_pct !== null ? { value: fuel_pct, logged_at: fuelAt } : null,
      oil_pressure: oil_pressure !== null ? { value: oil_pressure, logged_at: oilAt } : null,
      load_amps: null,
      runtime_hours: Number(generator.engines[0].runtime_hours),
      oil_change_hours: generator.engines[0].oil_change_hours,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
