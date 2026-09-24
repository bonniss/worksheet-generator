"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators";

export type LoginState = { error?: string; identifier?: string };

// Hash giả để thời gian phản hồi giống nhau khi email không tồn tại
const DUMMY_HASH = "$2b$10$4quPTQdTlP4ZnyhVA7vcwumc2bgEL9eTfRUB81RWiavS9ly/Jrk5C";

function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "");
  const parsed = loginSchema.safeParse({ identifier, password: formData.get("password") });
  if (!parsed.success) return { error: "Tên đăng nhập hoặc mật khẩu không đúng.", identifier };

  // Có @ → đăng nhập bằng email, không thì bằng username
  const id = parsed.data.identifier;
  const [user] = await db
    .select()
    .from(users)
    .where(id.includes("@") ? eq(users.email, id) : eq(users.username, id))
    .limit(1);
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Tên đăng nhập hoặc mật khẩu không đúng.", identifier };
  if (!user.isActive) return { error: "Tài khoản đã bị khoá. Liên hệ quản trị viên.", identifier };

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}
