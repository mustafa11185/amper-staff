"use client";

import { useEffect, useState } from "react";
import { Receipt, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["وقود", "زيت", "صيانة", "رواتب", "إيجار", "أخرى"];

export default function MyExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: "وقود", amount: "", description: "" });
  const [saving, setSaving] = useState(false);

  function refresh() {
    fetch("/api/collector/stats")
      .then((r) => r.json())
      .then((d) => {
        setExpenses(d.expenses || []);
        const t = (d.expenses || []).reduce((a: number, e: any) => a + Number(e.amount), 0);
        setTotal(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: form.category, amount: Number(form.amount), description: form.description || undefined }),
      });
      if (res.ok) { toast.success("تم إضافة المصروف"); setShowAdd(false); setForm({ category: "وقود", amount: "", description: "" }); refresh(); }
      else toast.error("خطأ");
    } catch { toast.error("خطأ في الاتصال"); }
    setSaving(false);
  }

  const fmt = (n: number) => Number(n).toLocaleString("en");

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>جاري التحميل...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Receipt className="w-5 h-5" style={{ color: "var(--gold)" }} />
          مصروفاتي
        </h2>
        <button onClick={() => setShowAdd(true)} className="h-8 px-3 rounded-xl text-xs font-bold text-white" style={{ background: "var(--blue-primary)" }}>
          <Plus className="w-3 h-3 inline ml-1" />مصروف
        </button>
      </div>

      <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>مصروفات الشهر</p>
        <p className="font-num text-xl font-bold" style={{ color: "var(--gold)" }}>{fmt(total)} <span className="text-xs" style={{ color: "var(--text-muted)" }}>د.ع</span></p>
      </div>

      <div className="space-y-2">
        {expenses.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>لا توجد مصروفات</p>
        ) : expenses.map((exp: any) => (
          <div key={exp.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
            <div>
              <p className="text-sm font-bold">{exp.category}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{exp.description || "—"} · {new Date(exp.created_at).toLocaleDateString("en")}</p>
            </div>
            <span className="font-num text-sm font-bold" style={{ color: "var(--gold)" }}>{fmt(exp.amount)} د.ع</span>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-[390px] rounded-t-[20px] p-5 pb-8" style={{ background: "var(--bg-surface)" }}>
            <h3 className="text-sm font-bold mb-3">مصروف جديد</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, category: c }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: form.category === c ? "var(--gold)" : "var(--bg-muted)", color: form.category === c ? "#fff" : "var(--text-muted)" }}>
                    {c}
                  </button>
                ))}
              </div>
              <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="المبلغ (د.ع)" dir="ltr"
                className="w-full h-10 px-3 rounded-xl text-sm font-num outline-none" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }} />
              <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="ملاحظات (اختياري)"
                className="w-full h-10 px-3 rounded-xl text-sm outline-none" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-10 rounded-xl text-xs font-bold" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>إلغاء</button>
                <button type="submit" disabled={saving || !form.amount} className="flex-1 h-10 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: "var(--blue-primary)" }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
