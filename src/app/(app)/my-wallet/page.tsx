"use client";

import { useEffect, useState } from "react";
import { Wallet, ArrowDown, ArrowUp } from "lucide-react";

export default function MyWalletPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/collector/wallet-history")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (n: number) => Number(n).toLocaleString("en");

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>جاري التحميل...</div>;
  if (!data) return <div className="p-4 text-center" style={{ color: "var(--text-muted)" }}>لا توجد بيانات</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Balance hero */}
      <div className="rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
        <div className="p-5" style={{ background: data.balance > 0 ? "linear-gradient(135deg, var(--danger), #B91C1C)" : "linear-gradient(135deg, var(--success), #047857)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-white/70" />
            <span className="text-sm font-medium text-white/80">محفظتي</span>
          </div>
          <p className="font-num text-3xl font-bold text-white">{fmt(data.balance)} <span className="text-sm font-normal text-white/50">د.ع</span></p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>المحصّل اليوم</p>
          <p className="font-num text-sm font-bold" style={{ color: "var(--success)" }}>{fmt(data.today_collected)}</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>المحصّل الشهر</p>
          <p className="font-num text-sm font-bold">{fmt(data.month_collected)}</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>المُستلَم</p>
          <p className="font-num text-sm font-bold">{fmt(data.total_delivered)}</p>
        </div>
      </div>

      {/* Transaction log */}
      <div className="rounded-xl" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
        <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-bold">سجل التعاملات</span>
        </div>
        {(!data.deliveries || data.deliveries.length === 0) ? (
          <div className="p-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>لا توجد تعاملات</div>
        ) : data.deliveries.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              {d.received_by_owner ? (
                <ArrowUp className="w-4 h-4" style={{ color: "var(--danger)" }} />
              ) : (
                <ArrowDown className="w-4 h-4" style={{ color: "var(--success)" }} />
              )}
              <div>
                <p className="text-xs font-medium">{d.received_by_owner ? "تسليم للمدير" : "تحصيل"}</p>
                <p className="text-[10px] font-num" style={{ color: "var(--text-muted)" }}>{new Date(d.delivered_at).toLocaleDateString("en")}</p>
              </div>
            </div>
            <span className="font-num text-sm font-bold" style={{ color: d.received_by_owner ? "var(--danger)" : "var(--success)" }}>
              {d.received_by_owner ? "-" : "+"}{fmt(d.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
