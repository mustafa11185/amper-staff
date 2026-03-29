import { NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireCollector();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTx = await prisma.posTransaction.findMany({
      where: { staff_id: user.id, created_at: { gte: todayStart }, status: "success" },
    });

    const cash = todayTx.filter((t) => t.payment_method === "cash").reduce((a, t) => a + Number(t.amount), 0);
    const total = cash;

    const wallet = await prisma.collectorWallet.findUnique({ where: { staff_id: user.id } });
    const balance = wallet ? Number(wallet.balance) : 0;

    // Get staff photo for report
    const staff = await prisma.staff.findUnique({
      where: { id: user.id },
      select: { photo_url: true },
    });

    const message = [
      `📊 تقرير يومي — ${user.name}`,
      `📅 ${new Date().toLocaleDateString("ar-IQ")}`,
      ``,
      `💵 نقداً: ${cash.toLocaleString()} د.ع`,
      `💰 المجموع: ${total.toLocaleString()} د.ع`,
      `📝 عدد الدفعات: ${todayTx.length}`,
      ``,
      `👛 رصيد المحفظة: ${balance.toLocaleString()} د.ع`,
    ].join("\n");

    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encoded}`;

    return NextResponse.json({
      whatsapp_url: whatsappUrl,
      message_text: message,
      photo_url: staff?.photo_url ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
