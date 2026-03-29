import { NextRequest, NextResponse } from "next/server";
import { requireOperatorOrDual } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOperatorOrDual();
    if (!user.canLogHours) {
      return NextResponse.json({ error: "لا تملك صلاحية تسجيل الساعات" }, { status: 403 });
    }

    const { id } = await params;
    const { hours, notes } = await req.json();

    if (!hours || hours <= 0) {
      return NextResponse.json({ error: "Invalid hours" }, { status: 400 });
    }

    const engine = await prisma.engine.findUnique({ where: { id } });
    if (!engine) {
      return NextResponse.json({ error: "Engine not found" }, { status: 404 });
    }

    const newRuntime = Number(engine.runtime_hours) + hours;

    await prisma.engine.update({
      where: { id },
      data: { runtime_hours: newRuntime },
    });

    await prisma.operationLog.create({
      data: {
        branch_id: user.branchId,
        staff_id: user.id,
        engine_id: id,
        action: "log_hours",
        notes: `تسجيل ${hours} ساعات تشغيل${notes ? ` — ${notes}` : ""}`,
      },
    });

    return NextResponse.json({ ok: true, runtime_hours: newRuntime });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
