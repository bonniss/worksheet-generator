import { boolean, customType, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { SavedProject } from "@/lib/worksheet/types";

export const roleEnum = pgEnum("role", ["admin", "user"]);
// private: chỉ chủ sở hữu (và admin); public: mọi người trong hệ thống xem/in/nhân bản được
export const visibilityEnum = pgEnum("visibility", ["private", "public"]);
export type Visibility = (typeof visibilityEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Định danh đăng nhập: a-z 0-9 . _ - (3–32 ký tự), luôn chữ thường
  username: text("username").notNull().unique(),
  // Tuỳ chọn; nếu có thì cũng dùng để đăng nhập được
  email: text("email").unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  // Hạn mức AI riêng (null = dùng mặc định hệ thống trong app_settings)
  aiRunsPerDay: integer("ai_runs_per_day"),
  aiRegensPerDay: integer("ai_regens_per_day"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    // sha256(token) — token thật chỉ nằm trong cookie
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const worksheets = pgTable(
  "worksheets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    level: text("level").notNull(),
    type: text("type").notNull(),
    topic: text("topic").notNull().default(""),
    data: jsonb("data").$type<SavedProject>().notNull(),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("worksheets_owner_id_idx").on(t.ownerId),
    index("worksheets_updated_at_idx").on(t.updatedAt),
    index("worksheets_visibility_updated_idx").on(t.visibility, t.updatedAt),
  ],
);

// Cấu hình hệ thống dạng key/value (model AI, API key đã mã hoá...) — đổi được lúc chạy, không cần deploy lại
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

const bytea = customType<{ data: Buffer; driverData: Buffer | string }>({
  dataType: () => "bytea",
  // neon-http trả bytea dạng chuỗi hex "\x..."
  fromDriver: (v) => (Buffer.isBuffer(v) ? v : Buffer.from(String(v).replace(/^\\x/, ""), "hex")),
  toDriver: (v) => v,
});

// Ảnh chèn vào worksheet: lưu riêng (mỗi ảnh một request) để payload worksheet không vượt giới hạn 4.5MB của Vercel.
// Worksheet chỉ giữ đường dẫn /api/images/<id>.
export const worksheetImages = pgTable(
  "worksheet_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    bytes: bytea("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("worksheet_images_owner_id_idx").on(t.ownerId)],
);

// Nhật ký từng lượt gọi AI (qua /api/claude): thông số kỹ thuật + usage + chi phí ước tính.
// `run_id` gom các lượt thuộc cùng một lần bấm "Tạo worksheet" / "Gen lại".
export const aiCalls = pgTable(
  "ai_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    runId: uuid("run_id"),
    purpose: text("purpose").notNull(), // structure | learn | exercise | regen_exercise | regen_learn
    worksheetId: uuid("worksheet_id").references(() => worksheets.id, { onDelete: "set null" }),
    level: text("level"),
    type: text("type"),
    model: text("model").notNull(),
    maxTokens: integer("max_tokens").notNull(),
    promptChars: integer("prompt_chars").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cacheReadTokens: integer("cache_read_tokens"),
    cacheWriteTokens: integer("cache_write_tokens"),
    stopReason: text("stop_reason"),
    durationMs: integer("duration_ms"),
    ttftMs: integer("ttft_ms"), // time to first token
    status: text("status").notNull(), // ok | error | blocked
    errorType: text("error_type"),
    httpStatus: integer("http_status"),
    requestId: text("request_id"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ai_calls_user_created_idx").on(t.userId, t.createdAt),
    index("ai_calls_created_idx").on(t.createdAt),
    index("ai_calls_run_idx").on(t.runId),
  ],
);

export type User = typeof users.$inferSelect;
export type Worksheet = typeof worksheets.$inferSelect;
