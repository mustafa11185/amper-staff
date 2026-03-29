"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Hexagon, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      phone,
      pin,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("رقم الهاتف أو الرمز السري غير صحيح");
      return;
    }

    // Fetch session to detect role and redirect
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (role === "collector") {
      router.push("/dashboard");
    } else if (role === "operator") {
      router.push("/attendance");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-full max-w-[340px] rounded-2xl p-8"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--blue-soft)" }}
          >
            <Hexagon
              className="w-7 h-7"
              style={{ color: "var(--blue-primary)" }}
            />
          </div>
        </div>

        {/* Title */}
        <h1
          className="text-xl font-bold text-center mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          أمبير
        </h1>
        <p
          className="text-sm text-center mb-8"
          style={{ color: "var(--text-muted)" }}
        >
          تطبيق الموظفين
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-primary)" }}
            >
              رقم الهاتف
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07701234567"
              className="w-full h-12 px-4 rounded-xl text-base outline-none transition"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                direction: "ltr",
                textAlign: "right",
              }}
              required
            />
          </div>

          {/* PIN */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-primary)" }}
            >
              الرمز السري
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={6}
              className="w-full h-12 px-4 rounded-xl text-base outline-none transition font-num tracking-widest"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                direction: "ltr",
                textAlign: "center",
                letterSpacing: "0.3em",
              }}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-sm text-center py-2 rounded-lg"
              style={{
                color: "var(--danger)",
                background: "#FEF2F2",
              }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !phone || !pin}
            className="w-full h-12 rounded-xl text-white text-base font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
            style={{ background: "var(--blue-primary)" }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "تسجيل الدخول"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
