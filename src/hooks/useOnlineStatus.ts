"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { syncPendingPayments } from "@/lib/sync";
import { getPendingCount, cacheSubscribers } from "@/lib/offline";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available (SSR)
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const handleOnline = async () => {
      setIsOnline(true);
      toast.success("تم استعادة الاتصال");

      // Sync pending payments
      const result = await syncPendingPayments();
      if (result.synced > 0) {
        toast.success(`تم رفع ${result.synced} دفعة`);
        await refreshPendingCount();
      }

      // Refresh subscriber cache
      try {
        const res = await fetch("/api/subscribers");
        const data = await res.json();
        const subs = data.subscribers ?? data;
        if (Array.isArray(subs) && subs.length > 0) {
          await cacheSubscribers(subs);
        }
      } catch {
        // Failed to refresh — keep cached data
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Poll pending count every 10 seconds
    const interval = setInterval(refreshPendingCount, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount]);

  return { isOnline, pendingCount, refreshPendingCount };
}
