"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import Link from "next/link";
import { Bell } from "lucide-react";
import SessionWrapper from "@/components/SessionWrapper";
import OfflineBanner from "@/components/OfflineBanner";
import BottomNav from "@/components/BottomNav";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { syncPendingPayments } from "@/lib/sync";
import { cacheSubscribers } from "@/lib/offline";

function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status: authStatus } = useSession();
  const { isOnline, pendingCount, refreshPendingCount } = useOnlineStatus();
  const user = session?.user as any;
  const role = user?.role as "collector" | "operator" | undefined;
  const isDualRole = user?.isDualRole === true;
  const canCollect = user?.canCollect === true;
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    async function initApp() {
      if (!navigator.onLine || !role) return;

      const shouldSync = role === "collector" || canCollect;

      // 1. Sync pending payments (collectors only)
      if (shouldSync) {
        const { synced } = await syncPendingPayments();
        if (synced > 0) {
          toast.success(`تم رفع ${synced} دفعات`);
          refreshPendingCount();
        }
      }

      // 2. Refresh subscriber cache for collectors
      if (shouldSync) {
        try {
          const res = await fetch("/api/subscribers");
          const data = await res.json();
          const subs = data.subscribers ?? data;
          await cacheSubscribers(subs);
          console.log("Cached subscribers:", subs.length);
        } catch {
          // offline or error — use cached data
        }
      }
    }

    initApp();
  }, [role, canCollect, refreshPendingCount]);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const poll = () => {
      fetch("/api/notifications/count")
        .then(r => { if (r.ok) return r.json(); throw new Error() })
        .then(d => setNotifCount(d.count || 0))
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [authStatus]);

  return (
    <div className="min-h-screen flex flex-col">
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
      {/* Top bar with bell */}
      {role && (
        <div className="max-w-[390px] w-full mx-auto flex items-center justify-between px-4 py-2">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            مرحباً {user?.name?.split(" ")[0] || ""}
          </p>
          <Link href="/notifications" className="relative p-2">
            <Bell className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            {notifCount > 0 && (
              <span className="absolute top-0.5 left-0.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#EF4444" }}>
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </Link>
        </div>
      )}
      <div className="flex-1 max-w-[390px] w-full mx-auto pb-20">
        {children}
      </div>
      {role && <BottomNav role={role} isDualRole={isDualRole} />}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "Tajawal, sans-serif",
            direction: "rtl",
          },
        }}
      />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionWrapper>
      <AppShell>{children}</AppShell>
    </SessionWrapper>
  );
}
