import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireStaff();
    const { category, amount, description } = await req.json();

    if (!category || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid expense" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        branch_id: user.branchId,
        staff_id: user.id,
        category,
        amount,
        description: description ?? null,
      },
    });

    return NextResponse.json({ ok: true, expense_id: expense.id });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
