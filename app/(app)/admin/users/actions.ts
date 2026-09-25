"use server";
import { z } from "zod";
import { and, count, eq, inArray, ne, or } from "drizzle-orm";
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
  /** Username của tài khoản vừa tạo */
  username?: string;
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

/** Lỗi trùng username/email (bỏ qua chính tài khoản `exceptId`). */
async function uniquenessErrors(username: string | null, email: string | null, exceptId?: string) {
  const fields: Record<string, string> = {};
  const clauses = [username ? eq(users.username, username) : undefined, email ? eq(users.email, email) : undefined];
  if (!clauses.some(Boolean)) return fields;
  const rows = await db
    .select({ username: users.username, email: users.email })
    .from(users)
    .where(and(or(...clauses), exceptId ? ne(users.id, exceptId) : undefined));
  if (username && rows.some((r) => r.username === username)) fields.username = "Username đã tồn tại";
  if (email && rows.some((r) => r.email === email)) fields.email = "Email đã được dùng cho tài khoản khác";
  return fields;
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = createUserSchema.safeParse({
    username: formData.get("username") ?? "",
    email: formData.get("email") ?? "",
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const { username, email, name, role } = parsed.data;
  const taken = await uniquenessErrors(username, email);
  if (Object.keys(taken).length) return { fields: taken };

  const generated = parsed.data.password ? undefined : generatePassword();
  const password = parsed.data.password || generated!;
  await db.insert(users).values({ username, email, name, role, passwordHash: await hashPassword(password) });
  revalidatePath("/admin/users");
  return {
    success: `Đã tạo tài khoản ${username}.`,
    username,
    generatedPassword: generated,
  };
}

export async function updateUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Tài khoản không tồn tại." };
  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { error: "Tài khoản không tồn tại." };
  const { name, email, role, isActive } = parsed.data;
  const taken = await uniquenessErrors(null, email, id);
  if (Object.keys(taken).length) return { fields: taken };

  if (id === me.id && (role !== "admin" || !isActive)) {
    return { error: "Bạn không thể tự hạ quyền hoặc tự khoá tài khoản của mình." };
  }
  const losesAdmin = target.role === "admin" && target.isActive && (role !== "admin" || !isActive);
  if (losesAdmin && !(await hasOtherActiveAdmin(id))) {
    return { error: "Phải còn ít nhất một admin đang hoạt động." };
  }

  await db.update(users).set({ name, email, role, isActive, updatedAt: new Date() }).where(eq(users.id, id));
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

type ImportRowResult = { line: number; username: string };
export type ImportResult = {
  error?: string;
  created: (ImportRowResult & { name: string; email: string | null; role: string; password?: string })[];
  skipped: (ImportRowResult & { reason: string })[];
  errors: (ImportRowResult & { message: string })[];
};

/** `rows[i].line` là số dòng trong file CSV (để báo lỗi đúng chỗ). */
export async function importUsers(rows: (ImportRowInput & { line: number })[]): Promise<ImportResult> {
  await requireAdmin();
  const result: ImportResult = { created: [], skipped: [], errors: [] };
  if (!Array.isArray(rows) || rows.length === 0) return { ...result, error: "File không có dòng dữ liệu nào." };
  if (rows.length > MAX_IMPORT_ROWS) return { ...result, error: `Tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần import.` };

  type Valid = { line: number; username: string; email: string | null; name: string; role: "admin" | "user"; password: string; generated: boolean };
  const valid: Valid[] = [];
  const seenUsernames = new Set<string>();
  const seenEmails = new Set<string>();
  for (const raw of rows) {
    const line = Number(raw.line) || 0;
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      result.errors.push({ line, username: String(raw.username ?? ""), message: Object.values(fieldErrors(parsed.error)).join("; ") });
      continue;
    }
    const { username, email, name, role } = parsed.data;
    // Giữ dòng xuất hiện đầu tiên, các dòng trùng sau bị bỏ qua
    if (seenUsernames.has(username)) {
      result.skipped.push({ line, username, reason: "Trùng username trong file" });
      continue;
    }
    if (email && seenEmails.has(email)) {
      result.skipped.push({ line, username, reason: "Trùng email trong file" });
      continue;
    }
    seenUsernames.add(username);
    if (email) seenEmails.add(email);
    const generated = !parsed.data.password;
    valid.push({ line, username, email, name, role, password: parsed.data.password || generatePassword(), generated });
  }

  if (valid.length) {
    const emails = valid.flatMap((v) => (v.email ? [v.email] : []));
    const [byUsername, byEmail] = await Promise.all([
      db.select({ v: users.username }).from(users).where(inArray(users.username, valid.map((v) => v.username))),
      emails.length ? db.select({ v: users.email }).from(users).where(inArray(users.email, emails)) : Promise.resolve([]),
    ]);
    const takenUsernames = new Set(byUsername.map((r) => r.v));
    const takenEmails = new Set(byEmail.map((r) => r.v));
    const toCreate = valid.filter((v) => {
      const reason = takenUsernames.has(v.username) ? "Username đã tồn tại"
        : v.email && takenEmails.has(v.email) ? "Email đã được dùng cho tài khoản khác" : null;
      if (reason) result.skipped.push({ line: v.line, username: v.username, reason });
      return !reason;
    });

    if (toCreate.length) {
      const values = await Promise.all(
        toCreate.map(async (v) => ({
          username: v.username, email: v.email, name: v.name, role: v.role, passwordHash: await hashPassword(v.password),
        })),
      );
      // Một câu INSERT duy nhất. ON CONFLICT (không chỉ định cột) bỏ qua dòng vi phạm unique username hoặc email
      // nếu có tài khoản được tạo chen vào giữa chừng.
      const inserted = await db.insert(users).values(values).onConflictDoNothing().returning({ username: users.username });
      const insertedSet = new Set(inserted.map((i) => i.username));
      for (const v of toCreate) {
        if (insertedSet.has(v.username)) {
          result.created.push({
            line: v.line, username: v.username, name: v.name, email: v.email, role: v.role,
            password: v.generated ? v.password : undefined,
          });
        } else {
          result.skipped.push({ line: v.line, username: v.username, reason: "Username hoặc email đã tồn tại" });
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

/* ===== Hạn mức AI riêng ===== */

const optionalLimit = z.union([z.literal(""), z.coerce.number().int("Phải là số nguyên").min(0).max(5000)]);

export async function updateUserLimits(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Tài khoản không tồn tại." };
  const runs = optionalLimit.safeParse(String(formData.get("runs") ?? "").trim());
  const regens = optionalLimit.safeParse(String(formData.get("regens") ?? "").trim());
  if (!runs.success || !regens.success) return { error: "Hạn mức phải là số nguyên từ 0 đến 5000 (hoặc để trống)." };
  await db
    .update(users)
    .set({
      aiRunsPerDay: runs.data === "" ? null : runs.data,
      aiRegensPerDay: regens.data === "" ? null : regens.data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
  revalidatePath(`/admin/users/${id}`);
  return { success: "Đã lưu hạn mức riêng." };
}
