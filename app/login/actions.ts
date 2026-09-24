"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators";

export type LoginState = { error?: string; email?: string };

// Hash giả để thời gian phản hồi giống nhau khi email không tồn tại
const DUMMY_HASH = "$2b$10$4quPTQdTlP4ZnyhVA7vcwumc2bgEL9eTfRUB81RWiavS9ly/Jrk5C";

function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: "Email hoặc mật khẩu không đúng.", email };

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Email hoặc mật khẩu không đúng.", email };
  if (!user.isActive) return { error: "Tài khoản đã bị khoá. Liên hệ quản trị viên.", email };

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}
