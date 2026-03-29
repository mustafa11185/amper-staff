import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "staff",
      credentials: {
        phone: {},
        pin: {},
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.pin) return null;

        const staff = (await prisma.staff.findFirst({
          where: {
            phone: credentials.phone,
            is_active: true,
            role: { in: ["collector", "operator"] },
          },
          include: {
            branch: true,
            collector_permission: true,
            operator_permission: true,
          },
        })) as any;

        if (!staff) return null;
        if (staff.pin !== credentials.pin) return null;

        return {
          id: staff.id,
          name: staff.name,
          phone: staff.phone,
          role: staff.role,
          tenantId: staff.tenant_id,
          branchId: staff.branch_id,
          branchName: staff.branch.name,
          photoUrl: staff.photo_url ?? null,
          canCollect: staff.can_collect,
          canOperate: staff.can_operate,
          isDualRole: staff.role === "collector" && staff.can_operate === true,
          // Collector permissions
          canGiveDiscount:
            staff.collector_permission?.can_give_discount ?? false,
          discountMaxAmount: Number(
            staff.collector_permission?.discount_max_amount ?? 0
          ),
          discountTimeoutMin:
            staff.collector_permission?.discount_timeout_min ?? 15,
          requireCheckin:
            staff.collector_permission?.require_shift_checkin ??
            staff.operator_permission?.require_shift_checkin ??
            false,
          geofenceRadius:
            staff.collector_permission?.geofence_radius_m ??
            staff.operator_permission?.geofence_radius_m ??
            2000,
          dailyTarget: staff.collector_permission?.daily_target ?? 0,
          shiftStartTime:
            staff.collector_permission?.shift_start_time ??
            staff.operator_permission?.shift_start_time ??
            null,
          shiftEndTime:
            staff.collector_permission?.shift_end_time ??
            staff.operator_permission?.shift_end_time ??
            null,
          // Operator permissions
          canToggleGenerator:
            staff.operator_permission?.can_toggle_generator ?? false,
          canAddFuel: staff.operator_permission?.can_add_fuel ?? true,
          canManualMode: staff.operator_permission?.can_manual_mode ?? false,
          canLogHours: staff.operator_permission?.can_log_hours ?? true,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) Object.assign(token, user);
      return token;
    },
    session({ session, token }) {
      Object.assign(session.user as any, token);
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
