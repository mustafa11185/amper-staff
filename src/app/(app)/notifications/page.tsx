'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
import toast from 'react-hot-toast'

type NotificationItem = {
  id: string
  type: string
  title: string | null
  body: string
  is_read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`
  if (hours > 0) return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`
  if (minutes > 0) return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`
  return 'الآن'
}

function typeIcon(type: string) {
  if (type === 'discount_approved') return '✅'
  if (type === 'discount_rejected') return '❌'
  if (type === 'collector_call') return '📞'
  return '🔔'
}

export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => {
        setNotifications(data.notifications || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' })
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      }
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-40" />
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell size={20} style={{ color: 'var(--blue-primary)' }} />
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>الإشعارات</h1>
        {unreadCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
            {unreadCount}
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-muted)' }}>
          <BellOff size={40} className="mb-3 opacity-40" />
          <p className="text-sm">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className="rounded-2xl p-4 transition-all"
              style={{
                background: 'var(--bg-surface)',
                boxShadow: 'var(--shadow-sm)',
                borderRight: !n.is_read ? '4px solid var(--blue-primary)' : '4px solid transparent',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{typeIcon(n.type)}</span>
                    {n.title && (
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{n.body}</p>
                  <p className="text-[10px] mt-1.5 font-num" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</p>
                  {/* Resolve button for collector calls */}
                  {n.type === 'collector_call' && !n.is_read && (
                    <button
                      onClick={async () => {
                        try {
                          await fetch('/api/collector-call-requests', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: (n as any).payload?.subscriber_id }),
                          })
                          markAsRead(n.id)
                          toast.success('تم تعيين الزيارة كمنجزة')
                        } catch { toast.error('خطأ') }
                      }}
                      className="mt-2 h-8 px-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1"
                      style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}
                    >
                      <Check size={12} /> ✅ تم الزيارة
                    </button>
                  )}
                </div>
                {!n.is_read && n.type !== 'collector_call' && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--blue-soft)', color: 'var(--blue-primary)' }}
                    title="تعيين كمقروء"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
