'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default function PaymentSuccessPage() {
  const params = useSearchParams()
  const router = useRouter()
  const subscriberId = params?.get('subscriber') || ''

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.1)' }}>
        <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--success)' }} />
      </div>
      <h2 className="text-lg font-bold" style={{ color: 'var(--success)' }}>تم الدفع الإلكتروني بنجاح</h2>
      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>تم تسجيل الدفعة — لا تحتاج استلام نقدي</p>
      <button onClick={() => router.push('/pos')} className="w-full h-11 rounded-xl text-white text-sm font-bold" style={{ background: 'var(--blue-primary)' }}>
        العودة لنقطة الدفع
      </button>
      {subscriberId && (
        <button onClick={() => router.push(`/subscribers/${subscriberId}`)} className="w-full h-10 rounded-xl text-sm font-medium"
          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
          صفحة المشترك
        </button>
      )}
    </div>
  )
}
