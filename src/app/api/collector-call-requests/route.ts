import { NextRequest, NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireCollector();

    // Auto-expire requests older than 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.collectorCallRequest.updateMany({
      where: {
        branch_id: user.branchId,
        status: "pending",
        requested_at: { lt: twentyFourHoursAgo },
      },
      data: { status: "expired" },
    });

    // Fetch only pending (non-expired) requests
    const requests = await prisma.collectorCallRequest.findMany({
      where: {
        branch_id: user.branchId,
        status: "pending",
      },
      include: {
        subscriber: {
          select: { name: true, serial_number: true, address: true, phone: true, alley: true },
        },
      },
      orderBy: { requested_at: "desc" },
      take: 20,
    });

    return NextResponse.json({
      requests: requests.map((r: any) => ({
        id: r.id,
        subscriber_name: r.subscriber.name,
        subscriber_serial: r.subscriber.serial_number,
        subscriber_address: r.subscriber.address || r.subscriber.alley || "",
        subscriber_phone: r.subscriber.phone,
        requested_at: r.requested_at.toISOString(),
        status: r.status,
      })),
      count: requests.length,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireCollector();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.collectorCallRequest.update({
      where: { id },
      data: { status: "resolved", resolved_at: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
