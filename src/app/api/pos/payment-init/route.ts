import { NextRequest, NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/payment-service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireCollector();
    const { subscriber_id, invoice_id, amount } = await req.json();

    if (!subscriber_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriber_id },
      include: { branch: true },
    });
    if (!subscriber) return NextResponse.json({ error: "مشترك غير موجود" }, { status: 404 });

    const branch = subscriber.branch;
    if (!branch.is_online_payment_enabled || branch.active_gateway === "none") {
      return NextResponse.json({ error: "الدفع الإلكتروني غير مفعّل" }, { status: 400 });
    }

    const pricing = await prisma.monthlyPricing.findFirst({
      where: { branch_id: branch.id },
      orderBy: { effective_from: "desc" },
    });
    const billingMonth = pricing ? new Date(pricing.effective_from).getMonth() + 1 : new Date().getMonth() + 1;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
    const callbackPath = branch.active_gateway === "aps" ? "aps-callback" : "furatpay-callback";

    const result = await createPayment(branch as any, {
      invoice_id: invoice_id || null,
      subscriber_id,
      subscriber_name: subscriber.name,
      subscriber_phone: subscriber.phone || "",
      amount,
      billing_month: billingMonth,
      return_url: `${baseUrl}/pos/payment-success?subscriber=${subscriber_id}`,
      callback_url: `${baseUrl}/api/pos/${callbackPath}`,
    });

    await prisma.onlinePayment.create({
      data: {
        subscriber_id,
        tenant_id: subscriber.tenant_id,
        invoice_id: invoice_id || null,
        amount,
        gateway: result.gateway,
        gateway_ref: result.order_id,
        status: "pending",
      },
    });

    return NextResponse.json({ payment_url: result.payment_url, order_id: result.order_id, gateway: result.gateway });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[staff payment-init] Error:", e);
    return NextResponse.json({ error: e.message || "خطأ" }, { status: 500 });
  }
}
