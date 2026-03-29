"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Search, Star, RefreshCw } from "lucide-react";
import { cacheSubscribers, getCachedSubscribers, getLastSyncTime } from "@/lib/offline";

interface Subscriber {
  id: string;
  serial_number: string;
  name: string;
  phone: string | null;
  alley: string | null;
  alley_id: string | null;
  amperage: number;
  subscription_type: string;
  total_debt: number;
  branch_id: string;
  current_invoice: {
    total_amount_due: number;
    amount_paid: number;
    is_fully_paid: boolean;
  } | null;
}

export default function SubscribersPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "gold" | "normal" | "unpaid">("all");
  const [alleyFilter, setAlleyFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.branchId) return;
    if (navigator.onLine) {
      try {
        setRefreshing(true);
        const res = await fetch("/api/subscribers");
        const data = await res.json();
        if (data.subscribers) {
          setSubscribers(data.subscribers);
          await cacheSubscribers(data.subscribers);
        }
        setIsOffline(false);
      } catch {
        const cached = await getCachedSubscribers(user.branchId);
        setSubscribers(cached as Subscriber[]);
        setIsOffline(true);
      }
    } else {
      const cached = await getCachedSubscribers(user.branchId);
      setSubscribers(cached as Subscriber[]);
      setIsOffline(true);
    }
    const syncTime = await getLastSyncTime();
    setLastSync(syncTime);
    setLoading(false);
    setRefreshing(false);
  }, [user?.branchId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) loadData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  const syncAgo = useMemo(() => {
    if (!lastSync) return null;
    const diff = Date.now() - new Date(lastSync).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "الآن";
    if (min < 60) return `${min} دقيقة`;
    return `${Math.floor(min / 60)} ساعة`;
  }, [lastSync]);

  const alleys = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const sub of subscribers) {
      if (sub.alley) {
        const existing = map.get(sub.alley);
        map.set(sub.alley, {
          name: sub.alley,
          count: (existing?.count ?? 0) + 1,
        });
      }
    }
    return Array.from(map.values());
  }, [subscribers]);

  const filtered = useMemo(() => {
    let result = [...subscribers];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.serial_number.includes(q) ||
          s.phone?.includes(q)
      );
    }

    // Type filter
    if (filter === "gold") result = result.filter((s) => s.subscription_type === "gold");
    if (filter === "normal") result = result.filter((s) => s.subscription_type === "normal");
    if (filter === "unpaid")
      result = result.filter(
        (s) => s.current_invoice && !s.current_invoice.is_fully_paid
      );

    // Alley filter
    if (alleyFilter) result = result.filter((s) => s.alley === alleyFilter);

    // Sort by debt DESC
    result.sort((a, b) => b.total_debt - a.total_debt);

    return result;
  }, [subscribers, search, filter, alleyFilter]);

  const formatAmount = (n: number) => Number(n).toLocaleString("en");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          {syncAgo && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              آخر تحديث: منذ {syncAgo}
            </span>
          )}
          <button onClick={loadData} disabled={refreshing}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--bg-muted)" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} style={{ color: "var(--blue-primary)" }} />
          </button>
        </div>
      </div>

      {/* Offline indicator */}
      {isOffline && (
        <div className="text-xs text-center py-1 rounded" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
          بيانات محلية — آخر تحديث عند الاتصال
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الرقم..."
          className="w-full h-11 pr-10 pl-4 rounded-xl text-sm outline-none"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            ["all", "الكل"],
            ["gold", "ذهبي"],
            ["normal", "عادي"],
            ["unpaid", "غير مدفوعين"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition"
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

      {/* Alley chips */}
      {alleys.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setAlleyFilter(null)}
            className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
            style={{
              background: !alleyFilter ? "var(--violet)" : "var(--bg-surface)",
              color: !alleyFilter ? "#fff" : "var(--text-muted)",
              border: `1px solid ${!alleyFilter ? "var(--violet)" : "var(--border)"}`,
            }}
          >
            الكل
          </button>
          {alleys.map((a) => (
            <button
              key={a.name}
              onClick={() => setAlleyFilter(a.name)}
              className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
              style={{
                background: alleyFilter === a.name ? "var(--violet)" : "var(--bg-surface)",
                color: alleyFilter === a.name ? "#fff" : "var(--text-muted)",
                border: `1px solid ${alleyFilter === a.name ? "var(--violet)" : "var(--border)"}`,
              }}
            >
              {a.name} ({a.count})
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <div className="text-xs text-text-muted">{filtered.length} مشترك</div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((sub) => (
          <Link
            key={sub.id}
            href={`/subscribers/${sub.id}`}
            className="block rounded-xl p-3"
            style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{sub.name}</span>
              </div>
              {sub.subscription_type === "gold" && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
                  <Star className="w-3 h-3" />
                  ذهبي
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-text-muted">
                {sub.alley ?? "—"} · {sub.amperage}A
              </span>
              {sub.total_debt > 0 && (
                <span className="text-sm font-num font-bold" style={{ color: "var(--danger)" }}>
                  {formatAmount(sub.total_debt)} د.ع
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-text-muted py-8 text-sm">
          لا توجد نتائج
        </div>
      )}
    </div>
  );
}
