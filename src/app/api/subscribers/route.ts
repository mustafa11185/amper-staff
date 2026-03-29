import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireStaff();

    // Must be collector or dual-role
    if (user.role !== "collector" && !user.canCollect) {
      return NextResponse.json({ error: "Not a collector" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const unpaid = searchParams.get("unpaid");
    const alleyId = searchParams.get("alley_id");

    const branchId = user.branchId;
    if (!branchId) {
      return NextResponse.json({ subscribers: [], error: "No branch found" });
    }

    console.log(`[subscribers API] branchId=${branchId}, tenantId=${user.tenantId}, role=${user.role}`);

    // Get active pricing for billing month
    const activePricing = await prisma.monthlyPricing.findFirst({
      where: { branch_id: branchId },
      orderBy: { effective_from: "desc" },
    });

    const billingMonth = activePricing
      ? new Date(activePricing.effective_from).getMonth() + 1
      : new Date().getMonth() + 1;
    const billingYear = activePricing
      ? new Date(activePricing.effective_from).getFullYear()
      : new Date().getFullYear();

    // Build where clause
    const where: any = {
      branch_id: branchId,
      is_active: true,
    };

    if (type === "gold" || type === "normal") {
      where.subscription_type = type;
    }
    if (alleyId) {
      where.alley_id = alleyId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { serial_number: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // Single query with invoices included
    const subscribers = await prisma.subscriber.findMany({
      where,
      orderBy: { total_debt: "desc" },
      include: {
        invoices: {
          where: {
            billing_month: billingMonth,
            billing_year: billingYear,
          },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    console.log(`[subscribers API] Found ${subscribers.length} subscribers for month=${billingMonth}/${billingYear}`);

    let result = subscribers.map((s) => {
      const inv = s.invoices[0] ?? null;
      return {
        id: s.id,
        serial_number: s.serial_number,
        name: s.name,
        phone: s.phone,
        alley: s.alley,
        alley_id: s.alley_id,
        amperage: Number(s.amperage),
        subscription_type: s.subscription_type,
        total_debt: Number(s.total_debt),
        branch_id: s.branch_id,
        gps_lat: s.gps_lat ? Number(s.gps_lat) : null,
        gps_lng: s.gps_lng ? Number(s.gps_lng) : null,
        province_key: s.province_key,
        district_key: s.district_key,
        current_invoice: inv
          ? {
              id: inv.id,
              total_amount_due: Number(inv.total_amount_due),
              amount_paid: Number(inv.amount_paid),
              is_fully_paid: inv.is_fully_paid,
              billing_month: inv.billing_month,
              billing_year: inv.billing_year,
            }
          : null,
      };
    });

    // Filter unpaid
    if (unpaid === "true" || status === "unpaid") {
      result = result.filter(
        (s) => !s.current_invoice || !s.current_invoice.is_fully_paid
      );
    }

    return NextResponse.json({ subscribers: result, billing_month: billingMonth, billing_year: billingYear });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
