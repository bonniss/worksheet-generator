"use server";
import { and, count, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import { requireAdmin, revokeUserSessions } from "@/lib/auth/session";
import {
  createUserSchema, fieldErrors, importRowSchema, isUuid, MAX_IMPORT_ROWS, updateUserSchema, type ImportRowInput,
} from "@/lib/validators";

export type FormState = {
  error?: string;
  fields?: Record<string, string>;
  success?: string;
  /** Email của tài khoản vừa tạo */
  email?: string;
  /** Mật khẩu vừa sinh — chỉ hiển thị một lần */
  generatedPassword?: string;
};

/** Còn admin đang hoạt động nào khác ngoài `userId` không. */
async function hasOtherActiveAdmin(userId: string): Promise<boolean> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true), ne(users.id, userId)));
  return n > 0;
}

async function emailTaken(email: string): Promise<boolean> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return !!row;
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const { email, name, role } = parsed.data;
  if (await emailTaken(email)) return { fields: { email: "Email đã tồn tại" } };

  const generated = parsed.data.password ? undefined : generatePassword();
  const password = parsed.data.password || generated!;
  await db.insert(users).values({ email, name, role, passwordHash: await hashPassword(password) });
  revalidatePath("/admin/users");
  return {
    success: `Đã tạo tài khoản ${email}.`,
    email,
    generatedPassword: generated,
  };
}

export async function updateUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Tài khoản không tồn tại." };
  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { error: "Tài khoản không tồn tại." };
  const { name, role, isActive } = parsed.data;

  if (id === me.id && (role !== "admin" || !isActive)) {
    return { error: "Bạn không thể tự hạ quyền hoặc tự khoá tài khoản của mình." };
  }
  const losesAdmin = target.role === "admin" && target.isActive && (role !== "admin" || !isActive);
  if (losesAdmin && !(await hasOtherActiveAdmin(id))) {
    return { error: "Phải còn ít nhất một admin đang hoạt động." };
  }

  await db.update(users).set({ name, role, isActive, updatedAt: new Date() }).where(eq(users.id, id));
  // Đổi quyền hoặc khoá → đăng xuất khỏi mọi thiết bị
  if (role !== target.role || isActive !== target.isActive) await revokeUserSessions(id);
  revalidatePath("/admin/users");
  return { success: "Đã lưu thay đổi." };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Tài khoản không tồn tại." };
  if (id === me.id) return { error: "Đổi mật khẩu của chính bạn trong trang Hồ sơ." };
  const password = generatePassword();
  const updated = await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ id: users.id });
  if (!updated.length) return { error: "Tài khoản không tồn tại." };
  await revokeUserSessions(id);
  return { success: "Đã đặt lại mật khẩu.", generatedPassword: password };
}

export async function deleteUser(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id) || id === me.id) return;
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return;
  if (target.role === "admin" && target.isActive && !(await hasOtherActiveAdmin(id))) return;
  // sessions và worksheets của user bị xoá theo (ON DELETE CASCADE)
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/users");
  revalidatePath("/worksheets");
  redirect("/admin/users");
}

/* ===== IMPORT ===== */

export type ImportResult = {
  error?: string;
  created: { line: number; email: string; name: string; role: string; password?: string }[];
  skipped: { line: number; email: string; reason: string }[];
  errors: { line: number; email: string; message: string }[];
};

/** `rows[i].line` là số dòng trong file CSV (để báo lỗi đúng chỗ). */
export async function importUsers(rows: (ImportRowInput & { line: number })[]): Promise<ImportResult> {
  await requireAdmin();
  const result: ImportResult = { created: [], skipped: [], errors: [] };
  if (!Array.isArray(rows) || rows.length === 0) return { ...result, error: "File không có dòng dữ liệu nào." };
  if (rows.length > MAX_IMPORT_ROWS) return { ...result, error: `Tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần import.` };

  const valid: { line: number; email: string; name: string; role: "admin" | "user"; password: string; generated: boolean }[] = [];
  const seen = new Set<string>();
  for (const raw of rows) {
    const line = Number(raw.line) || 0;
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      result.errors.push({ line, email: String(raw.email ?? ""), message: Object.values(fieldErrors(parsed.error)).join("; ") });
      continue;
    }
    const { email, name, role } = parsed.data;
    if (seen.has(email)) {
      result.skipped.push({ line, email, reason: "Trùng email trong file" });
      continue;
    }
    seen.add(email);
    const generated = !parsed.data.password;
    valid.push({ line, email, name, role, password: parsed.data.password || generatePassword(), generated });
  }

  if (valid.length) {
    const existing = await db
      .select({ email: users.email })
      .from(users)
      .where(inArray(users.email, valid.map((v) => v.email)));
    const taken = new Set(existing.map((e) => e.email));
    const toCreate = valid.filter((v) => {
      if (!taken.has(v.email)) return true;
      result.skipped.push({ line: v.line, email: v.email, reason: "Email đã tồn tại" });
      return false;
    });

    if (toCreate.length) {
      const values = await Promise.all(
        toCreate.map(async (v) => ({ email: v.email, name: v.name, role: v.role, passwordHash: await hashPassword(v.password) })),
      );
      // Một câu INSERT duy nhất: hoặc tạo hết, hoặc không tạo gì. ON CONFLICT phòng trường hợp bị tạo chen giữa chừng.
      const inserted = await db
        .insert(users)
        .values(values)
        .onConflictDoNothing({ target: users.email })
        .returning({ email: users.email });
      const insertedSet = new Set(inserted.map((i) => i.email));
      for (const v of toCreate) {
        if (insertedSet.has(v.email)) {
          result.created.push({ line: v.line, email: v.email, name: v.name, role: v.role, password: v.generated ? v.password : undefined });
        } else {
          result.skipped.push({ line: v.line, email: v.email, reason: "Email đã tồn tại" });
        }
      }
    }
  }

  const byLine = (a: { line: number }, b: { line: number }) => a.line - b.line;
  result.skipped.sort(byLine);
  result.errors.sort(byLine);
  if (result.created.length) revalidatePath("/admin/users");
  return result;
}
