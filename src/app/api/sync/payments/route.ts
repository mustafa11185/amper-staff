import { NextRequest, NextResponse } from "next/server";
import { requireCollector } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    await requireCollector();
    const body = await req.json();
    const { payments } = body;

    if (!Array.isArray(payments)) {
      return NextResponse.json({ error: "payments array required" }, { status: 400 });
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const payment of payments) {
      try {
        const res = await fetch(new URL("/api/pos/payment", req.url), {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
          body: JSON.stringify(payment),
        });
        if (res.ok) {
          synced++;
        } else {
          failed++;
          errors.push(`${payment.client_uuid}: ${res.statusText}`);
        }
      } catch {
        failed++;
        errors.push(`${payment.client_uuid}: network error`);
      }
    }

    return NextResponse.json({ synced, failed, errors });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
