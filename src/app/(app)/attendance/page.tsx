"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Hexagon, Clock } from "lucide-react";
import CheckInFlow from "@/components/CheckInFlow";

interface ShiftData {
  id: string;
  check_in_at: string | null;
  check_out_at: string | null;
  hours_worked: number | null;
}

export default function AttendancePage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const role = (user?.role as "collector" | "operator") ?? "operator";
  const [shift, setShift] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState("");

  const fetchShift = useCallback(async () => {
    try {
      const endpoint =
        role === "collector"
          ? "/api/collector/shift/today"
          : "/api/operator/shift/today";
      const res = await fetch(endpoint);
      const data = await res.json();
      setShift(data.shift ?? null);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (user) fetchShift();
  }, [user, fetchShift]);

  // Live timer
  useEffect(() => {
    if (!shift?.check_in_at || shift.check_out_at) return;

    const update = () => {
      const start = new Date(shift.check_in_at!).getTime();
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

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("ar-IQ", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const today = new Date().toLocaleDateString("ar-IQ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
        جاري التحميل...
      </div>
    );
  }

  // ── Not checked in ──
  if (!shift?.check_in_at) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 space-y-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--blue-soft)" }}
        >
          <Hexagon className="w-9 h-9" style={{ color: "var(--blue-primary)" }} />
        </div>
        <h1 className="text-xl font-bold">أمبير — سجّل حضورك</h1>
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{today}</p>

        <div className="w-full max-w-xs">
          <CheckInFlow
            type="check-in"
            role={role}
            onSuccess={fetchShift}
          />
        </div>
      </div>
    );
  }

  // ── Checked in ──
  return (
    <div className="p-4 space-y-6">
      <div
        className="rounded-xl p-6 text-center space-y-3"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ background: shift.check_out_at ? "var(--bg-muted)" : "#ECFDF5" }}
        >
          <Clock className="w-7 h-7" style={{ color: shift.check_out_at ? "var(--text-muted)" : "var(--success)" }} />
        </div>

        {shift.check_out_at ? (
          <>
            <h2 className="text-lg font-bold">انتهى الدوام</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              من {formatTime(shift.check_in_at)} إلى {formatTime(shift.check_out_at)}
            </p>
            {shift.hours_worked !== null && (
              <p className="text-sm font-medium">
                مدة العمل: {shift.hours_worked.toFixed(1)} ساعة
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold" style={{ color: "var(--success)" }}>
              حاضر منذ الساعة {formatTime(shift.check_in_at)}
            </h2>
            {/* Live timer */}
            <div className="font-num text-3xl font-bold" style={{ color: "var(--success)" }}>
              {elapsed}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>مدة العمل</p>
          </>
        )}
      </div>

      {/* Check-out */}
      {!shift.check_out_at && (
        <CheckInFlow
          type="check-out"
          role={role}
          onSuccess={fetchShift}
        />
      )}
    </div>
  );
}
