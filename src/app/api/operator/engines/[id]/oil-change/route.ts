import { NextRequest, NextResponse } from "next/server";
import { requireOperatorOrDual } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOperatorOrDual();
    const { id } = await params;

    const engine = await prisma.engine.findUnique({ where: { id } });
    if (!engine) {
      return NextResponse.json({ error: "Engine not found" }, { status: 404 });
    }

    await prisma.engine.update({
      where: { id },
      data: { runtime_hours: 0, last_oil_change_at: new Date() },
    });

    await prisma.operationLog.create({
      data: {
        branch_id: user.branchId,
        staff_id: user.id,
        engine_id: id,
        action: "oil_change",
        notes: `تغيير زيت — المحرك ${engine.name}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
