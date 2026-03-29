"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_DAYS = 3;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    // Already installed as standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone === true) return;

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (isIOS) {
      // Always show on iOS until installed
      setShowIOS(true);
      return;
    }

    // Android/Chrome: check dismiss cooldown
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const daysSince = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowAndroid(false);
      localStorage.setItem("pwa_installed", "true");
    }
    setDeferredPrompt(null);
  }

  function dismissAndroid() {
    setShowAndroid(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  function dismissIOS() {
    setShowIOS(false);
    // Don't persist — show again next session until installed
  }

  if (!showAndroid && !showIOS) return null;

  return (
    <div className="max-w-[390px] w-full mx-auto px-4 pt-2">
      <div
        className="rounded-2xl p-4"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Android prompt */}
        {showAndroid && (
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--blue-soft)" }}
            >
              <Download className="w-5 h-5" style={{ color: "var(--blue-primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-1">
                ثبّت التطبيق على هاتفك للعمل بدون إنترنت
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleInstall}
                  className="h-8 px-4 rounded-lg text-white text-[11px] font-bold"
                  style={{ background: "var(--blue-primary)" }}
                >
                  تثبيت الآن
                </button>
                <button
                  onClick={dismissAndroid}
                  className="h-8 px-3 rounded-lg text-[11px] font-medium"
                  style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}
                >
                  لاحقاً
                </button>
              </div>
            </div>
            <button onClick={dismissAndroid} className="shrink-0 p-1">
              <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        )}

        {/* iOS prompt */}
        {showIOS && (
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--blue-soft)" }}
            >
              <Share className="w-5 h-5" style={{ color: "var(--blue-primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-1.5">
                لتثبيت التطبيق على iPhone:
              </p>
              <ol className="text-[11px] space-y-1" style={{ color: "var(--text-secondary)" }}>
                <li>1. اضغط زر المشاركة <Share className="w-3 h-3 inline" /></li>
                <li>2. اختر &quot;إضافة للشاشة الرئيسية&quot;</li>
              </ol>
            </div>
            <button onClick={dismissIOS} className="shrink-0 p-1">
              <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
