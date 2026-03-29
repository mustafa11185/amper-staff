import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStaff();
    const { id } = await params;
    const { amount, reason } = await req.json();

    if (amount === undefined || amount < 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason required" }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({ where: { id } });
    if (!subscriber) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const oldDebt = Number(subscriber.total_debt);

    await prisma.subscriber.update({
      where: { id },
      data: { total_debt: amount },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenant_id: user.tenantId,
        branch_id: user.branchId,
        actor_id: user.id,
        actor_type: user.role,
        action: "update_debt",
        entity_type: "subscriber",
        entity_id: id,
        old_value: { total_debt: oldDebt },
        new_value: { total_debt: amount, reason },
      },
    });

    return NextResponse.json({ ok: true, old_debt: oldDebt, new_debt: amount });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
