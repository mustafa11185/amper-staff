import { NextResponse } from 'next/server'
import { requireCollector } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireCollector()
    const count = await prisma.offlineSyncQueue.count({
      where: { branch_id: user.branchId, status: 'conflict' },
    })
    return NextResponse.json({ count })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ count: 0 })
  }
}
