import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { worksheets } from "@/db/schema";
import { apiUser, jsonError } from "@/lib/auth/api";
import { canAccessWorksheet } from "@/lib/auth/guards";
import type { SessionUser } from "@/lib/auth/session";
import { isUuid, worksheetPayloadSchema } from "@/lib/validators";
import { worksheetColumns } from "@/lib/worksheets";

type Ctx = { params: { id: string } };

// Trả 404 cho cả "không tồn tại" lẫn "không có quyền" để không lộ id của người khác.
async function load(user: SessionUser, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(worksheets).where(eq(worksheets.id, id)).limit(1);
  return row && canAccessWorksheet(user, row) ? row : null;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const row = await load(user, params.id);
  if (!row) return jsonError(404, "Không tìm thấy worksheet");
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const row = await load(user, params.id);
  if (!row) return jsonError(404, "Không tìm thấy worksheet");
  const parsed = worksheetPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Dữ liệu worksheet không hợp lệ");
  await db
    .update(worksheets)
    .set({ ...worksheetColumns(parsed.data.data), updatedAt: new Date() })
    .where(eq(worksheets.id, row.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const row = await load(user, params.id);
  if (!row) return jsonError(404, "Không tìm thấy worksheet");
  await db.delete(worksheets).where(eq(worksheets.id, row.id));
  return NextResponse.json({ ok: true });
}
