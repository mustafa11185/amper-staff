"use client";

import { useState } from "react";
import { MapPin, Camera, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface CheckInFlowProps {
  type: "check-in" | "check-out";
  role: "collector" | "operator";
  onSuccess: () => void;
}

export default function CheckInFlow({ type, role, onSuccess }: CheckInFlowProps) {
  const [status, setStatus] = useState<"idle" | "locating" | "error" | "submitting">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const endpoint =
    type === "check-in"
      ? `/api/${role}/check-in`
      : `/api/${role}/check-out`;

  const handleSubmit = async () => {
    setStatus("locating");
    setErrorMsg("");

    // 1. Get geolocation
    let lat: number, lng: number;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      setStatus("error");
      setErrorMsg("لا يمكن الوصول للموقع — يرجى تفعيل GPS");
      return;
    }

    // Geofence check for check-in
    if (type === 'check-in') {
      try {
        const geoRes = await fetch('/api/geofence-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        })
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          if (!geoData.isWithin) {
            setStatus('error')
            setErrorMsg(`لا يمكن تسجيل الحضور خارج النطاق الجغرافي (${geoData.distance}م من المولدة — النطاق: ${geoData.radius}م)`)
            return
          }
        }
      } catch {
        // If geofence check fails, allow check-in
      }
    }

    // 2. Submit
    setStatus("submitting");
    try {
      const body: any = { lat, lng };
      // TODO: selfie upload if needed

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "حدث خطأ");
        return;
      }

      toast.success(
        type === "check-in"
          ? "تم تسجيل الحضور"
          : `تم إنهاء الدوام — ${data.hours_worked ?? 0} ساعة`
      );
      onSuccess();
    } catch {
      setStatus("error");
      setErrorMsg("خطأ في الاتصال — حاول مرة أخرى");
    }
  };

  return (
    <div className="space-y-4">
      {/* Selfie capture (optional) */}
      {type === "check-in" && (
        <div className="flex items-center gap-3">
          <label
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm cursor-pointer"
            style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
          >
            <Camera className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <span>{selfieFile ? "تم التقاط الصورة" : "صورة سيلفي (اختياري)"}</span>
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {selfieFile && (
            <CheckCircle className="w-5 h-5" style={{ color: "var(--success)" }} />
          )}
        </div>
      )}

      {/* Error message */}
      {status === "error" && errorMsg && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: "#FEF2F2", color: "var(--danger)" }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={status === "locating" || status === "submitting"}
        className="w-full h-14 rounded-xl text-white font-medium flex items-center justify-center gap-2 text-base disabled:opacity-60"
        style={{
          background:
            type === "check-in" ? "var(--blue-primary)" : "var(--text-muted)",
        }}
      >
        {status === "locating" ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري تحديد الموقع...
          </>
        ) : status === "submitting" ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري التسجيل...
          </>
        ) : (
          <>
            <MapPin className="w-5 h-5" />
            {type === "check-in" ? "تسجيل الحضور" : "إنهاء الدوام"}
          </>
        )}
      </button>
    </div>
  );
}
