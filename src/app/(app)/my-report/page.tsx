"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { BarChart3, Send, Banknote, Wallet, CalendarCheck, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import toast from "react-hot-toast";

interface Stats {
  today_cash: number;
  today_total: number;
  today_count: number;
  month_collected: number;
  month_delivered: number;
  wallet_balance: number;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export default function MyReportPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [stats, setStats] = useState<Stats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Wallet data
  const [walletData, setWalletData] = useState<any>(null);
  const [walletPeriod, setWalletPeriod] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    fetch(`/api/wallet/my-transactions?period=${walletPeriod}`)
      .then(r => r.json())
      .then(d => setWalletData(d))
      .catch(() => {});
  }, [walletPeriod]);

  // Expense form
  const [showExpense, setShowExpense] = useState(false);
  const [expCategory, setExpCategory] = useState("وقود");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const res = await fetch("/api/collector/stats");
        const data = await res.json();
        setStats(data);
        setExpenses(data.expenses ?? []);
      } catch {
        // offline
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSendReport = async () => {
    try {
      const res = await fetch("/api/collector-report/send", { method: "POST" });
      const data = await res.json();
      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank");
      }
      toast.success("تم إعداد التقرير");
    } catch {
      toast.error("فشل إرسال التقرير");
    }
  };

  const handleAddExpense = async () => {
    if (!expAmount) return;
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expCategory,
          amount: Number(expAmount),
          description: expDesc || undefined,
        }),
      });
      if (res.ok) {
        toast.success("تمت إضافة المصروف");
        setShowExpense(false);
        setExpAmount("");
        setExpDesc("");
        // Refresh
        const statsRes = await fetch("/api/collector/stats");
        const data = await statsRes.json();
        setStats(data);
        setExpenses(data.expenses ?? []);
      }
    } catch {
      toast.error("فشل إضافة المصروف");
    }
  };

  const formatAmount = (n: number) => Number(n).toLocaleString("en") + " د.ع";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <ConflictBanner />
      {/* Wallet Section */}
      {walletData && (
        <>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5" style={{ color: "var(--gold)" }} />
            محفظتي
          </h2>

          {/* Wallet summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: "#FEF2F2", boxShadow: "var(--shadow-md)" }}>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>المحفظة الآن</p>
              <p className="font-num text-base font-bold" style={{ color: "var(--danger)" }}>{formatAmount(walletData.balance)}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>المُستلَم الشهر</p>
              <p className="font-num text-sm font-bold">{formatAmount(walletData.total_delivered)}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>دفعات اليوم</p>
              <p className="font-num text-sm font-bold">{walletData.today_count}</p>
            </div>
          </div>

          {/* Transaction log */}
          <div className="rounded-xl" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
            <div className="flex items-center justify-between p-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="text-sm font-bold">سجل المعاملات</span>
              <div className="flex gap-1">
                {([["today", "اليوم"], ["week", "الأسبوع"], ["month", "الشهر"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setWalletPeriod(k)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: walletPeriod === k ? "var(--blue-primary)" : "var(--bg-muted)", color: walletPeriod === k ? "#fff" : "var(--text-muted)" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {(!walletData.transactions || walletData.transactions.length === 0) ? (
              <p className="text-center py-4 text-xs" style={{ color: "var(--text-muted)" }}>لا توجد معاملات</p>
            ) : walletData.transactions.slice(0, 15).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  {tx.type === "collection" ? (
                    <ArrowDown className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                  ) : (
                    <ArrowUp className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} />
                  )}
                  <div>
                    <p className="text-xs font-medium">{tx.label}</p>
                    <p className="text-[9px] font-num" style={{ color: "var(--text-muted)" }}>{new Date(tx.date).toLocaleDateString("en")}</p>
                  </div>
                </div>
                <span className="font-num text-xs font-bold" style={{ color: tx.type === "collection" ? "var(--success)" : "var(--danger)" }}>
                  {tx.type === "collection" ? "+" : "-"}{Number(tx.amount).toLocaleString("en")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-bold flex items-center gap-2">
        <BarChart3 className="w-5 h-5" style={{ color: "var(--blue-primary)" }} />
        تقريري
      </h2>

      {/* Today */}
      {stats && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <h3 className="text-sm font-medium mb-3">تحصيل اليوم</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4" style={{ color: "var(--success)" }} />
                <span>نقداً</span>
              </div>
              <span className="font-num font-medium">{formatAmount(stats.today_cash)}</span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between text-sm font-bold" style={{ borderColor: "var(--border)" }}>
              <span>المجموع</span>
              <span className="font-num">{formatAmount(stats.today_total)}</span>
            </div>
            <div className="text-xs text-text-muted">
              عدد الدفعات: {stats.today_count}
            </div>
          </div>
        </div>
      )}

      {/* Month */}
      {stats && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <h3 className="text-sm font-medium mb-3">هذا الشهر</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>المحصّل</span>
              <span className="font-num font-medium">{formatAmount(stats.month_collected)}</span>
            </div>
            <div className="flex justify-between">
              <span>المُستلَم هذا الشهر</span>
              <span className="font-num font-medium">{formatAmount(stats.month_delivered)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-1">
                <Wallet className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <span>المحفظة</span>
              </div>
              <span className="font-num" style={{ color: "var(--blue-primary)" }}>
                {formatAmount(stats.wallet_balance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Expenses */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">مصروفاتي</h3>
          <button
            onClick={() => setShowExpense(!showExpense)}
            className="text-xs px-3 py-1 rounded-lg"
            style={{ background: "var(--blue-soft)", color: "var(--blue-primary)" }}
          >
            + إضافة
          </button>
        </div>

        {showExpense && (
          <div className="space-y-2 mb-3 p-3 rounded-lg" style={{ background: "var(--bg-muted)" }}>
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <option value="وقود">وقود</option>
              <option value="طعام">طعام</option>
              <option value="مواصلات">مواصلات</option>
              <option value="صيانة">صيانة</option>
              <option value="أخرى">أخرى</option>
            </select>
            <input
              type="number"
              inputMode="numeric"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              placeholder="المبلغ (د.ع)"
              className="w-full h-10 px-3 rounded-lg text-sm outline-none font-num"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            />
            <input
              type="text"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              placeholder="ملاحظات (اختياري)"
              className="w-full h-10 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            />
            <button
              onClick={handleAddExpense}
              className="w-full h-10 rounded-lg text-white text-sm font-medium"
              style={{ background: "var(--blue-primary)" }}
            >
              حفظ
            </button>
          </div>
        )}

        {expenses.length > 0 ? (
          <div className="space-y-1.5">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex justify-between text-sm py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                <span>{exp.category}</span>
                <span className="font-num">{formatAmount(exp.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-text-muted">لا توجد مصروفات</div>
        )}
      </div>

      {/* Attendance Summary */}
      {stats && (stats as any).attendance && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" style={{ color: "var(--blue-primary)" }} />
            الحضور والتأخير
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>أيام الحضور هذا الشهر</span>
              <span className="font-num font-medium">{(stats as any).attendance.attended_days} يوم</span>
            </div>
            {(stats as any).attendance.late_count > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" style={{ color: "var(--gold)" }} />
                    عدد التأخيرات
                  </span>
                  <span className="font-num font-medium">{(stats as any).attendance.late_count} مرة</span>
                </div>
                <div className="flex justify-between">
                  <span>متوسط التأخير</span>
                  <span className="font-num font-medium">{(stats as any).attendance.avg_late_minutes} دقيقة</span>
                </div>
                <div className="flex justify-between">
                  <span>أكبر تأخير</span>
                  <span className="font-num font-medium">{(stats as any).attendance.max_late_minutes} دقيقة</span>
                </div>
                <div className="flex justify-between border-t pt-2" style={{ borderColor: "var(--border)" }}>
                  <span className="font-bold">مجموع دقائق التأخير</span>
                  <span className="font-num font-bold" style={{ color: "var(--danger)" }}>
                    {(stats as any).attendance.total_late_minutes} دقيقة
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Send Report */}
      <button
        onClick={handleSendReport}
        className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-white font-medium"
        style={{ background: "var(--success)" }}
      >
        <Send className="w-5 h-5" />
        إرسال التقرير للمدير
      </button>
    </div>
  );
}

function ConflictBanner() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    fetch('/api/sync/conflicts')
      .then(r => r.json())
      .then(d => setCount(d.count ?? 0))
      .catch(() => {})
  }, [])
  if (count === 0) return null
  return (
    <div className="rounded-xl p-3 mb-3 flex items-center gap-2" style={{ background: 'rgba(217,119,6,0.1)' }}>
      <span className="text-sm">⚠️</span>
      <span className="text-xs font-bold" style={{ color: '#D97706' }}>{count} دفعات تحتاج مراجعة</span>
    </div>
  )
}
