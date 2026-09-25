import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { worksheets } from "@/db/schema";
import { apiUser, jsonError } from "@/lib/auth/api";
import { canEditWorksheet, canViewWorksheet } from "@/lib/auth/guards";
import type { SessionUser } from "@/lib/auth/session";
import { isUuid, worksheetPayloadSchema } from "@/lib/validators";
import { worksheetColumns } from "@/lib/worksheets";

type Ctx = { params: { id: string } };

/**
 * Không xem được → 404 (không lộ worksheet riêng tư của người khác có tồn tại hay không).
 * Xem được nhưng không sửa được (worksheet công khai của người khác) → 403.
 */
async function load(user: SessionUser, id: string, mode: "view" | "edit") {
  if (!isUuid(id)) return { error: jsonError(404, "Không tìm thấy worksheet") };
  const [row] = await db.select().from(worksheets).where(eq(worksheets.id, id)).limit(1);
  if (!row || !canViewWorksheet(user, row)) return { error: jsonError(404, "Không tìm thấy worksheet") };
  if (mode === "edit" && !canEditWorksheet(user, row)) {
    return { error: jsonError(403, "Worksheet này của người khác — chỉ xem được. Hãy nhân bản về để sửa.") };
  }
  return { row };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await load(user, params.id, "view");
  if (r.error) return r.error;
  return NextResponse.json(r.row);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await load(user, params.id, "edit");
  if (r.error) return r.error;
  const parsed = worksheetPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Dữ liệu worksheet không hợp lệ");
  await db
    .update(worksheets)
    .set({ ...worksheetColumns(parsed.data.data), updatedAt: new Date() })
    .where(eq(worksheets.id, r.row.id));
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({ visibility: z.enum(["private", "public"]) });

/** Đổi chế độ chia sẻ. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await load(user, params.id, "edit");
  if (r.error) return r.error;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Yêu cầu không hợp lệ");
  await db.update(worksheets).set({ visibility: parsed.data.visibility }).where(eq(worksheets.id, r.row.id));
  return NextResponse.json({ ok: true, visibility: parsed.data.visibility });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const r = await load(user, params.id, "edit");
  if (r.error) return r.error;
  await db.delete(worksheets).where(eq(worksheets.id, r.row.id));
  return NextResponse.json({ ok: true });
}
