"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  CheckCircle,
  Fuel,
  Clock,
  Droplets,
  Zap,
} from "lucide-react";

interface LogEntry {
  id: string;
  action: string;
  notes: string | null;
  created_at: string;
}

type TimeFilter = "today" | "week" | "month";

export default function MyLogsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimeFilter>("today");

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user, filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/operator/logs?filter=${filter}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("ar-IQ", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-IQ", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  const actionIcon = (action: string) => {
    if (action.includes("check_in") || action.includes("حضور"))
      return <CheckCircle className="w-4 h-4" style={{ color: "var(--success)" }} />;
    if (action.includes("fuel") || action.includes("وقود"))
      return <Fuel className="w-4 h-4" style={{ color: "var(--blue-primary)" }} />;
    if (action.includes("hours") || action.includes("ساعات"))
      return <Clock className="w-4 h-4" style={{ color: "var(--violet)" }} />;
    if (action.includes("oil") || action.includes("زيت"))
      return <Droplets className="w-4 h-4" style={{ color: "var(--gold)" }} />;
    if (action.includes("toggle") || action.includes("تشغيل") || action.includes("إيقاف"))
      return <Zap className="w-4 h-4" style={{ color: "var(--gold)" }} />;
    return <ClipboardList className="w-4 h-4" style={{ color: "var(--text-muted)" }} />;
  };

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      check_in: "سجّل الحضور",
      check_out: "أنهى الدوام",
      add_fuel: "أضاف وقود",
      log_hours: "سجّل ساعات تشغيل",
      oil_change: "تغيير زيت",
      toggle_on: "شغّل المحرك",
      toggle_off: "أوقف المحرك",
    };
    return labels[action] ?? action;
  };

  // Group logs by date
  const grouped = logs.reduce<Record<string, LogEntry[]>>((acc, log) => {
    const dateKey = new Date(log.created_at).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(log);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <ClipboardList className="w-5 h-5" style={{ color: "var(--blue-primary)" }} />
        سجلاتي
      </h2>

      {/* Filter */}
      <div className="flex gap-2">
        {(
          [
            ["today", "اليوم"],
            ["week", "هذا الأسبوع"],
            ["month", "هذا الشهر"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: filter === key ? "var(--blue-primary)" : "var(--bg-surface)",
              color: filter === key ? "#fff" : "var(--text-muted)",
              border: `1px solid ${filter === key ? "var(--blue-primary)" : "var(--border)"}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-text-muted py-8">جاري التحميل...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center text-text-muted py-12 text-sm">
          لا توجد سجلات
        </div>
      ) : (
        Object.entries(grouped).map(([dateKey, dayLogs]) => (
          <div key={dateKey}>
            <div className="text-xs font-medium text-text-muted mb-2">
              {formatDate(dayLogs[0].created_at)}
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
            >
              {dayLogs.map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{
                    borderBottom:
                      i < dayLogs.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="mt-0.5">{actionIcon(log.action)}</div>
                  <div className="flex-1">
                    <div className="text-sm">{actionLabel(log.action)}</div>
                    {log.notes && (
                      <div className="text-xs text-text-muted mt-0.5">
                        {log.notes}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-text-muted font-num">
                    {formatTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
