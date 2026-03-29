import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export async function POST() {
  const current = nowMinutes();
  let reminders = 0;
  let lateAlerts = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active staff with shift times
  const collectors = await prisma.staff.findMany({
    where: { is_active: true, role: "collector" },
    include: {
      collector_permission: true,
      branch: { select: { name: true } },
      collector_shifts: {
        where: { shift_date: today },
        take: 1,
      },
    },
  }) as any[];

  const operators = await prisma.staff.findMany({
    where: { is_active: true, role: "operator" },
    include: {
      operator_permission: true,
      branch: { select: { name: true } },
      operator_shifts: {
        where: { shift_date: today },
        take: 1,
      },
    },
  }) as any[];

  const allStaff = [
    ...collectors.map((s: any) => ({
      id: s.id,
      name: s.name,
      branchId: s.branch_id,
      tenantId: s.tenant_id,
      shiftStart: s.collector_permission?.shift_start_time,
      checkedIn: !!s.collector_shifts?.[0]?.check_in_at,
    })),
    ...operators.map((s: any) => ({
      id: s.id,
      name: s.name,
      branchId: s.branch_id,
      tenantId: s.tenant_id,
      shiftStart: s.operator_permission?.shift_start_time,
      checkedIn: !!s.operator_shifts?.[0]?.check_in_at,
    })),
  ];

  for (const staff of allStaff) {
    if (!staff.shiftStart) continue;

    const shiftMin = timeToMinutes(staff.shiftStart);

    // 15 minutes before shift — reminder
    if (current >= shiftMin - 16 && current <= shiftMin - 14 && !staff.checkedIn) {
      const existing = await prisma.notification.findFirst({
        where: {
          branch_id: staff.branchId,
          type: "shift_reminder",
          created_at: { gte: today },
          payload: { path: ["staff_id"], equals: staff.id },
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            branch_id: staff.branchId,
            tenant_id: staff.tenantId,
            type: "shift_reminder",
            body: `تذكير: دوامك يبدأ الساعة ${staff.shiftStart} — استعد!`,
            is_read: false,
            payload: { staff_id: staff.id, shift_start: staff.shiftStart },
          },
        });
        reminders++;
      }
    }

    // 1 minute after shift start — late alert to manager
    if (current >= shiftMin + 1 && current <= shiftMin + 2 && !staff.checkedIn) {
      const existing = await prisma.notification.findFirst({
        where: {
          branch_id: staff.branchId,
          type: "staff_late",
          created_at: { gte: today },
          payload: { path: ["staff_id"], equals: staff.id },
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            branch_id: staff.branchId,
            tenant_id: staff.tenantId,
            type: "staff_late",
            body: `${staff.name} لم يسجّل حضوره — الدوام بدأ الساعة ${staff.shiftStart}`,
            is_read: false,
            payload: { staff_id: staff.id, shift_start: staff.shiftStart, target: "manager" },
          },
        });
        lateAlerts++;
      }
    }
  }

  return NextResponse.json({ ok: true, reminders, late_alerts: lateAlerts });
}
