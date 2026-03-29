import { NextRequest, NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCollector();
    const { id } = await params;

    const request = await prisma.collectorDiscountRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: request.status,
      discount_amount: Number(request.amount),
      expires_at: request.expires_at.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
