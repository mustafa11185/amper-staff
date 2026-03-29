import { NextRequest, NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCollector();
    const { id } = await params;

    await prisma.collectorCallRequest.update({
      where: { id },
      data: {
        status: "resolved",
        resolved_at: new Date(),
      },
    });

    // Mark related notifications as read
    await prisma.notification.updateMany({
      where: {
        branch_id: user.branchId,
        type: "collector_call",
        payload: { path: ["subscriber_id"], equals: id },
        is_read: false,
      },
      data: { is_read: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || "خطأ" }, { status: 500 });
  }
}
