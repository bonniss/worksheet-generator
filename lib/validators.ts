import { z } from "zod";
import { USERNAME_HINT, USERNAME_RE } from "./username";

export { USERNAME_HINT, USERNAME_RE };

export const ROLES = ["admin", "user"] as const;

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_RE, `Username không hợp lệ (${USERNAME_HINT})`);
const email = z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ"));
// Trống → null
const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .pipe(z.union([z.null(), email]));
const name = z.string().trim().min(1, "Tên không được trống").max(100, "Tên tối đa 100 ký tự");
export const password = z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128, "Mật khẩu tối đa 128 ký tự");

export const loginSchema = z.object({
  // username hoặc email
  identifier: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1, "Nhập mật khẩu"),
});

export const createUserSchema = z.object({
  username,
  email: optionalEmail,
  name,
  role: z.enum(ROLES),
  // trống → tự sinh
  password: z.union([z.literal(""), password]).optional(),
});

export const updateUserSchema = z.object({
  name,
  email: optionalEmail,
  role: z.enum(ROLES),
  isActive: z.boolean(),
});

export const profileSchema = z.object({ name });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

export const importRowSchema = z.object({
  username,
  name,
  email: optionalEmail,
  role: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v || "user")
    .pipe(z.enum(ROLES, "Role phải là admin hoặc user")),
  password: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || "")
    .pipe(z.union([z.literal(""), password])),
});
export type ImportRowInput = z.input<typeof importRowSchema>;
// bcryptjs chạy trên 1 luồng (~60ms/hash) — giữ import dưới giới hạn 60s của serverless
export const MAX_IMPORT_ROWS = 500;

// Chỉ kiểm tra khung ngoài; nội dung worksheet do client tạo, lưu nguyên dạng jsonb.
export const worksheetPayloadSchema = z.object({
  data: z
    .object({
      _type: z.literal("flyer-worksheet"),
      version: z.literal(1),
      savedAt: z.string(),
      cfg: z.object({ type: z.string(), topic: z.string(), level: z.string() }).passthrough(),
      themeOverride: z.string().nullable(),
      ws: z.object({ title: z.string().optional() }).passthrough(),
    })
    .passthrough(),
});

/** Gom lỗi zod thành { field: message } cho form. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Tránh lỗi cast của Postgres khi id trên URL không phải uuid. */
export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}
