"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { worksheets } from "@/db/schema";
import { canEditWorksheet, canViewWorksheet } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { isUuid } from "@/lib/validators";

async function load(id: FormDataEntryValue | null, mode: "view" | "edit") {
  const user = await requireUser();
  if (typeof id !== "string" || !isUuid(id)) return null;
  const [row] = await db.select().from(worksheets).where(eq(worksheets.id, id)).limit(1);
  if (!row) return null;
  const ok = mode === "edit" ? canEditWorksheet(user, row) : canViewWorksheet(user, row);
  return ok ? { user, row } : null;
}

export async function deleteWorksheet(formData: FormData) {
  const found = await load(formData.get("id"), "edit");
  if (!found) return;
  await db.delete(worksheets).where(eq(worksheets.id, found.row.id));
  revalidatePath("/worksheets");
  revalidatePath("/library");
}

/**
 * Bản sao luôn thuộc về người bấm và ở chế độ riêng tư (kể cả khi nhân bản worksheet công khai của người khác).
 * `open=1` → mở ngay bản sao để sửa (dùng từ thư viện / trang chỉ xem).
 */
export async function duplicateWorksheet(formData: FormData) {
  const found = await load(formData.get("id"), "view");
  if (!found) return;
  const { row, user } = found;
  const title = row.ownerId === user.id ? `${row.title} (bản sao)` : row.title;
  const [copy] = await db
    .insert(worksheets)
    .values({
      ownerId: user.id, title, level: row.level, type: row.type, topic: row.topic, visibility: "private",
      data: { ...row.data, savedAt: new Date().toISOString(), ws: { ...row.data.ws, title } },
    })
    .returning({ id: worksheets.id });
  revalidatePath("/worksheets");
  if (formData.get("open") === "1") redirect(`/worksheets/${copy.id}`);
}

export async function setVisibility(formData: FormData) {
  const found = await load(formData.get("id"), "edit");
  if (!found) return;
  const visibility = formData.get("visibility") === "public" ? "public" : "private";
  await db.update(worksheets).set({ visibility }).where(eq(worksheets.id, found.row.id));
  revalidatePath("/worksheets");
  revalidatePath("/library");
}
