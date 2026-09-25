"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireUser, revokeUserSessions } from "@/lib/auth/session";
import { changePasswordSchema, fieldErrors, profileSchema } from "@/lib/validators";

export type ProfileState = { error?: string; success?: string; fields?: Record<string, string> };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const me = await requireUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  await db.update(users).set({ name: parsed.data.name, updatedAt: new Date() }).where(eq(users.id, me.id));
  revalidatePath("/", "layout"); // tên trên header
  return { success: "Đã cập nhật hồ sơ." };
}

export async function changePassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const me = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, me.id)).limit(1);
  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return { fields: { currentPassword: "Mật khẩu hiện tại không đúng" } };
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, me.id));
  await revokeUserSessions(me.id, true); // đăng xuất các thiết bị khác
  return { success: "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất." };
}
