import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const staffId = user.id as string
  const branchId = user.branchId as string

  // Get notifications for this staff member's branch that are relevant to them
  // Auto-expire: don't show collector_call notifications older than 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const notifications = await prisma.notification.findMany({
    where: {
      branch_id: branchId,
      OR: [
        { type: { in: ['discount_approved', 'discount_rejected'] }, payload: { path: ['staff_id'], equals: staffId } },
        { type: 'collector_call', created_at: { gte: twentyFourHoursAgo } },
      ],
    },
    orderBy: { created_at: 'desc' },
    take: 50,
  })

  return NextResponse.json({ notifications })
}
