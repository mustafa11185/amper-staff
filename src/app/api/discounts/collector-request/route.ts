import { NextRequest, NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireCollector();

    if (!user.canGiveDiscount) {
      return NextResponse.json({ error: "لا تملك صلاحية الخصم" }, { status: 403 });
    }

    const { subscriber_id, amount, reason } = await req.json();

    if (!subscriber_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (amount > Number(user.discountMaxAmount)) {
      return NextResponse.json(
        { error: `الحد الأقصى للخصم: ${user.discountMaxAmount} د.ع` },
        { status: 400 }
      );
    }

    const timeoutMin = user.discountTimeoutMin ?? 15;
    const expiresAt = new Date(Date.now() + timeoutMin * 60 * 1000);

    const request = await prisma.collectorDiscountRequest.create({
      data: {
        staff_id: user.id,
        subscriber_id,
        branch_id: user.branchId,
        tenant_id: user.tenantId,
        amount,
        reason: reason ?? null,
        status: "pending",
        expires_at: expiresAt,
      },
    });

    // Notify owner
    await prisma.notification.create({
      data: {
        branch_id: user.branchId,
        tenant_id: user.tenantId,
        type: "discount_request",
        body: `🎁 طلب خصم ${amount} د.ع من ${user.name}`,
        is_read: false,
        payload: {
          request_id: request.id,
          staff_name: user.name,
          amount,
          expires_at: expiresAt.toISOString(),
        },
      },
    });

    return NextResponse.json({
      request_id: request.id,
      expires_at: expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
