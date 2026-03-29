"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Thermometer,
  Clock,
  Droplets,
  Play,
  Pause,
  Plus,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Engine {
  id: string;
  name: string;
  model: string | null;
  runtime_hours: number;
  oil_change_hours: number;
  oil_change_due_in_hours: number;
  run_status: boolean;
  latest_temp: { temp_celsius: number } | null;
  latest_fuel: { fuel_level_percent: number } | null;
}

export default function EnginesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const [engines, setEngines] = useState<Engine[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showHoursModal, setShowHoursModal] = useState<string | null>(null);
  const [hoursInput, setHoursInput] = useState("");
  const [hoursNotes, setHoursNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === "collector" && !user?.isDualRole) {
      router.replace("/dashboard");
      return;
    }
    fetchEngines();
  }, [user, router]);

  const fetchEngines = async () => {
    try {
      const res = await fetch("/api/operator/engines");
      const data = await res.json();
      setEngines(data.engines ?? []);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (engineId: string, currentStatus: boolean) => {
    const action = currentStatus ? "إيقاف" : "تشغيل";
    if (!confirm(`هل تريد ${action} المحرك؟`)) return;

    try {
      const res = await fetch(`/api/operator/engines/${engineId}/run-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_status: !currentStatus }),
      });
      if (res.ok) {
        toast.success(`تم ${action} المحرك`);
        fetchEngines();
      }
    } catch {
      toast.error("فشل تغيير الحالة");
    }
  };

  const handleLogHours = async (engineId: string) => {
    if (!hoursInput) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/operator/engines/${engineId}/log-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: Number(hoursInput), notes: hoursNotes || undefined }),
      });
      if (res.ok) {
        toast.success("تم تسجيل الساعات");
        setShowHoursModal(null);
        setHoursInput("");
        setHoursNotes("");
        fetchEngines();
      }
    } catch {
      toast.error("فشل تسجيل الساعات");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOilChange = async (engineId: string) => {
    if (!confirm("هل تريد تسجيل تغيير الزيت؟")) return;
    try {
      const res = await fetch(`/api/operator/engines/${engineId}/oil-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toast.success("تم تسجيل تغيير الزيت");
        fetchEngines();
      }
    } catch {
      toast.error("فشل التسجيل");
    }
  };

  const tempColor = (t: number) => {
    if (t > 85) return "var(--danger)";
    if (t > 70) return "var(--gold)";
    return "var(--success)";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Zap className="w-5 h-5" style={{ color: "var(--blue-primary)" }} />
        المحركات
      </h2>

      {engines.map((eng) => (
        <div
          key={eng.id}
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: "var(--gold)" }} />
                {eng.name}
              </h3>
              {eng.model && (
                <span className="text-xs text-text-muted">{eng.model}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: eng.run_status ? "var(--success)" : "var(--danger)" }}
              />
              <span className="text-sm">{eng.run_status ? "يعمل" : "متوقف"}</span>
              {user?.canToggleGenerator && (
                <button
                  onClick={() => handleToggle(eng.id, eng.run_status)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white"
                  style={{
                    background: eng.run_status ? "var(--danger)" : "var(--success)",
                  }}
                >
                  {eng.run_status ? (
                    <span className="flex items-center gap-1"><Pause className="w-3 h-3" /> إيقاف</span>
                  ) : (
                    <span className="flex items-center gap-1"><Play className="w-3 h-3" /> تشغيل</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Temperature */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Thermometer className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span>الحرارة</span>
            </div>
            <span
              className="font-num font-bold"
              style={{
                color: eng.latest_temp
                  ? tempColor(eng.latest_temp.temp_celsius)
                  : "var(--text-muted)",
              }}
            >
              {eng.latest_temp ? `${eng.latest_temp.temp_celsius}°C` : "—"}
            </span>
          </div>
          {eng.latest_temp && (
            <div className="w-full h-2 rounded-full" style={{ background: "var(--bg-muted)" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (eng.latest_temp.temp_celsius / 120) * 100)}%`,
                  background: tempColor(eng.latest_temp.temp_celsius),
                }}
              />
            </div>
          )}

          {/* Runtime */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span>ساعات التشغيل</span>
            </div>
            <span className="font-num">
              {eng.runtime_hours.toFixed(0)} / {eng.oil_change_hours}
            </span>
          </div>

          {/* Oil change warning */}
          {eng.oil_change_due_in_hours <= 0 ? (
            <div
              className="flex items-center gap-2 p-2.5 rounded-lg text-sm"
              style={{ background: "#FEF2F2", color: "var(--danger)" }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>حان موعد تغيير الزيت! يعمل منذ {eng.runtime_hours.toFixed(0)} ساعة</span>
            </div>
          ) : eng.oil_change_due_in_hours < 20 ? (
            <div
              className="flex items-center gap-2 p-2.5 rounded-lg text-sm"
              style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
            >
              <Droplets className="w-4 h-4 shrink-0" />
              <span>تغيير الزيت بعد {eng.oil_change_due_in_hours.toFixed(0)} ساعة</span>
            </div>
          ) : (
            <div className="text-xs text-text-muted">
              تغيير الزيت بعد {eng.oil_change_due_in_hours.toFixed(0)} ساعة
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {user?.canLogHours && (
              <button
                onClick={() => {
                  setShowHoursModal(eng.id);
                  setHoursInput("");
                  setHoursNotes("");
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: "var(--blue-soft)", color: "var(--blue-primary)" }}
              >
                <Plus className="w-3 h-3" /> تسجيل ساعات
              </button>
            )}
            {eng.oil_change_due_in_hours <= 0 && (
              <button
                onClick={() => handleOilChange(eng.id)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
              >
                <Droplets className="w-3 h-3" /> تغيير الزيت
              </button>
            )}
          </div>

          {/* Hours Modal */}
          {showHoursModal === eng.id && (
            <div className="p-3 rounded-lg space-y-2" style={{ background: "var(--bg-muted)" }}>
              <input
                type="number"
                inputMode="numeric"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                placeholder="عدد الساعات"
                className="w-full h-10 px-3 rounded-lg text-sm outline-none font-num"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              />
              <input
                type="text"
                value={hoursNotes}
                onChange={(e) => setHoursNotes(e.target.value)}
                placeholder="ملاحظات (اختياري)"
                className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleLogHours(eng.id)}
                  disabled={submitting || !hoursInput}
                  className="flex-1 h-10 rounded-lg text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                  style={{ background: "var(--blue-primary)" }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </button>
                <button
                  onClick={() => setShowHoursModal(null)}
                  className="px-4 h-10 rounded-lg text-sm"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {engines.length === 0 && (
        <div className="text-center text-text-muted py-12 text-sm">
          لا توجد محركات مسجلة
        </div>
      )}
    </div>
  );
}
