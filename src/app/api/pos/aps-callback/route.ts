import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApsSignature } from "@/lib/payment-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchant_reference, status, fort_id, amount, response_code } = body;

    console.log("[staff aps-callback]", JSON.stringify(body, null, 2));

    if (!merchant_reference) return NextResponse.json({ ok: false }, { status: 400 });

    const onlinePayment = await prisma.onlinePayment.findFirst({
      where: { gateway_ref: merchant_reference },
    });
    if (!onlinePayment) return NextResponse.json({ ok: false });

    const isApproved = response_code === "14000" || status === "14";

    if (isApproved) {
      await prisma.$transaction(async (tx) => {
        await tx.onlinePayment.update({
          where: { id: onlinePayment.id },
          data: { status: "success", gateway_ref: fort_id || merchant_reference },
        });
        if (onlinePayment.invoice_id) {
          const invoice = await tx.invoice.findUnique({
            where: { id: onlinePayment.invoice_id },
            include: { subscriber: { select: { name: true } } },
          });
          if (invoice && !invoice.is_fully_paid) {
            const paidAmount = amount ? Number(amount) / 1000 : Number(invoice.total_amount_due);
            await tx.invoice.update({
              where: { id: invoice.id },
              data: { is_fully_paid: true, amount_paid: invoice.total_amount_due, payment_method: "aps" },
            });
            await tx.notification.create({
              data: {
                branch_id: invoice.branch_id, tenant_id: invoice.tenant_id,
                type: "payment_online", title: "دفع إلكتروني",
                body: `${invoice.subscriber?.name ?? ""} دفع إلكترونياً — ${paidAmount.toLocaleString()} د.ع`,
                payload: { invoice_id: invoice.id, fort_id, amount: paidAmount },
              },
            });
          }
        }
        // Note: Online payments do NOT go to CollectorWallet
      });
    } else {
      await prisma.onlinePayment.update({
        where: { id: onlinePayment.id },
        data: { status: "failed", gateway_ref: fort_id || merchant_reference },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[staff aps-callback] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
