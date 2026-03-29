"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Fuel, Plus, Ruler, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface EngineWithFuel {
  id: string;
  name: string;
  generator_name: string;
  fuel_level_pct: number | null;
  latest_fuel_at: string | null;
  tank_full_dist_cm: number;
  tank_empty_dist_cm: number;
}

export default function FuelPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [engines, setEngines] = useState<EngineWithFuel[]>([]);
  const [loading, setLoading] = useState(true);

  // Add fuel form
  const [showFuelForm, setShowFuelForm] = useState<string | null>(null);
  const [liters, setLiters] = useState("");
  const [costIqd, setCostIqd] = useState("");
  const [fuelNotes, setFuelNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Manual reading form
  const [showReadingForm, setShowReadingForm] = useState<string | null>(null);
  const [distanceCm, setDistanceCm] = useState("");

  useEffect(() => {
    fetchEngines();
  }, [user]);

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

  const handleAddFuel = async (engineId: string) => {
    if (!liters) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/operator/engines/${engineId}/fuel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liters: Number(liters),
          cost_iqd: costIqd ? Number(costIqd) : undefined,
          notes: fuelNotes || undefined,
        }),
      });
      if (res.ok) {
        toast.success("تمت إضافة الوقود");
        setShowFuelForm(null);
        setLiters("");
        setCostIqd("");
        setFuelNotes("");
        fetchEngines();
      }
    } catch {
      toast.error("فشل إضافة الوقود");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualReading = async (engineId: string) => {
    if (!distanceCm) return;
    setSubmitting(true);
    try {
      const eng = engines.find((e) => e.id === engineId);
      const emptyDist = eng?.tank_empty_dist_cm ?? 100;
      const fullDist = eng?.tank_full_dist_cm ?? 5;
      const dist = Number(distanceCm);
      const pct = Math.max(0, Math.min(100, ((emptyDist - dist) / (emptyDist - fullDist)) * 100));

      const res = await fetch(`/api/operator/engines/${engineId}/fuel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liters: 0,
          distance_cm: dist,
          fuel_pct: pct,
          notes: `قراءة يدوية: ${dist}cm = ${pct.toFixed(0)}%`,
        }),
      });
      if (res.ok) {
        toast.success(`مستوى الوقود: ${pct.toFixed(0)}%`);
        setShowReadingForm(null);
        setDistanceCm("");
        fetchEngines();
      }
    } catch {
      toast.error("فشل تسجيل القراءة");
    } finally {
      setSubmitting(false);
    }
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "لا توجد قراءة";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    return `منذ ${hours} ساعة`;
  };

  const fuelColor = (pct: number) => {
    if (pct < 10) return "var(--danger)";
    if (pct < 20) return "var(--gold)";
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
        <Fuel className="w-5 h-5" style={{ color: "var(--blue-primary)" }} />
        الوقود
      </h2>

      {engines.map((eng) => {
        const pct = eng.fuel_level_pct ?? 0;

        return (
          <div
            key={eng.id}
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
          >
            <h3 className="font-medium text-sm">{eng.name}</h3>

            {/* Fuel gauge */}
            <div className="text-center py-2">
              <div
                className="text-4xl font-bold font-num"
                style={{ color: fuelColor(pct) }}
              >
                {pct.toFixed(0)}%
              </div>
              <div className="w-full h-3 rounded-full mt-2" style={{ background: "var(--bg-muted)" }}>
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: fuelColor(pct) }}
                />
              </div>
            </div>

            <div className="text-xs text-text-muted text-center">
              آخر قراءة: {timeAgo(eng.latest_fuel_at)}
            </div>

            {/* Actions */}
            {user?.canAddFuel && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowFuelForm(showFuelForm === eng.id ? null : eng.id);
                    setShowReadingForm(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium"
                  style={{ background: "var(--blue-soft)", color: "var(--blue-primary)" }}
                >
                  <Plus className="w-3 h-3" /> إضافة وقود
                </button>
                <button
                  onClick={() => {
                    setShowReadingForm(showReadingForm === eng.id ? null : eng.id);
                    setShowFuelForm(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium"
                  style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                >
                  <Ruler className="w-3 h-3" /> قراءة يدوية
                </button>
              </div>
            )}

            {/* Add fuel form */}
            {showFuelForm === eng.id && (
              <div className="p-3 rounded-lg space-y-2" style={{ background: "var(--bg-muted)" }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  placeholder="الكمية (لتر)"
                  className="w-full h-10 px-3 rounded-lg text-sm outline-none font-num"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={costIqd}
                  onChange={(e) => setCostIqd(e.target.value)}
                  placeholder="التكلفة (د.ع) — اختياري"
                  className="w-full h-10 px-3 rounded-lg text-sm outline-none font-num"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                />
                <input
                  type="text"
                  value={fuelNotes}
                  onChange={(e) => setFuelNotes(e.target.value)}
                  placeholder="ملاحظات (اختياري)"
                  className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                />
                <button
                  onClick={() => handleAddFuel(eng.id)}
                  disabled={submitting || !liters}
                  className="w-full h-10 rounded-lg text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                  style={{ background: "var(--blue-primary)" }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </button>
              </div>
            )}

            {/* Manual reading form */}
            {showReadingForm === eng.id && (
              <div className="p-3 rounded-lg space-y-2" style={{ background: "var(--bg-muted)" }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={distanceCm}
                  onChange={(e) => setDistanceCm(e.target.value)}
                  placeholder="المسافة (سم)"
                  className="w-full h-10 px-3 rounded-lg text-sm outline-none font-num"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                />
                <div className="text-xs text-text-muted">
                  ممتلئ: {eng.tank_full_dist_cm}سم — فارغ: {eng.tank_empty_dist_cm}سم
                </div>
                <button
                  onClick={() => handleManualReading(eng.id)}
                  disabled={submitting || !distanceCm}
                  className="w-full h-10 rounded-lg text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                  style={{ background: "var(--gold)" }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "حساب المستوى"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {engines.length === 0 && (
        <div className="text-center text-text-muted py-12 text-sm">
          لا توجد محركات
        </div>
      )}
    </div>
  );
}
