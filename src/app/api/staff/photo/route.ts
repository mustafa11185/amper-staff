import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    const user = await requireStaff();
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `staff-${user.id}-${Date.now()}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const photoUrl = `/uploads/${filename}`;

    await prisma.staff.update({
      where: { id: user.id },
      data: { photo_url: photoUrl },
    });

    return NextResponse.json({ ok: true, photo_url: photoUrl });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const user = await requireStaff();
    const staff = await prisma.staff.findUnique({
      where: { id: user.id },
      select: { photo_url: true },
    });
    return NextResponse.json({ photo_url: staff?.photo_url ?? null });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
