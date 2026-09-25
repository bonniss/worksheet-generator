"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireUser, revokeUserSessions } from "@/lib/auth/session";
import { fieldErrors, password } from "@/lib/validators";

export type ChangeState = { error?: string; fields?: Record<string, string> };

const schema = z
  .object({ newPassword: password, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp" });

/** Đổi mật khẩu tạm (do admin đặt) ở lần đăng nhập đầu. Vừa đăng nhập bằng mật khẩu tạm nên không hỏi lại. */
export async function changeInitialPassword(_prev: ChangeState, formData: FormData): Promise<ChangeState> {
  const me = await requireUser({ allowPendingPasswordChange: true });
  if (!me.mustChangePassword) redirect("/");
  const parsed = schema.safeParse({ newPassword: formData.get("newPassword"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, me.id)).limit(1);
  if (row && (await verifyPassword(parsed.data.newPassword, row.passwordHash))) {
    return { fields: { newPassword: "Mật khẩu mới phải khác mật khẩu tạm được cấp." } };
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, me.id));
  await revokeUserSessions(me.id, true); // đăng xuất các thiết bị khác, giữ phiên hiện tại
  redirect("/");
}
