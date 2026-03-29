"use client";

import { useEffect, useRef } from "react";

const INTERVAL_MS = 60_000; // 1 minute

export function useGpsTracker(role: string | undefined, isActive: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Only track collectors who are active (checked in)
    const isCollector = role === "collector";
    if (!isCollector || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    function sendLocation() {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          fetch("/api/collector/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: latitude,
              lng: longitude,
              accuracy: accuracy ?? null,
            }),
          }).catch(() => {
            // Silently fail if offline
          });
        },
        () => {
          // GPS permission denied or error — skip
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }

    // Send immediately, then every 1 minute
    sendLocation();
    intervalRef.current = setInterval(sendLocation, INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [role, isActive]);
}
