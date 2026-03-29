import { NextRequest, NextResponse } from "next/server";
import { requireOperatorOrDual } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOperatorOrDual();
    if (!user.canToggleGenerator) {
      return NextResponse.json({ error: "لا تملك صلاحية التشغيل/الإيقاف" }, { status: 403 });
    }

    const { id } = await params;
    const { run_status } = await req.json();

    const engine = await prisma.engine.findUnique({
      where: { id },
      include: { generator: true },
    });
    if (!engine) {
      return NextResponse.json({ error: "Engine not found" }, { status: 404 });
    }

    await prisma.generator.update({
      where: { id: engine.generator_id },
      data: { run_status },
    });

    await prisma.operationLog.create({
      data: {
        branch_id: user.branchId,
        staff_id: user.id,
        engine_id: id,
        action: run_status ? "toggle_on" : "toggle_off",
        notes: `${run_status ? "تشغيل" : "إيقاف"} المحرك ${engine.name}`,
      },
    });

    return NextResponse.json({ ok: true, run_status });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
