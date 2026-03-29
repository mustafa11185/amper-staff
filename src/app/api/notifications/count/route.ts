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

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const count = await prisma.notification.count({
    where: {
      branch_id: branchId,
      is_read: false,
      OR: [
        { type: { in: ['discount_approved', 'discount_rejected'] }, payload: { path: ['staff_id'], equals: staffId } },
        { type: 'collector_call', created_at: { gte: twentyFourHoursAgo } },
      ],
    },
  })

  return NextResponse.json({ count })
}
