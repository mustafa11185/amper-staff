import { getPendingPayments, removePendingPayment } from "./offline";

export async function syncPendingPayments() {
  const pending = await getPendingPayments();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const payment of pending) {
    try {
      const res = await fetch("/api/pos/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      });
      if (res.ok) {
        await removePendingPayment(payment.client_uuid);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
