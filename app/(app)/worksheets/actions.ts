"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { worksheets } from "@/db/schema";
import { canAccessWorksheet } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { isUuid } from "@/lib/validators";

async function loadAccessible(id: FormDataEntryValue | null) {
  const user = await requireUser();
  if (typeof id !== "string" || !isUuid(id)) return null;
  const [row] = await db.select().from(worksheets).where(eq(worksheets.id, id)).limit(1);
  return row && canAccessWorksheet(user, row) ? { user, row } : null;
}

export async function deleteWorksheet(formData: FormData) {
  const found = await loadAccessible(formData.get("id"));
  if (!found) return;
  await db.delete(worksheets).where(eq(worksheets.id, found.row.id));
  revalidatePath("/worksheets");
}

// Bản sao luôn thuộc về người bấm (kể cả admin nhân bản worksheet của người khác)
export async function duplicateWorksheet(formData: FormData) {
  const found = await loadAccessible(formData.get("id"));
  if (!found) return;
  const { row, user } = found;
  const title = `${row.title} (bản sao)`;
  await db.insert(worksheets).values({
    ownerId: user.id, title, level: row.level, type: row.type, topic: row.topic,
    data: { ...row.data, savedAt: new Date().toISOString(), ws: { ...row.data.ws, title } },
  });
  revalidatePath("/worksheets");
}
