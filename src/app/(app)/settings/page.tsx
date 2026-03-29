"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { User, Shield, Building2, LogOut, Camera, Loader2, Printer, Bluetooth, FileText } from "lucide-react";
import toast from "react-hot-toast";
import {
  detectPrinterType, savePrinterType, getSavedPrinterType,
  getSavedBluetoothDevice, connectBluetoothPrinter,
  type PrinterType,
} from "@/lib/printer";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const roleLabel = user?.role === "collector" ? "جابي" : user?.role === "operator" ? "مشغل" : "—";
  const roleBg = user?.role === "collector" ? "var(--blue-soft)" : "var(--gold-soft)";
  const roleColor = user?.role === "collector" ? "var(--blue-primary)" : "var(--gold)";

  // Load current photo
  useEffect(() => {
    if (user?.photoUrl) {
      setPhotoUrl(user.photoUrl);
    } else {
      fetch("/api/staff/photo")
        .then((r) => r.json())
        .then((d) => { if (d.photo_url) setPhotoUrl(d.photo_url); })
        .catch(() => {});
    }
  }, [user]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/staff/photo", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setPhotoUrl(data.photo_url);
        toast.success("تم تحديث الصورة");
      } else {
        toast.error("فشل رفع الصورة");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    }
    setUploading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">الإعدادات</h2>

      {/* Profile Photo */}
      <div className="flex flex-col items-center py-4">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: "var(--blue-soft)" }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8" style={{ color: "var(--blue-primary)" }} />
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ background: "var(--blue-primary)" }}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>
        <p className="text-sm font-bold mt-2">{user?.name ?? "—"}</p>
        <div
          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1"
          style={{ background: roleBg, color: roleColor }}
        >
          {roleLabel}
        </div>
      </div>

      <div
        className="rounded-xl p-4 space-y-4"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
      >
        {/* Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--blue-soft)" }}>
            <User className="w-5 h-5" style={{ color: "var(--blue-primary)" }} />
          </div>
          <div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>اسم المستخدم</div>
            <div className="font-medium">{user?.name ?? "—"}</div>
          </div>
        </div>

        {/* Role */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: roleBg }}>
            <Shield className="w-5 h-5" style={{ color: roleColor }} />
          </div>
          <div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>الدور</div>
            <div className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: roleBg, color: roleColor }}>
              {roleLabel}
            </div>
          </div>
        </div>

        {/* Branch */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--bg-muted)" }}>
            <Building2 className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          </div>
          <div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>الفرع</div>
            <div className="font-medium">{user?.branchName ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Printer Settings */}
      {(user?.role === "collector" || user?.isDualRole) && <PrinterSettings />}

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-medium"
        style={{ background: "#FEF2F2", color: "var(--danger)" }}
      >
        <LogOut className="w-5 h-5" />
        تسجيل الخروج
      </button>
    </div>
  );
}

function PrinterSettings() {
  const [printerType, setPrinterType] = useState<PrinterType>("none");
  const [btDevice, setBtDevice] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [isSunmiAvailable, setIsSunmiAvailable] = useState(false);

  useEffect(() => {
    const detected = detectPrinterType();
    setPrinterType(getSavedPrinterType());
    setIsSunmiAvailable(detected === "sunmi");
    setBtDevice(getSavedBluetoothDevice());
    // Auto-select Sunmi if available and nothing saved
    if (detected === "sunmi" && getSavedPrinterType() === "none") {
      setPrinterType("sunmi");
      savePrinterType("sunmi");
    }
  }, []);

  function selectType(type: PrinterType) {
    setPrinterType(type);
    savePrinterType(type);
    if (type === "sunmi") toast.success("تم اختيار طابعة Sunmi");
    else if (type === "none") toast.success("بدون طابعة — سيتم الطباعة عبر المتصفح");
  }

  async function pairBluetooth() {
    setConnecting(true);
    try {
      const name = await connectBluetoothPrinter();
      setBtDevice(name);
      setPrinterType("bluetooth");
      toast.success(`تم الاتصال بـ ${name}`);
    } catch (e: any) {
      toast.error(e.message || "فشل الاتصال");
    }
    setConnecting(false);
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Printer className="w-5 h-5" style={{ color: "var(--blue-primary)" }} />
        <h3 className="text-sm font-bold">إعدادات الطابعة</h3>
      </div>

      {/* Printer type selector */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => selectType("sunmi")}
          disabled={!isSunmiAvailable}
          className="rounded-xl p-3 text-center transition-all disabled:opacity-30"
          style={{
            background: printerType === "sunmi" ? "var(--blue-primary)" : "var(--bg-muted)",
            color: printerType === "sunmi" ? "#fff" : "var(--text-muted)",
            border: `1px solid ${printerType === "sunmi" ? "var(--blue-primary)" : "var(--border)"}`,
          }}
        >
          <span className="text-base block mb-0.5">🖨️</span>
          <span className="text-[10px] font-bold">Sunmi</span>
        </button>

        <button
          onClick={() => { selectType("bluetooth"); if (!btDevice) pairBluetooth(); }}
          className="rounded-xl p-3 text-center transition-all"
          style={{
            background: printerType === "bluetooth" ? "var(--violet)" : "var(--bg-muted)",
            color: printerType === "bluetooth" ? "#fff" : "var(--text-muted)",
            border: `1px solid ${printerType === "bluetooth" ? "var(--violet)" : "var(--border)"}`,
          }}
        >
          <span className="text-base block mb-0.5">📱</span>
          <span className="text-[10px] font-bold">Bluetooth</span>
        </button>

        <button
          onClick={() => selectType("none")}
          className="rounded-xl p-3 text-center transition-all"
          style={{
            background: printerType === "none" ? "var(--text-secondary)" : "var(--bg-muted)",
            color: printerType === "none" ? "#fff" : "var(--text-muted)",
            border: `1px solid ${printerType === "none" ? "var(--text-secondary)" : "var(--border)"}`,
          }}
        >
          <span className="text-base block mb-0.5">📄</span>
          <span className="text-[10px] font-bold">بدون طابعة</span>
        </button>
      </div>

      {/* Sunmi detected badge */}
      {isSunmiAvailable && (
        <div className="rounded-lg p-2 flex items-center gap-2" style={{ background: "rgba(5,150,105,0.1)" }}>
          <span className="text-xs" style={{ color: "var(--success)" }}>✅ تم اكتشاف طابعة Sunmi تلقائياً</span>
        </div>
      )}

      {/* Bluetooth controls */}
      {printerType === "bluetooth" && (
        <div className="space-y-2">
          {btDevice ? (
            <div className="rounded-lg p-2.5 flex items-center justify-between" style={{ background: "var(--bg-muted)" }}>
              <div className="flex items-center gap-2">
                <Bluetooth className="w-4 h-4" style={{ color: "var(--violet)" }} />
                <span className="text-xs font-medium">{btDevice}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(5,150,105,0.1)", color: "var(--success)" }}>متصل</span>
            </div>
          ) : null}
          <button
            onClick={pairBluetooth}
            disabled={connecting}
            className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: "var(--violet)", color: "#fff" }}
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5" />}
            {connecting ? "جاري البحث..." : "🔍 بحث وربط طابعة"}
          </button>
        </div>
      )}

      {/* No printer info */}
      {printerType === "none" && (
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          سيتم فتح نافذة طباعة المتصفح أو إرسال الإيصال عبر واتساب
        </p>
      )}
    </div>
  );
}
