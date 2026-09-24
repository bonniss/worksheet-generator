import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { worksheets } from "@/db/schema";
import { apiUser, jsonError } from "@/lib/auth/api";
import { worksheetPayloadSchema } from "@/lib/validators";
import { worksheetColumns } from "@/lib/worksheets";

// Danh sách (không kèm data). Admin thấy tất cả, user chỉ thấy của mình.
export async function GET() {
  const { user, error } = await apiUser();
  if (error) return error;
  const rows = await db
    .select({
      id: worksheets.id, ownerId: worksheets.ownerId, title: worksheets.title, level: worksheets.level,
      type: worksheets.type, topic: worksheets.topic, updatedAt: worksheets.updatedAt,
    })
    .from(worksheets)
    .where(user.role === "admin" ? undefined : eq(worksheets.ownerId, user.id))
    .orderBy(desc(worksheets.updatedAt))
    .limit(200);
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const { user, error } = await apiUser();
  if (error) return error;
  const parsed = worksheetPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Dữ liệu worksheet không hợp lệ");
  const [row] = await db
    .insert(worksheets)
    .values({ ownerId: user.id, ...worksheetColumns(parsed.data.data) })
    .returning({ id: worksheets.id });
  return NextResponse.json({ id: row.id }, { status: 201 });
}
