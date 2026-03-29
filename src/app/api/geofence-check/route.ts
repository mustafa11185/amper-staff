import { NextRequest, NextResponse } from 'next/server'
import { requireCollector } from '@/lib/session'
import { prisma } from '@/lib/prisma'

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCollector()
    const { lat, lng } = await req.json()

    if (!lat || !lng) return NextResponse.json({ error: 'GPS required' }, { status: 400 })

    // Get branch GPS
    const branch = await prisma.branch.findUnique({
      where: { id: user.branchId },
    })

    if (!branch?.gps_lat || !branch?.gps_lng) {
      // No branch GPS set — allow everything
      return NextResponse.json({ isWithin: true, distance: 0, radius: 99999 })
    }

    // Get geofence radius from permissions
    const permission = await prisma.collectorPermission.findUnique({
      where: { staff_id: user.id },
    })
    const radius = permission?.geofence_radius_m ?? 2000

    const distance = Math.round(getDistanceMeters(
      lat, lng, Number(branch.gps_lat), Number(branch.gps_lng)
    ))

    const isWithin = distance <= radius

    // Log GPS with geofence status
    await prisma.staffGpsLog.create({
      data: {
        staff_id: user.id,
        branch_id: user.branchId,
        tenant_id: user.tenantId,
        lat, lng,
        source: 'geofence_check',
      },
    })

    return NextResponse.json({ isWithin, distance, radius })
  } catch (e: any) {
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
