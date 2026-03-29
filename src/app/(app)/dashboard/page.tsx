"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  CreditCard,
  Plus,
  AlertTriangle,
  Wallet,
  Target,
  MapPin,
  Loader2,
  Clock,
  Zap,
  Thermometer,
  Fuel,
  Bell,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

interface ShiftData {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
}

interface StatsData {
  today_cash: number;
  today_total: number;
  today_count: number;
  month_collected: number;
  month_delivered: number;
  wallet_balance: number;
  daily_target: number;
  visited_today: number;
  recent_payments: Array<{
    subscriber_name: string;
    amount: number;
    created_at: string;
  }>;
}

interface EngineInfo {
  id: string;
  name: string;
  run_status: boolean;
  latest_temp: { temp_celsius: number } | null;
  fuel_level_pct: number | null;
  runtime_hours: number;
  oil_change_hours: number;
}

export default function CollectorDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const isDualRole = user?.isDualRole === true;
  const [shift, setShift] = useState<ShiftData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [callRequests, setCallRequests] = useState<Array<{
    id: string; subscriber_name: string; subscriber_address: string | null; requested_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (user?.role === "operator" && !isDualRole) {
      router.replace("/attendance");
      return;
    }
    if (!user) return;
    loadData();
  }, [user, router, isDualRole]);

  const loadData = useCallback(async () => {
    try {
      const fetches: Promise<Response>[] = [
        fetch("/api/collector/shift/today"),
        fetch("/api/collector/stats"),
        fetch("/api/collector-call-requests"),
      ];
      if (isDualRole) {
        fetches.push(fetch("/api/operator/engines"));
      }
      const responses = await Promise.all(fetches);
      const shiftData = await responses[0].json();
      const statsData = await responses[1].json();
      const callData = await responses[2].json();
      setShift(shiftData.shift ?? null);
      setStats(statsData);
      setCallRequests(callData.requests ?? []);

      if (isDualRole && responses[3]) {
        const engData = await responses[3].json();
        setEngines(engData.engines ?? []);
      }
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, [isDualRole]);

  // Live timer
  useEffect(() => {
    if (!shift?.check_in_at || shift.check_out_at) return;

    const update = () => {
      const start = new Date(shift.check_in_at).getTime();
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [shift]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      const res = await fetch("/api/collector/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تم تسجيل الحضور");
        loadData();
      } else {
        toast.error(data.error ?? "فشل تسجيل الحضور");
      }
    } catch {
      toast.error("لا يمكن الوصول للموقع — يرجى تفعيل GPS");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      const res = await fetch("/api/collector/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`تم إنهاء الدوام — ${data.hours_worked?.toFixed(1)} ساعة`);
        loadData();
      } else {
        toast.error(data.error ?? "فشل إنهاء الدوام");
      }
    } catch {
      toast.error("لا يمكن الوصول للموقع");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
        جاري التحميل...
      </div>
    );
  }

  const fmtAmt = (n: number) => Number(n).toLocaleString("en") + " د.ع";
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });

  // Shift time logic
  const shiftStart = user?.shiftStartTime as string | null;
  const getShiftStatus = () => {
    if (!shiftStart || shift?.check_in_at) return null;
    const [sh, sm] = shiftStart.split(":").map(Number);
    const now = new Date();
    const shiftTime = new Date(now);
    shiftTime.setHours(sh, sm, 0, 0);
    const diffMin = Math.round((shiftTime.getTime() - now.getTime()) / 60000);
    if (diffMin > 0) return { type: "upcoming" as const, minutes: diffMin };
    return { type: "late" as const, minutes: Math.abs(diffMin) };
  };
  const shiftStatus = getShiftStatus();

  return (
    <div className="p-4 space-y-4">
      {/* Shift countdown / late banner */}
      {shiftStatus?.type === "late" && (
        <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "#FEF2F2" }}>
          <Clock className="w-4 h-4" style={{ color: "var(--danger)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--danger)" }}>
            تأخرت {shiftStatus.minutes} دقيقة — سجّل حضورك الآن
          </span>
        </div>
      )}
      {shiftStatus?.type === "upcoming" && shiftStatus.minutes <= 30 && (
        <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "var(--blue-soft)" }}>
          <Clock className="w-4 h-4" style={{ color: "var(--blue-primary)" }} />
          <span className="text-sm" style={{ color: "var(--blue-primary)" }}>
            دوامك يبدأ الساعة {shiftStart} — بعد <span className="font-num font-bold">{shiftStatus.minutes}</span> دقيقة
          </span>
        </div>
      )}

      {/* Check-in Banner */}
      {shift?.check_in_at && !shift.check_out_at ? (
        <div className="rounded-xl p-4" style={{ background: "#ECFDF5" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: "var(--success)" }} />
              <span className="text-sm font-medium">
                حاضر منذ {fmtTime(shift.check_in_at)}
              </span>
            </div>
            <button
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="text-xs px-3 py-1.5 rounded-lg text-white flex items-center gap-1"
              style={{ background: "var(--text-muted)" }}
            >
              {checkingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              إنهاء العمل
            </button>
          </div>
          {/* Live timer */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: "var(--success)" }} />
            <span className="font-num text-lg font-bold" style={{ color: "var(--success)" }}>
              {elapsed}
            </span>
          </div>
        </div>
      ) : shift?.check_out_at ? (
        <div className="rounded-xl p-3" style={{ background: "var(--bg-muted)" }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              انتهى الدوام — {fmtTime(shift.check_in_at)} إلى {fmtTime(shift.check_out_at)}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-4" style={{ background: "#FEF2F2" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5" style={{ color: "var(--danger)" }} />
              <span className="text-sm font-medium">لم تسجّل حضورك بعد</span>
            </div>
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="text-xs px-3 py-1.5 rounded-lg text-white flex items-center gap-1"
              style={{ background: "var(--blue-primary)" }}
            >
              {checkingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
              بدء العمل
            </button>
          </div>
        </div>
      )}

      {/* Call Requests */}
      {callRequests.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4" style={{ color: "var(--violet)" }} />
            <span className="text-sm font-medium">{callRequests.length} مشترك طلب زيارتك</span>
          </div>
          <div className="space-y-2">
            {callRequests.slice(0, 5).map((cr) => (
              <div key={cr.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p className="text-sm">{cr.subscriber_name}</p>
                  {cr.subscriber_address && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{cr.subscriber_address}</p>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await fetch("/api/collector-call-requests", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: cr.id }),
                    });
                    setCallRequests((prev) => prev.filter((r) => r.id !== cr.id));
                    toast.success("تم");
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                  style={{ background: "#ECFDF5", color: "var(--success)" }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  تم الزيارة
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Target */}
      {stats && stats.daily_target > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" style={{ color: "var(--blue-primary)" }} />
            <span className="text-sm font-medium">هدف اليوم</span>
          </div>
          <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
            {stats.visited_today}/{stats.daily_target} مشترك
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "var(--blue-soft)" }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                background: "var(--blue-primary)",
                width: `${Math.min(100, (stats.visited_today / stats.daily_target) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Wallet Card — tappable */}
      {stats && (
        <Link href="/my-wallet" className="block rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
          <div className="p-4" style={{ background: stats.wallet_balance > 0 ? "linear-gradient(135deg, var(--danger), #B91C1C)" : "linear-gradient(135deg, var(--success), #047857)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-white/70" />
              <span className="text-sm font-medium text-white/80">محفظتي</span>
            </div>
            <div className="text-2xl font-bold font-num text-white">
              {fmtAmt(stats.wallet_balance)}
            </div>
          </div>
          <div className="p-3 flex items-center justify-between" style={{ background: "var(--bg-surface)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>المُستلَم هذا الشهر</span>
            <span className="font-num text-sm font-bold">{fmtAmt(stats.month_delivered)}</span>
          </div>
        </Link>
      )}

      {/* Quick Actions — 3 buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/pos" className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl text-white" style={{ background: "var(--blue-primary)" }}>
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-bold">تحصيل</span>
        </Link>
        <Link href="/debts" className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl" style={{ background: "#FEF2F2", color: "var(--danger)" }}>
          <AlertTriangle className="w-5 h-5" />
          <span className="text-[10px] font-bold">الديون</span>
        </Link>
        <Link href="/my-expenses" className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-bold">مصروف</span>
        </Link>
      </div>

      {/* Engine Gauges */}
      <EngineGaugesCard />

      {/* Engine Status — Dual Role (legacy, hidden) */}
      {false && isDualRole && engines.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: "var(--gold)" }} />
              المحركات
            </h3>
            <Link href="/engines" className="text-xs" style={{ color: "var(--blue-primary)" }}>
              عرض الكل
            </Link>
          </div>
          <div className="space-y-2">
            {engines.slice(0, 3).map((eng) => {
              const tempColor = eng.latest_temp
                ? eng.latest_temp.temp_celsius > 85 ? "var(--danger)"
                  : eng.latest_temp.temp_celsius > 70 ? "var(--gold)" : "var(--success)"
                : "var(--text-muted)";
              return (
                <div key={eng.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: eng.run_status ? "var(--success)" : "var(--danger)" }} />
                    <span className="text-sm">{eng.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-num">
                    {eng.latest_temp && (
                      <span className="flex items-center gap-0.5" style={{ color: tempColor }}>
                        <Thermometer className="w-3 h-3" />
                        {eng.latest_temp.temp_celsius}°
                      </span>
                    )}
                    {eng.fuel_level_pct !== null && (
                      <span className="flex items-center gap-0.5" style={{ color: eng.fuel_level_pct < 20 ? "var(--danger)" : "var(--text-muted)" }}>
                        <Fuel className="w-3 h-3" />
                        {eng.fuel_level_pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {stats && stats.recent_payments && stats.recent_payments.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
          <h3 className="text-sm font-medium mb-3">آخر الدفعات</h3>
          <div className="space-y-2">
            {stats.recent_payments.slice(0, 5).map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm py-1.5"
                style={{ borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}
              >
                <span>{p.subscriber_name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-num font-medium">{fmtAmt(p.amount)}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {fmtTime(p.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GaugeArc({ value, max, color }: { value: number | null; max: number; color: string }) {
  const ARC_LENGTH = 94;
  const pct = value !== null ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = ARC_LENGTH - ARC_LENGTH * pct;
  return (
    <svg width={70} height={46} viewBox="0 0 70 46">
      <path d="M8,42 A30,30 0 0,1 62,42" fill="none" stroke="var(--border)" strokeWidth={7} strokeLinecap="round" />
      {value !== null && (
        <path d="M8,42 A30,30 0 0,1 62,42" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={ARC_LENGTH} strokeDashoffset={offset} />
      )}
    </svg>
  );
}

function EngineGaugesCard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/engines/latest-readings")
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const tempVal = data.temperature?.value ?? null;
  const fuelVal = data.fuel_pct?.value ?? null;
  const oilVal = data.oil_pressure?.value ?? null;
  const loadVal = data.load_amps?.value ?? null;

  const tempColor = tempVal === null ? "#94A3B8" : tempVal >= 85 ? "#E24B4A" : tempVal >= 70 ? "#BA7517" : "#3B6D11";
  const fuelColor = fuelVal === null ? "#94A3B8" : fuelVal < 20 ? "#E24B4A" : fuelVal < 40 ? "#BA7517" : "#3B6D11";
  const oilColor = oilVal === null ? "#94A3B8" : (oilVal < 1 || oilVal > 8) ? "#E24B4A" : (oilVal < 2 || oilVal > 7) ? "#BA7517" : "#3B6D11";
  const loadColor = loadVal === null ? "#94A3B8" : loadVal >= 85 ? "#E24B4A" : loadVal >= 70 ? "#BA7517" : "#3B6D11";

  const fmt = (v: number | null, unit: string) => {
    if (v === null) return "--";
    return (Number.isInteger(v) ? v : Number(v).toFixed(1)) + unit;
  };

  const gauges = [
    { label: "الحرارة", value: tempVal, max: 120, color: tempColor, display: fmt(tempVal, "°C") },
    { label: "الوقود", value: fuelVal, max: 100, color: fuelColor, display: fmt(fuelVal, "%") },
    { label: "ضغط الدهن", value: oilVal, max: 10, color: oilColor, display: fmt(oilVal, " bar") },
    { label: "الحمل", value: loadVal, max: 100, color: loadColor, display: fmt(loadVal, " A") },
  ];

  return (
    <Link href="/engines" className="block rounded-xl p-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: data.run_status ? "#3B6D11" : "#E24B4A" }} />
        <span className="text-sm font-bold">حالة المحرك</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{data.run_status ? "شغّالة" : "مطفأة"}</span>
      </div>

      {/* 2x2 Gauge Grid */}
      <div className="grid grid-cols-2 gap-3">
        {gauges.map((g, i) => (
          <div key={i} className="flex flex-col items-center rounded-xl py-3 px-2" style={{ background: "var(--bg-muted)" }}>
            <GaugeArc value={g.value} max={g.max} color={g.color} />
            <p className="font-num text-sm font-bold mt-1" style={{ color: g.color }}>{g.display}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{g.label}</p>
          </div>
        ))}
      </div>

      {/* Oil Hours Bar */}
      {data.runtime_hours != null && data.oil_change_hours && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>ساعات الزيت</span>
            <span className="font-num text-[10px] font-bold">{Math.round(data.runtime_hours)}/{data.oil_change_hours}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)" }}>
            <div className="h-full rounded-full" style={{
              width: `${Math.min(100, (data.runtime_hours / data.oil_change_hours) * 100)}%`,
              background: data.runtime_hours >= data.oil_change_hours ? "#E24B4A" : data.runtime_hours >= data.oil_change_hours * 0.8 ? "#BA7517" : "#3B6D11",
            }} />
          </div>
        </div>
      )}
    </Link>
  );
}
