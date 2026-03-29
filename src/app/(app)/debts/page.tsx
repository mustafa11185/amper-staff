"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CreditCard } from "lucide-react";

export default function DebtsPage() {
  const router = useRouter();
  const [debtors, setDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscribers?unpaid=true")
      .then((r) => r.json())
      .then((d) => {
        const subs = (d.subscribers || [])
          .filter((s: any) => Number(s.total_debt) > 0)
          .sort((a: any, b: any) => Number(b.total_debt) - Number(a.total_debt));
        setDebtors(subs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalDebt = debtors.reduce((a, d) => a + Number(d.total_debt), 0);
  const fmt = (n: number) => Number(n).toLocaleString("en");

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>جاري التحميل...</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" style={{ color: "var(--danger)" }} />
        الديون
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: "#FEF2F2", boxShadow: "var(--shadow-md)" }}>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>إجمالي الديون</p>
          <p className="font-num text-lg font-bold" style={{ color: "var(--danger)" }}>{fmt(totalDebt)} د.ع</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>عدد المدينين</p>
          <p className="font-num text-lg font-bold">{debtors.length}</p>
        </div>
      </div>

      <div className="space-y-2">
        {debtors.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>لا يوجد مدينون</p>
        ) : debtors.map((d) => (
          <button key={d.id} onClick={() => router.push(`/pos?subscriber=${d.id}&type=debt`)}
            className="w-full rounded-xl p-3 flex items-center justify-between"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
            <div>
              <p className="text-sm font-bold">{d.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{d.alley || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-num text-sm font-bold" style={{ color: "var(--danger)" }}>{fmt(Number(d.total_debt))}</span>
              <CreditCard className="w-4 h-4" style={{ color: "var(--blue-primary)" }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
