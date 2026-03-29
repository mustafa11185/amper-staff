"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, CreditCard, Phone, Banknote, MapPin, Pencil, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface SubDetail {
  id: string;
  serial_number: string;
  name: string;
  phone: string | null;
  alley: string | null;
  amperage: number;
  subscription_type: string;
  total_debt: number;
  gps_lat: number | null;
  gps_lng: number | null;
  current_invoice: {
    id: string;
    total_amount_due: number;
    amount_paid: number;
    is_fully_paid: boolean;
    billing_month: number;
    billing_year: number;
  } | null;
}

export default function SubscriberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const user = session?.user as any;
  const isOwner = user?.role === "owner";

  const [sub, setSub] = useState<SubDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Debt edit modal
  const [showDebtEdit, setShowDebtEdit] = useState(false);
  const [debtInput, setDebtInput] = useState("");
  const [debtReason, setDebtReason] = useState("");
  const [savingDebt, setSavingDebt] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/subscribers/${id}`);
        const data = await res.json();
        setSub(data.subscriber ?? data);
      } catch {
        // offline
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const fmt = (n: number) => Number(n).toLocaleString("en") + " د.ع";

  const handleLocation = () => {
    if (sub?.gps_lat && sub?.gps_lng) {
      window.open(`https://maps.google.com/?q=${sub.gps_lat},${sub.gps_lng}`, "_blank");
    } else {
      toast.error("لا يوجد موقع محفوظ");
    }
  };

  const handleSaveDebt = async () => {
    if (!debtReason.trim()) { toast.error("السبب مطلوب"); return; }
    setSavingDebt(true);
    try {
      const res = await fetch(`/api/subscribers/${id}/debt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(debtInput), reason: debtReason }),
      });
      if (res.ok) {
        const data = await res.json();
        setSub((prev) => prev ? { ...prev, total_debt: data.new_debt } : prev);
        setShowDebtEdit(false);
        setDebtInput("");
        setDebtReason("");
        toast.success("تم تعديل الدين");
      } else {
        const err = await res.json();
        toast.error(err.error || "فشل التعديل");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    }
    setSavingDebt(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
        جاري التحميل...
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="p-4 text-center" style={{ color: "var(--text-muted)" }}>لم يتم العثور على المشترك</div>
    );
  }

  const invoiceDue = sub.current_invoice
    ? sub.current_invoice.total_amount_due - sub.current_invoice.amount_paid
    : 0;
  const grandTotal = sub.total_debt + (sub.current_invoice && !sub.current_invoice.is_fully_paid ? invoiceDue : 0);

  return (
    <div className="p-4 space-y-4">
      <Link href="/subscribers" className="flex items-center gap-1 text-sm" style={{ color: "var(--text-muted)" }}>
        <ArrowRight className="w-4 h-4" /> العودة
      </Link>

      {/* Header */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">{sub.name}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleLocation} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-muted)" }} title="الموقع">
              <MapPin className="w-4 h-4" style={{ color: sub.gps_lat ? "var(--blue-primary)" : "var(--text-muted)" }} />
            </button>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: sub.subscription_type === "gold" ? "var(--gold-soft)" : "var(--blue-soft)", color: sub.subscription_type === "gold" ? "var(--gold)" : "var(--blue-primary)" }}>
              {sub.subscription_type === "gold" ? "ذهبي" : "عادي"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>الأمبير</span>
            <div className="font-num">{sub.amperage}A</div>
          </div>
          {sub.alley && (
            <div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>الزقاق</span>
              <div>{sub.alley}</div>
            </div>
          )}
        </div>
      </div>

      {/* Debt card with two buttons */}
      {sub.total_debt > 0 && (
        <div className="rounded-xl p-4" style={{ background: "#FEF2F2" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>الديون السابقة</div>
          <div className="text-xl font-bold font-num mb-3" style={{ color: "var(--danger)" }}>
            {fmt(sub.total_debt)}
          </div>
          <div className="flex gap-2">
            <Link href={`/pos?subscriber=${sub.id}&type=debt`}
              className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-white text-xs font-bold"
              style={{ background: "var(--danger)" }}>
              <Banknote className="w-4 h-4" /> دفع الدين
            </Link>
            {isOwner && (
              <button onClick={() => { setDebtInput(String(sub.total_debt)); setShowDebtEdit(true); }}
                className="flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-xs font-bold"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <Pencil className="w-3.5 h-3.5" /> تعديل الدين
              </button>
            )}
          </div>
        </div>
      )}

      {/* Debt = 0 but owner can still edit */}
      {sub.total_debt === 0 && isOwner && (
        <button onClick={() => { setDebtInput("0"); setShowDebtEdit(true); }}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl"
          style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          <Pencil className="w-3.5 h-3.5" /> تعديل الدين
        </button>
      )}

      {/* Debt edit modal */}
      {showDebtEdit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-[390px] rounded-t-[20px] p-5 pb-8" style={{ background: "var(--bg-surface)" }}>
            <h3 className="text-sm font-bold mb-3">تعديل الدين</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>المبلغ الجديد (د.ع)</label>
                <input type="number" value={debtInput} onChange={(e) => setDebtInput(e.target.value)} dir="ltr"
                  className="w-full h-12 px-3 rounded-xl font-num text-lg text-center outline-none"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>السبب (مطلوب)</label>
                <input type="text" value={debtReason} onChange={(e) => setDebtReason(e.target.value)}
                  placeholder="مثال: تسوية حساب..."
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowDebtEdit(false)}
                  className="flex-1 h-10 rounded-xl text-xs font-bold" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>
                  إلغاء
                </button>
                <button onClick={handleSaveDebt} disabled={savingDebt}
                  className="flex-1 h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60"
                  style={{ background: "var(--blue-primary)" }}>
                  {savingDebt ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Invoice */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
        <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>فاتورة الشهر</div>
        {sub.current_invoice ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-num">{sub.current_invoice.billing_month}/{sub.current_invoice.billing_year}</span>
              {sub.current_invoice.is_fully_paid ? (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#ECFDF5", color: "var(--success)" }}>مدفوعة</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#FEF2F2", color: "var(--danger)" }}>غير مدفوعة</span>
              )}
            </div>
            {!sub.current_invoice.is_fully_paid && (
              <div className="text-lg font-bold font-num mt-1">{fmt(invoiceDue)}</div>
            )}
          </div>
        ) : (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>لا توجد فاتورة</div>
        )}
      </div>

      {grandTotal > 0 && (
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          <span className="text-sm font-medium">المجموع المستحق</span>
          <span className="text-lg font-bold font-num" style={{ color: "var(--danger)" }}>{fmt(grandTotal)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Link href={`/pos?subscriber=${sub.id}`}
          className="flex items-center justify-center gap-2 h-12 rounded-xl text-white font-medium w-full"
          style={{ background: "var(--blue-primary)" }}>
          <CreditCard className="w-5 h-5" /> استلام دفعة
        </Link>
        {sub.phone && (
          <a href={`tel:${sub.phone}`}
            className="flex items-center justify-center gap-2 h-12 rounded-xl font-medium w-full"
            style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
            <Phone className="w-4 h-4" /> اتصال
          </a>
        )}
      </div>
    </div>
  );
}
