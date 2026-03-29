"use client";
import { Suspense } from 'react'
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Banknote,
  Gift,
  Loader2,
  Printer,
  MessageCircle,
  ChevronRight,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  Check,
  CreditCard,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getCachedSubscribers,
  queuePayment,
  updateCachedSubscriber,
  cacheSubscribers,
  getLastSyncTime,
} from "@/lib/offline";
import { printReceipt, getArabicMonth, formatWhatsAppReceipt } from "@/lib/printer";
import type { ReceiptData } from "@/lib/printer";
import { openWhatsApp } from "@/lib/whatsapp";

interface Subscriber {
  id: string;
  serial_number: string;
  name: string;
  phone: string | null;
  subscription_type: string;
  amperage: number;
  total_debt: number;
  alley: string | null;
  alley_id: string | null;
  branch_id: string;
  current_invoice: {
    id: string;
    total_amount_due: number;
    amount_paid: number;
    is_fully_paid: boolean;
  } | null;
}

type PayType = "invoice" | "debt" | "all";
type Step = "search" | "amount" | "success";

const fmt = (n: number) => Number(n).toLocaleString("en");

function POSPageContent() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedId = searchParams?.get("subscriber") ?? null;
  const urlPayType = searchParams?.get("type") ?? null;

  const [step, setStep] = useState<Step>("search");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Subscriber | null>(null);
  const [payType, setPayType] = useState<PayType>("invoice");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [geofenceWarning, setGeofenceWarning] = useState<{ distance: number; radius: number } | null>(null);

  // Fix 4: Track paid subscriber IDs for visual feedback
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());

  // Fix 7: Last sync time
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fix 2: Ref to prevent double-tap
  const paymentInFlight = useRef(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<"" | "gold" | "normal">("");
  const [alleyFilter, setAlleyFilter] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  // Discount
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountReason, setDiscountReason] = useState("");

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Geofence check on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch('/api/geofence-check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            })
            if (res.ok) {
              const data = await res.json()
              if (!data.isWithin) {
                setGeofenceWarning({ distance: data.distance, radius: data.radius })
              }
            }
          } catch { }
        },
        () => { },
        { enableHighAccuracy: true }
      )
    }
  }, [])

  // Load subscribers
  const loadSubscribers = useCallback(async () => {
    if (!user?.branchId) return;
    try {
      if (navigator.onLine) {
        setRefreshing(true);
        const res = await fetch("/api/subscribers");
        const data = await res.json();
        const subs = data.subscribers ?? [];
        setSubscribers(subs);
        await cacheSubscribers(subs);
        setRefreshing(false);
      } else {
        const cached = await getCachedSubscribers(user.branchId);
        setSubscribers(cached as Subscriber[]);
      }
    } catch {
      const cached = await getCachedSubscribers(user.branchId);
      setSubscribers(cached as Subscriber[]);
      setRefreshing(false);
    }
    const syncTime = await getLastSyncTime();
    setLastSync(syncTime);
  }, [user?.branchId]);

  useEffect(() => { loadSubscribers(); }, [loadSubscribers]);

  // Fix 7: Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && step === "search") loadSubscribers();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadSubscribers, step]);

  useEffect(() => {
    if (preSelectedId && subscribers.length > 0) {
      const sub = subscribers.find((s) => s.id === preSelectedId);
      if (sub) selectSubscriber(sub, urlPayType === "debt" ? "debt" : undefined);
    }
  }, [preSelectedId, subscribers, urlPayType]);

  const alleys = useMemo(() => {
    const map = new Map<string, { id: string; name: string; total: number; unpaid: number }>();
    for (const s of subscribers) {
      if (s.alley) {
        const key = s.alley_id ?? s.alley;
        const existing = map.get(key);
        const isUnpaid = !s.current_invoice || !s.current_invoice.is_fully_paid;
        map.set(key, {
          id: key, name: s.alley,
          total: (existing?.total ?? 0) + 1,
          unpaid: (existing?.unpaid ?? 0) + (isUnpaid ? 1 : 0),
        });
      }
    }
    return Array.from(map.values());
  }, [subscribers]);

  const filtered = useMemo(() => {
    let result = [...subscribers];
    if (query.length >= 2) {
      const q = query.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.serial_number.includes(q) || s.phone?.includes(q));
    }
    if (typeFilter === "gold") result = result.filter((s) => s.subscription_type === "gold");
    if (typeFilter === "normal") result = result.filter((s) => s.subscription_type === "normal");
    if (alleyFilter) result = result.filter((s) => (s.alley_id ?? s.alley) === alleyFilter);
    if (unpaidOnly) result = result.filter((s) => !s.current_invoice || !s.current_invoice.is_fully_paid);
    result.sort((a, b) => b.total_debt - a.total_debt);
    return result;
  }, [subscribers, query, typeFilter, alleyFilter, unpaidOnly]);

  const monthlyDue = selected?.current_invoice
    ? (selected.current_invoice as any).remaining ?? (selected.current_invoice.total_amount_due - selected.current_invoice.amount_paid)
    : 0;
  const noInvoice = selected && !selected.current_invoice;

  function selectSubscriber(sub: Subscriber, forceType?: "debt") {
    if (submitting) return; // Fix 5: block during payment
    setSelected(sub);
    setStep("amount");
    setAppliedDiscount(0);
    const invoiceDue = sub.current_invoice ? sub.current_invoice.total_amount_due - sub.current_invoice.amount_paid : 0;
    const debt = sub.total_debt;
    if (forceType === "debt" && debt > 0) { setPayType("debt"); setAmount(String(debt)); }
    else if (invoiceDue > 0) { setPayType("invoice"); setAmount(String(invoiceDue)); }
    else if (debt > 0) { setPayType("debt"); setAmount(String(debt)); }
    else { setPayType("all"); setAmount("0"); }
  }

  function selectPayType(type: PayType) {
    if (!selected) return;
    setPayType(type);
    const debt = selected.total_debt;
    if (type === "invoice") setAmount(String(Math.max(0, monthlyDue - appliedDiscount)));
    else if (type === "debt") setAmount(String(debt));
    else setAmount(String(Math.max(0, monthlyDue - appliedDiscount) + debt));
  }

  function applyDiscount() {
    const disc = Number(discountInput);
    if (!disc || disc <= 0 || !selected) return;
    const maxDisc = Number(user?.discountMaxAmount ?? 0);
    const val = Math.min(disc, maxDisc, monthlyDue);
    setAppliedDiscount(val);
    if (payType === "invoice") setAmount(String(Math.max(0, monthlyDue - val)));
    else if (payType === "all") setAmount(String(Math.max(0, monthlyDue - val) + selected.total_debt));
    fetch("/api/discounts/collector-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriber_id: selected.id, amount: val, reason: discountReason || undefined }),
    }).catch(() => { });
    setShowDiscount(false);
    setDiscountInput("");
    setDiscountReason("");
    toast.success(`تم تطبيق خصم ${fmt(val)} د.ع — بانتظار موافقة المدير`);
  }

  // Fix 1+2+3: Payment with optimistic update + double-tap prevention + dedup
  async function handlePayment(method: "cash") {
    if (!selected || !amount || Number(amount) <= 0) return;
    if (paymentInFlight.current) return; // Fix 2: prevent double-tap
    paymentInFlight.current = true;
    setSubmitting(true);

    const numAmount = Number(amount);
    const clientUuid = crypto.randomUUID();
    const payment = {
      subscriber_id: selected.id,
      pay_type: payType,
      amount: numAmount,
      payment_method: method,
      client_uuid: clientUuid, // Fix 3: unique dedup key
      discount_amount: appliedDiscount,
    };

    // Fix 1: Optimistic update BEFORE server response
    const optimisticDebt = payType === "invoice"
      ? selected.total_debt
      : Math.max(0, selected.total_debt - numAmount);
    const optimisticInvoice = (payType === "invoice" || payType === "all")
      ? { ...selected.current_invoice!, is_fully_paid: true, amount_paid: selected.current_invoice?.total_amount_due ?? 0 }
      : selected.current_invoice;

    await updateCachedSubscriber(selected.id, {
      total_debt: optimisticDebt,
      current_invoice: optimisticInvoice,
    });

    // Fix 4: Immediately mark as paid in local list
    setPaidIds((prev) => new Set(prev).add(selected.id));
    setSubscribers((prev) =>
      prev.map((s) =>
        s.id === selected.id
          ? { ...s, total_debt: optimisticDebt, current_invoice: optimisticInvoice }
          : s
      )
    );

    if (navigator.onLine) {
      try {
        const res = await fetch("/api/pos/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payment),
        });
        if (res.ok) {
          const data = await res.json();
          setReceiptData({ ...data.receipt, discount_applied: appliedDiscount });
          // Update cache with authoritative server data
          if (data.updated_subscriber) {
            await updateCachedSubscriber(selected.id, {
              total_debt: data.updated_subscriber.total_debt,
              current_invoice: data.updated_subscriber.current_invoice ?? null,
            });
            setSubscribers((prev) =>
              prev.map((s) =>
                s.id === selected.id
                  ? { ...s, total_debt: data.updated_subscriber.total_debt, current_invoice: data.updated_subscriber.current_invoice }
                  : s
              )
            );
          }
          setStep("success");
          toast.success("تم الاستلام!");
        } else {
          const err = await res.json();
          toast.error(err.error || "حدث خطأ في الدفع");
          // Revert optimistic update on error
          await updateCachedSubscriber(selected.id, {
            total_debt: selected.total_debt,
            current_invoice: selected.current_invoice,
          });
          setSubscribers((prev) =>
            prev.map((s) => s.id === selected.id ? selected : s)
          );
          setPaidIds((prev) => { const n = new Set(prev); n.delete(selected.id); return n; });
        }
      } catch {
        // Network error — keep optimistic update, queue offline
        await queuePayment(payment);
        setReceiptData({
          subscriber_name: selected.name,
          paid: numAmount,
          remaining_debt: optimisticDebt,
          offline: true,
        });
        setStep("success");
        toast.success("تم تسجيل الدفعة — ستُرفع عند عودة الاتصال");
      }
    } else {
      await queuePayment(payment);
      setReceiptData({
        subscriber_name: selected.name,
        paid: numAmount,
        remaining_debt: optimisticDebt,
        offline: true,
      });
      setStep("success");
      toast.success("تم تسجيل الدفعة — ستُرفع عند عودة الاتصال");
    }

    setSubmitting(false);
    paymentInFlight.current = false;
  }

  // Fix 6: Reset goes to subscriber list, not back to POS search
  function resetFlow() {
    setStep("search");
    setSelected(null);
    setAmount("");
    setQuery("");
    setReceiptData(null);
    setShowDiscount(false);
    setDiscountInput("");
    setAppliedDiscount(0);
  }

  function goToSubscribers() {
    router.push("/subscribers");
  }

  // Fix 7: Format last sync time
  const syncAgo = useMemo(() => {
    if (!lastSync) return null;
    const diff = Date.now() - new Date(lastSync).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "الآن";
    if (min < 60) return `${min} دقيقة`;
    return `${Math.floor(min / 60)} ساعة`;
  }, [lastSync]);

  // ── STEP 1: Search ──
  if (step === "search") {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">نقطة الدفع</h1>
          {/* Fix 7: Sync status + refresh */}
          <div className="flex items-center gap-2">
            {syncAgo && (
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                آخر تحديث: منذ {syncAgo}
              </span>
            )}
            <button
              onClick={loadSubscribers}
              disabled={refreshing}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--bg-muted)" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} style={{ color: "var(--blue-primary)" }} />
            </button>
          </div>
        </div>

        {isOffline && (
          <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "var(--gold-soft)" }}>
            <WifiOff className="w-4 h-4" style={{ color: "var(--gold)" }} />
            <span className="text-xs font-medium">لا يوجد اتصال — الدفعات ستُحفظ محلياً</span>
          </div>
        )}

        {geofenceWarning && (
          <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <span className="text-sm">⚠️</span>
            <span className="text-xs font-bold" style={{ color: '#EF4444' }}>
              أنت خارج منطقة العمل ({geofenceWarning.distance}م) — النطاق المسموح: {geofenceWarning.radius}م
            </span>
          </div>
        )}

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو الرقم أو الهاتف..." autoFocus
            className="w-full h-11 pr-10 pl-4 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
        </div>

        <div className="flex gap-2">
          {([{ key: "" as const, label: "الكل" }, { key: "gold" as const, label: "ذهبي" }, { key: "normal" as const, label: "عادي" }]).map((chip) => (
            <button key={chip.key} onClick={() => setTypeFilter(chip.key)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: typeFilter === chip.key ? (chip.key === "gold" ? "var(--gold)" : "var(--blue-primary)") : "var(--bg-surface)",
                color: typeFilter === chip.key ? "#fff" : "var(--text-muted)",
                border: `1px solid ${typeFilter === chip.key ? (chip.key === "gold" ? "var(--gold)" : "var(--blue-primary)") : "var(--border)"}`,
              }}>{chip.label}</button>
          ))}
          <button onClick={() => setUnpaidOnly((v) => !v)}
            className="mr-auto px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1"
            style={{
              background: unpaidOnly ? "var(--danger)" : "var(--bg-surface)",
              color: unpaidOnly ? "#fff" : "var(--text-muted)",
              border: `1px solid ${unpaidOnly ? "var(--danger)" : "var(--border)"}`,
            }}>{unpaidOnly ? "✓ " : ""}غير المدفوعين</button>
        </div>

        {alleys.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button onClick={() => setAlleyFilter("")}
              className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-medium"
              style={{ background: !alleyFilter ? "var(--violet)" : "var(--bg-surface)", color: !alleyFilter ? "#fff" : "var(--text-muted)", border: `1px solid ${!alleyFilter ? "var(--violet)" : "var(--border)"}` }}>
              كل الأزقة
            </button>
            {alleys.map((a) => (
              <button key={a.id} onClick={() => setAlleyFilter(alleyFilter === a.id ? "" : a.id)}
                className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-medium"
                style={{ background: alleyFilter === a.id ? "var(--violet)" : "var(--bg-surface)", color: alleyFilter === a.id ? "#fff" : "var(--text-muted)", border: `1px solid ${alleyFilter === a.id ? "var(--violet)" : "var(--border)"}` }}>
                {a.name}
                {a.unpaid > 0 && <span className="font-num text-[10px] mr-0.5" style={{ color: alleyFilter === a.id ? "rgba(255,255,255,0.8)" : "var(--danger)" }}>({a.unpaid})</span>}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-center text-xs py-4" style={{ color: "var(--text-muted)" }}>لا توجد نتائج</p>}
          {filtered.slice(0, 30).map((sub) => {
            const isPaid = paidIds.has(sub.id);
            return (
              <button key={sub.id}
                onClick={() => selectSubscriber(sub)}
                disabled={submitting} // Fix 5: block during active payment
                className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-right relative disabled:opacity-60"
                style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
                {/* Fix 4: Paid badge */}
                {isPaid && (
                  <div className="absolute top-2 left-2">
                    <CheckCircle2 className="w-5 h-5" style={{ color: "var(--success)" }} />
                  </div>
                )}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isPaid ? "#ECFDF5" : "var(--bg-muted)" }}>
                  <span className="text-sm font-bold" style={{ color: isPaid ? "var(--success)" : "var(--text-muted)" }}>{sub.name?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{sub.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className="font-num">{sub.amperage}</span> أمبير{" · "}
                    <span style={{ color: sub.subscription_type === "gold" ? "var(--gold)" : "var(--blue-primary)" }}>
                      {sub.subscription_type === "gold" ? "ذهبي" : "عادي"}
                    </span>
                    {sub.alley && <span style={{ opacity: 0.6 }}> · {sub.alley}</span>}
                  </p>
                </div>
                {sub.total_debt > 0 && !isPaid && (
                  <div className="text-left shrink-0">
                    <p className="font-num text-sm font-bold" style={{ color: "var(--danger)" }}>
                      {fmt(sub.total_debt)}<span className="text-[10px] mr-0.5">د.ع</span>
                    </p>
                  </div>
                )}
                {isPaid && (
                  <span className="text-xs font-bold shrink-0" style={{ color: "var(--success)" }}>تم الدفع</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── STEP 2: Amount + Payment ──
  if (step === "amount" && selected) {
    const debt = selected.total_debt;
    const effectiveMonthly = Math.max(0, monthlyDue - appliedDiscount);
    const allTotal = effectiveMonthly + debt;
    const numAmount = Number(amount) || 0;

    return (
      <div className="p-4 pb-44 space-y-4">
        <button onClick={() => { setStep("search"); setSelected(null); setAppliedDiscount(0); }}
          disabled={submitting}
          className="text-sm flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <ChevronRight className="w-3.5 h-3.5" /> رجوع
        </button>

        {/* No invoice warning */}
        {noInvoice && monthlyDue === 0 && (
          <div className="rounded-2xl p-3 text-center" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <p className="text-xs font-bold" style={{ color: "#92400E" }}>لا توجد فاتورة — قم بإصدار الفواتير أولاً</p>
          </div>
        )}

        {/* Amount at TOP */}
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          {payType === "debt" ? (
            <>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>المبلغ المدفوع</label>
              <input type="number" value={amount}
                onChange={(e) => { const v = e.target.value; if (v === "" || (Number(v) >= 0 && Number(v) <= debt)) setAmount(v); }}
                dir="ltr" disabled={submitting}
                className="w-full h-14 text-center font-num text-3xl font-bold rounded-xl outline-none disabled:opacity-50"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--danger)" }} />
              <p className="text-[10px] mt-1.5 text-center" style={{ color: "var(--text-muted)" }}>
                الدين الكلي: <span className="font-num font-bold" style={{ color: "var(--danger)" }}>{fmt(debt)}</span> د.ع — يمكنك دفع جزء منه
              </p>
            </>
          ) : (
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>المبلغ المستحق</p>
              <p className="font-num text-3xl font-bold">
                {fmt(numAmount)}<span className="text-sm mr-1" style={{ color: "var(--text-muted)" }}>د.ع</span>
              </p>
              {appliedDiscount > 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--success)" }}>
                  خصم: {fmt(appliedDiscount)} د.ع — بانتظار موافقة المدير
                </p>
              )}
            </div>
          )}
        </div>

        {/* Subscriber card */}
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{selected.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{selected.subscription_type === "gold" ? "ذهبي" : "عادي"} · {selected.amperage}A</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: selected.subscription_type === "gold" ? "var(--gold-soft)" : "var(--blue-soft)", color: selected.subscription_type === "gold" ? "var(--gold)" : "var(--blue-primary)" }}>
              {selected.subscription_type === "gold" ? "ذهبي" : "عادي"}
            </span>
          </div>
        </div>

        {/* Payment type cards */}
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>نوع الدفعة</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => selectPayType("invoice")} disabled={effectiveMonthly <= 0 || submitting}
              className="rounded-2xl p-3 text-center transition-all disabled:opacity-30"
              style={{ background: payType === "invoice" ? "var(--blue-primary)" : "var(--bg-surface)", color: payType === "invoice" ? "#fff" : undefined, border: `1px solid ${payType === "invoice" ? "var(--blue-primary)" : "var(--border)"}`, boxShadow: payType === "invoice" ? "0 4px 20px rgba(27,79,216,0.2)" : "var(--shadow-md)" }}>
              <p className="text-[10px] mb-1 opacity-80">فاتورة الشهر</p>
              <p className="font-num text-base font-bold" style={payType !== "invoice" ? { color: "var(--blue-primary)" } : {}}>{fmt(effectiveMonthly)}</p>
              <p className="text-[9px] opacity-60">د.ع</p>
            </button>
            <button onClick={() => selectPayType("debt")} disabled={debt <= 0 || submitting}
              className="rounded-2xl p-3 text-center transition-all disabled:opacity-30"
              style={{ background: payType === "debt" ? "var(--danger)" : "var(--bg-surface)", color: payType === "debt" ? "#fff" : undefined, border: `1px solid ${payType === "debt" ? "var(--danger)" : "var(--border)"}`, boxShadow: payType === "debt" ? "0 4px 20px rgba(220,38,38,0.2)" : "var(--shadow-md)" }}>
              <p className="text-[10px] mb-1 opacity-80">الديون</p>
              <p className="font-num text-base font-bold" style={payType !== "debt" ? { color: "var(--danger)" } : {}}>{fmt(debt)}</p>
              <p className="text-[9px] opacity-60">د.ع</p>
            </button>
            <button onClick={() => selectPayType("all")} disabled={allTotal <= 0 || submitting}
              className="rounded-2xl p-3 text-center transition-all disabled:opacity-30"
              style={{ background: payType === "all" ? "var(--success)" : "var(--bg-surface)", color: payType === "all" ? "#fff" : undefined, border: `1px solid ${payType === "all" ? "var(--success)" : "var(--border)"}`, boxShadow: payType === "all" ? "0 4px 20px rgba(5,150,105,0.2)" : "var(--shadow-md)" }}>
              <p className="text-[10px] mb-1 opacity-80">الكل</p>
              <p className="font-num text-base font-bold" style={payType !== "all" ? { color: "var(--success)" } : {}}>{fmt(allTotal)}</p>
              <p className="text-[9px] opacity-60">د.ع</p>
            </button>
          </div>
        </div>

        {/* Discount */}
        {user?.canGiveDiscount && appliedDiscount === 0 && monthlyDue > 0 && !submitting && (
          <button onClick={() => setShowDiscount(true)}
            className="w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
            <Gift className="w-3.5 h-3.5" /> إضافة خصم
          </button>
        )}

        {showDiscount && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
            <div className="w-full max-w-[390px] rounded-t-[20px] p-5 pb-8" style={{ background: "var(--bg-surface)" }}>
              <h3 className="text-sm font-bold mb-3">خصم فوري</h3>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>سيُطبّق الخصم فوراً. إذا رُفض سيُضاف للديون.</p>
              <div className="space-y-3">
                <input type="number" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} dir="ltr" placeholder="مبلغ الخصم (د.ع)"
                  className="w-full h-10 px-3 rounded-xl font-num text-sm outline-none" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }} />
                <input type="text" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="السبب (اختياري)"
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }} />
                <div className="flex gap-2">
                  <button onClick={() => setShowDiscount(false)} className="flex-1 h-10 rounded-xl text-xs font-bold" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>إلغاء</button>
                  <button onClick={applyDiscount} disabled={!discountInput || Number(discountInput) <= 0}
                    className="flex-1 h-10 rounded-xl text-white text-xs font-bold disabled:opacity-60" style={{ background: "var(--gold)" }}>تطبيق الخصم</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fix 2+4: Sticky payment buttons — disabled immediately, shows spinner */}
        <div className="fixed bottom-16 left-0 right-0 z-40 p-4 pt-2" style={{ background: "linear-gradient(to top, var(--bg-base) 80%, transparent)" }}>
          <div className="max-w-[390px] mx-auto space-y-2">
            <button onClick={() => handlePayment("cash")} disabled={submitting || numAmount <= 0}
              className="w-full h-14 rounded-xl flex items-center justify-center gap-2 text-white font-bold text-base disabled:opacity-40"
              style={{ background: "var(--blue-primary)" }}>
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> جاري المعالجة...</>
              ) : (
                <><Banknote className="w-5 h-5" /> نقداً — {fmt(numAmount)} د.ع</>
              )}
            </button>
            <div className="flex gap-2">
              <button onClick={async () => {
                if (!selected || numAmount <= 0) return;
                setSubmitting(true);
                try {
                  const res = await fetch('/api/pos/payment-init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      subscriber_id: selected.id,
                      invoice_id: selected.current_invoice?.id || null,
                      amount: numAmount,
                    }),
                  });
                  const data = await res.json();
                  if (data.payment_url) {
                    window.location.href = data.payment_url;
                  } else {
                    toast.error(data.error || 'فشل إنشاء رابط الدفع');
                  }
                } catch {
                  toast.error('خطأ في الاتصال');
                }
                setSubmitting(false);
              }}
                disabled={submitting || numAmount <= 0}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-1.5 text-white font-medium text-xs disabled:opacity-40"
                style={{ background: "#2B3990" }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                بطاقة
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Printer helpers ──
  function buildReceiptData(): ReceiptData | null {
    if (!receiptData || !selected) return null
    const bm = receiptData.billing_month ?? (new Date().getMonth() + 1)
    const by = receiptData.billing_year ?? new Date().getFullYear()
    return {
      subscriber_name: receiptData.subscriber_name ?? selected.name,
      serial_number: receiptData.serial_number ?? selected.serial_number,
      billing_month: bm,
      billing_year: by,
      billing_month_arabic: getArabicMonth(bm),
      amount: receiptData.paid ?? receiptData.amount ?? 0,
      payment_method: 'cash',
      collector_name: user?.name ?? '',
      branch_name: receiptData.branch_name ?? user?.branchName ?? '',
      branch_phone: receiptData.branch_phone ?? '',
      thank_you: 'شكراً لكم — مدعوم من أمبير ⚡',
    }
  }

  async function handlePrint() {
    const rd = buildReceiptData()
    if (!rd) return
    try {
      await printReceipt(rd)
      toast.success('تم إرسال الإيصال للطباعة')
    } catch {
      toast.error('فشل الطباعة')
    }
  }

  function handleWhatsAppReceipt() {
    const rd = buildReceiptData()
    if (!rd) return
    const msg = formatWhatsAppReceipt(rd)
    const phone = selected?.phone
    if (phone) {
      openWhatsApp(phone, msg)
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }
  }

  // ── STEP 3: Success ──
  if (step === "success" && receiptData) {
    const paidAmount = receiptData.paid ?? receiptData.amount ?? 0;
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(5,150,105,0.1)" }}>
          <CheckCircle2 className="w-10 h-10" style={{ color: "var(--success)" }} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: "var(--success)" }}>تم الدفع بنجاح</h2>
        {receiptData.offline && (
          <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "var(--gold-soft)" }}>
            <WifiOff className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
            <span className="text-xs">سيتم المزامنة عند عودة الإنترنت</span>
          </div>
        )}
        {receiptData.discount_applied > 0 && (
          <div className="rounded-xl p-2 px-3 text-xs" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
            تم الدفع بخصم {fmt(receiptData.discount_applied)} د.ع — بانتظار موافقة المدير
          </div>
        )}
        <div className="rounded-2xl p-4 w-full text-center" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>{receiptData.subscriber_name}</p>
          <p className="font-num text-3xl font-bold">{fmt(paidAmount)}<span className="text-sm mr-1" style={{ color: "var(--text-muted)" }}>د.ع</span></p>
          {receiptData.billing_month && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              الشهر المستحق: <span className="font-num font-bold">{receiptData.billing_month}</span> — {getArabicMonth(receiptData.billing_month)} {receiptData.billing_year}
            </p>
          )}
          {receiptData.remaining_debt !== undefined && (
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              الدين المتبقي: <span className="font-num font-bold" style={{ color: "var(--danger)" }}>{fmt(receiptData.remaining_debt)} د.ع</span>
            </p>
          )}
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={handlePrint}
            className="flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <Printer className="w-3.5 h-3.5" /> 🖨️ طباعة الإيصال
          </button>
          <button onClick={handleWhatsAppReceipt}
            className="flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: "rgba(5,150,105,0.1)", color: "var(--success)" }}>
            <MessageCircle className="w-3.5 h-3.5" /> 💬 واتساب
          </button>
        </div>
        <button onClick={resetFlow} className="w-full h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1.5" style={{ background: "var(--blue-primary)" }}>
          <Check className="w-4 h-4" /> ✅ تم — دفعة جديدة
        </button>
        <button onClick={goToSubscribers} className="w-full h-10 rounded-xl text-sm font-medium"
          style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          العودة لقائمة المشتركين
        </button>
      </div>
    );
  }

  return null;
}
export default function POSPage() { return <Suspense fallback={null}><POSPageContent /></Suspense> }
