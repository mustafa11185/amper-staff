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

    const subscriber = await prisma.subscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Use MonthlyPricing for billing month
    const pricing = await prisma.monthlyPricing.findFirst({
      where: { branch_id: subscriber.branch_id },
      orderBy: { effective_from: "desc" },
    });
    const month = pricing
      ? new Date(pricing.effective_from).getMonth() + 1
      : new Date().getMonth() + 1;
    const year = pricing
      ? new Date(pricing.effective_from).getFullYear()
      : new Date().getFullYear();

    const invoice = await prisma.invoice.findFirst({
      where: {
        subscriber_id: id,
        billing_month: month,
        billing_year: year,
      },
    });

    return NextResponse.json({
      subscriber: {
        ...subscriber,
        amperage: Number(subscriber.amperage),
        total_debt: Number(subscriber.total_debt),
        gps_lat: subscriber.gps_lat ? Number(subscriber.gps_lat) : null,
        gps_lng: subscriber.gps_lng ? Number(subscriber.gps_lng) : null,
        current_invoice: invoice
          ? {
              id: invoice.id,
              total_amount_due: Number(invoice.total_amount_due),
              amount_paid: Number(invoice.amount_paid),
              remaining: Math.max(0, Number(invoice.total_amount_due) - Number(invoice.amount_paid)),
              is_fully_paid: invoice.is_fully_paid,
              billing_month: invoice.billing_month,
              billing_year: invoice.billing_year,
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
