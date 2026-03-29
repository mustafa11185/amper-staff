import { NextRequest, NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireCollector();
    const body = await req.json();
    const {
      subscriber_id,
      pay_type,
      amount,
      payment_method,
      client_uuid,
      discount_amount,
      lat,
      lng,
    } = body;

    if (!subscriber_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
    }

    // Dedup check
    if (client_uuid) {
      const existing = await prisma.offlineSyncQueue.findUnique({
        where: { client_uuid },
      });
      if (existing && existing.status === "synced") {
        return NextResponse.json({ ok: true, duplicate: true, conflict: true });
      }
    }

    // Create sync queue entry
    if (client_uuid) {
      await prisma.offlineSyncQueue.upsert({
        where: { client_uuid },
        create: {
          branch_id: user.branchId,
          action_type: "payment",
          payload: body as any,
          client_uuid,
          status: "processing",
        },
        update: { status: "processing" },
      });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriber_id },
    });
    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    // Get active billing month from MonthlyPricing
    const pricing = await prisma.monthlyPricing.findFirst({
      where: { branch_id: user.branchId },
      orderBy: { effective_from: "desc" },
    });
    const billingMonth = pricing
      ? new Date(pricing.effective_from).getMonth() + 1
      : new Date().getMonth() + 1;
    const billingYear = pricing
      ? new Date(pricing.effective_from).getFullYear()
      : new Date().getFullYear();

    let remainingAmount = amount;
    let invoiceId: string | null = null;
    const disc = Number(discount_amount) || 0;

    // Check for existing fully-paid invoice (conflict detection)
    if (pay_type === 'invoice' || pay_type === 'all') {
      const existingPaid = await prisma.invoice.findFirst({
        where: {
          subscriber_id,
          billing_month: billingMonth,
          billing_year: billingYear,
          is_fully_paid: true,
        },
      });
      if (existingPaid && client_uuid) {
        await prisma.offlineSyncQueue.upsert({
          where: { client_uuid },
          create: { branch_id: user.branchId, action_type: 'payment', payload: body as any, client_uuid, status: 'conflict' },
          update: { status: 'conflict' },
        });
        return NextResponse.json({ ok: false, conflict: true, message: 'الفاتورة مدفوعة مسبقاً' });
      }
    }

    // Pay invoice (for 'invoice' or 'all')
    if (pay_type === "invoice" || pay_type === "all") {
      const invoice = await prisma.invoice.findFirst({
        where: {
          subscriber_id,
          billing_month: billingMonth,
          billing_year: billingYear,
          is_fully_paid: false,
        },
      });

      if (invoice) {
        const totalDue = Number(invoice.total_amount_due);
        const alreadyPaid = Number(invoice.amount_paid);
        const due = totalDue - alreadyPaid - disc;
        const payAmount = Math.min(remainingAmount, Math.max(0, due));
        const newPaid = alreadyPaid + payAmount + disc;
        const fullyPaid = newPaid >= totalDue;

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            amount_paid: Math.min(newPaid, totalDue),
            is_fully_paid: fullyPaid,
            payment_method,
            collector_id: user.id,
            ...(disc > 0
              ? {
                  discount_amount: disc,
                  discount_type: "fixed",
                  discount_reason: "خصم جابي",
                }
              : {}),
          },
        });

        invoiceId = invoice.id;
        remainingAmount -= payAmount;
      }
    }

    // Pay debt (for 'debt' or 'all' with remaining)
    if (pay_type === "debt" || (pay_type === "all" && remainingAmount > 0)) {
      const currentDebt = Number(subscriber.total_debt);
      const debtPayment = Math.min(remainingAmount, currentDebt);

      if (debtPayment > 0) {
        await prisma.subscriber.update({
          where: { id: subscriber_id },
          data: { total_debt: Math.max(0, currentDebt - debtPayment) },
        });
        remainingAmount -= debtPayment;
      }
    }

    // Get or create POS device
    let device = await prisma.posDevice.findFirst({
      where: { staff_id: user.id },
    });
    if (!device) {
      device = await prisma.posDevice.create({
        data: {
          staff_id: user.id,
          branch_id: user.branchId,
          tenant_id: user.tenantId,
          serial_number: `STAFF-${user.id.slice(0, 8)}`,
          model: "Staff App",
          status: "active",
        },
      });
    }

    // Create PosTransaction
    await prisma.posTransaction.create({
      data: {
        device_id: device.id,
        invoice_id: invoiceId,
        subscriber_id,
        staff_id: user.id,
        branch_id: user.branchId,
        tenant_id: user.tenantId,
        amount,
        payment_method,
        status: "success",
      },
    });

    // Update CollectorWallet for cash
    if (payment_method === "cash") {
      const wallet = await prisma.collectorWallet.findUnique({
        where: { staff_id: user.id },
      });
      if (wallet) {
        const newCollected = Number(wallet.total_collected) + amount;
        await prisma.collectorWallet.update({
          where: { staff_id: user.id },
          data: {
            total_collected: newCollected,
            balance: newCollected - Number(wallet.total_delivered),
            last_updated: new Date(),
          },
        });
      } else {
        await prisma.collectorWallet.create({
          data: {
            staff_id: user.id,
            branch_id: user.branchId,
            tenant_id: user.tenantId,
            total_collected: amount,
            balance: amount,
            last_updated: new Date(),
          },
        });
      }
    }

    // GPS log
    if (lat && lng) {
      await prisma.staffGpsLog.create({
        data: {
          staff_id: user.id,
          branch_id: user.branchId,
          tenant_id: user.tenantId,
          lat,
          lng,
          source: "payment",
        },
      });
    }

    // Notification
    await prisma.notification.create({
      data: {
        branch_id: user.branchId,
        tenant_id: user.tenantId,
        type: "payment",
        body: `تم استلام ${Number(amount).toLocaleString("en")} د.ع من ${subscriber.name}`,
        is_read: false,
        payload: { staff_id: user.id, subscriber_id, amount, payment_method },
      },
    });

    // Mark sync queue as synced
    if (client_uuid) {
      await prisma.offlineSyncQueue.update({
        where: { client_uuid },
        data: { status: "synced", synced_at: new Date() },
      });
    }

    // Fetch updated subscriber + invoice for cache sync
    const updatedSub = await prisma.subscriber.findUnique({
      where: { id: subscriber_id },
    });

    let updatedInvoice = null;
    if (invoiceId) {
      const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (inv) {
        updatedInvoice = {
          id: inv.id,
          total_amount_due: Number(inv.total_amount_due),
          amount_paid: Number(inv.amount_paid),
          is_fully_paid: inv.is_fully_paid,
          billing_month: inv.billing_month,
          billing_year: inv.billing_year,
        };
      }
    }

    const paidAmount = amount - remainingAmount;

    // Get branch info for receipt
    const branch = await prisma.branch.findUnique({
      where: { id: user.branchId },
      select: { name: true, whatsapp_number: true },
    })

    return NextResponse.json({
      ok: true,
      receipt: {
        subscriber_name: subscriber.name,
        serial_number: subscriber.serial_number,
        paid: paidAmount,
        amount: paidAmount,
        remaining_debt: updatedSub ? Number(updatedSub.total_debt) : 0,
        payment_method,
        discount_applied: disc,
        billing_month: billingMonth,
        billing_year: billingYear,
        branch_name: branch?.name ?? '',
        branch_phone: branch?.whatsapp_number ?? '',
        timestamp: new Date().toISOString(),
      },
      updated_subscriber: updatedSub
        ? {
            total_debt: Number(updatedSub.total_debt),
            current_invoice: updatedInvoice,
          }
        : null,
    });
  } catch (e: any) {
    if (e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Payment error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
