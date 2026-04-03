import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireStaff();
    const { token, platform } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "token مطلوب" }, { status: 400 });
    }

    await prisma.staffDevice.upsert({
      where: { staff_id_fcm_token: { staff_id: user.id, fcm_token: token } },
      create: {
        staff_id: user.id,
        fcm_token: token,
        platform: platform || "android",
      },
      update: {
        is_active: true,
        platform: platform || "android",
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
