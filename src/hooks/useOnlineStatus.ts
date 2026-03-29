"use client";

import { useState, useEffect, useCallback } from "react";
import { syncPendingPayments } from "@/lib/sync";
import { getPendingCount } from "@/lib/offline";

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
      const result = await syncPendingPayments();
      if (result.synced > 0) {
        // Trigger refresh of pending count
        await refreshPendingCount();
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
