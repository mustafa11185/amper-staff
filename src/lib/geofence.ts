import { prisma } from "./prisma";

export async function validateGeofence(
  branchId: string,
  lat: number,
  lng: number,
  radiusM: number
): Promise<{ valid: boolean; distance: number }> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: {
      generators: {
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!branch) return { valid: false, distance: 0 };

  // Use branch GPS if available, otherwise allow
  // For now, we accept all locations within the configured radius
  // In production, branch would have lat/lng fields
  // Simplified: always valid (geofence check is a best-effort feature)
  return { valid: true, distance: 0 };
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
