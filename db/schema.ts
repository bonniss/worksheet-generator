import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { SavedProject } from "@/lib/worksheet/types";

export const roleEnum = pgEnum("role", ["admin", "user"]);
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("worksheets_owner_id_idx").on(t.ownerId), index("worksheets_updated_at_idx").on(t.updatedAt)],
);

export type User = typeof users.$inferSelect;
export type Worksheet = typeof worksheets.$inferSelect;
