"use client";

import { WifiOff, Clock } from "lucide-react";

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
}

export default function OfflineBanner({
  isOnline,
  pendingCount,
}: OfflineBannerProps) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="bg-offline text-white text-sm px-4 py-2 flex items-center justify-between">
      {!isOnline && (
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>وضع أوفلاين — البيانات محلية، ستُزامن عند عودة الاتصال</span>
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>جاري رفع {pendingCount} دفعات...</span>
        </div>
      )}
      {!isOnline && pendingCount > 0 && (
        <div className="flex items-center gap-1 text-xs opacity-80">
          <Clock className="w-3 h-3" />
          <span>{pendingCount} دفعات بانتظار الرفع</span>
        </div>
      )}
    </div>
  );
}
