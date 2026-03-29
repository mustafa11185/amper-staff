import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireOperator();
    const filter = req.nextUrl.searchParams.get("filter") ?? "today";

    let since: Date;
    const now = new Date();

    if (filter === "today") {
      since = new Date();
      since.setHours(0, 0, 0, 0);
    } else if (filter === "week") {
      since = new Date();
      since.setDate(since.getDate() - 7);
      since.setHours(0, 0, 0, 0);
    } else {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const logs = await prisma.operationLog.findMany({
      where: {
        staff_id: user.id,
        created_at: { gte: since },
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        notes: l.notes,
        created_at: l.created_at.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
