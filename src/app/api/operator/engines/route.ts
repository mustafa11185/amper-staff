import { NextResponse } from "next/server";
import { requireOperatorOrDual } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireOperatorOrDual();

    const generators = await prisma.generator.findMany({
      where: { branch_id: user.branchId, is_active: true },
      include: { engines: true },
    }) as any[];

    const engines = [];

    for (const gen of generators) {
      for (const engine of gen.engines) {
        const latestTemp = await prisma.temperatureLog.findFirst({
          where: { engine_id: engine.id },
          orderBy: { logged_at: "desc" },
        });

        const latestFuel = await prisma.fuelLog.findFirst({
          where: { engine_id: engine.id },
          orderBy: { logged_at: "desc" },
        });

        const runtime = Number(engine.runtime_hours);

        engines.push({
          id: engine.id,
          name: engine.name,
          model: engine.model,
          generator_name: gen.name,
          runtime_hours: runtime,
          oil_change_hours: engine.oil_change_hours,
          oil_change_due_in_hours: engine.oil_change_hours - runtime,
          run_status: gen.run_status,
          fuel_level_pct: gen.fuel_level_pct,
          tank_full_dist_cm: gen.tank_full_dist_cm ?? 5,
          tank_empty_dist_cm: gen.tank_empty_dist_cm ?? 100,
          latest_temp: latestTemp
            ? { temp_celsius: latestTemp.temp_celsius }
            : null,
          latest_fuel: latestFuel
            ? { fuel_level_percent: latestFuel.fuel_level_percent }
            : null,
          latest_fuel_at: latestFuel?.logged_at?.toISOString() ?? null,
        });
      }
    }

    return NextResponse.json({ engines });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
