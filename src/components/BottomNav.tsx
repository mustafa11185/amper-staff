"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  CreditCard,
  BarChart2,
  Settings,
  Zap,
  Fuel,
  ClipboardList,
  CheckCircle,
} from "lucide-react";

interface BottomNavProps {
  role: "collector" | "operator";
  isDualRole?: boolean;
}

type Tab = {
  href: string;
  icon: any;
  label: string;
  isCenter?: boolean;
};

// Collector (5 tabs): الرئيسية | المشتركون | 💳 (center) | تقريري | إعدادات
const collectorTabs: Tab[] = [
  { href: "/dashboard", icon: Home, label: "الرئيسية" },
  { href: "/subscribers", icon: Users, label: "المشتركون" },
  { href: "/pos", icon: CreditCard, label: "", isCenter: true },
  { href: "/my-report", icon: BarChart2, label: "تقريري" },
  { href: "/settings", icon: Settings, label: "الإعدادات" },
];

// Operator (5 tabs): الدوام | المحركات | الوقود (center) | سجلاتي | إعدادات
const operatorTabs: Tab[] = [
  { href: "/attendance", icon: CheckCircle, label: "الدوام" },
  { href: "/engines", icon: Zap, label: "المحركات" },
  { href: "/fuel", icon: Fuel, label: "الوقود", isCenter: true },
  { href: "/my-logs", icon: ClipboardList, label: "سجلاتي" },
  { href: "/settings", icon: Settings, label: "الإعدادات" },
];

// Dual (5 tabs): الرئيسية | المحركات | 💳 (center) | تقريري | إعدادات
const dualTabs: Tab[] = [
  { href: "/dashboard", icon: Home, label: "الرئيسية" },
  { href: "/engines", icon: Zap, label: "المحركات" },
  { href: "/pos", icon: CreditCard, label: "", isCenter: true },
  { href: "/my-report", icon: BarChart2, label: "تقريري" },
  { href: "/settings", icon: Settings, label: "الإعدادات" },
];

export default function BottomNav({ role, isDualRole }: BottomNavProps) {
  const pathname = usePathname();

  let tabs;
  if (isDualRole) {
    tabs = dualTabs;
  } else if (role === "collector") {
    tabs = collectorTabs;
  } else {
    tabs = operatorTabs;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t z-50" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-[390px] mx-auto flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom)] h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center">
                <div style={{
                  width: 52,
                  height: 52,
                  background: "#1B4FD8",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -32,
                  boxShadow: "0 4px 12px rgba(27,79,216,0.4)",
                  position: "relative",
                  zIndex: 10,
                }}>
                  <CreditCard color="white" size={22} />
                </div>
              </Link>
            );
          }

          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-[48px]">
              <Icon className="w-5 h-5" style={{ color: isActive ? "var(--blue-primary)" : "var(--text-muted)" }} />
              <span className="text-[10px]" style={{ color: isActive ? "var(--blue-primary)" : "var(--text-muted)", fontWeight: isActive ? 600 : 400 }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
