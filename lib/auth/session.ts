import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { SESSION_COOKIE } from "./constants";

const DAY = 24 * 60 * 60 * 1000;
const SESSION_TTL = 30 * DAY;
const RENEW_BEFORE = 15 * DAY;

export type SessionUser = Pick<User, "id" | "username" | "email" | "name" | "role">;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function setCookie(token: string, expiresAt: Date) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  setCookie(token, expiresAt);
}

export async function deleteCurrentSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  cookies().delete(SESSION_COOKIE);
}

/** Xoá mọi session của user (khi khoá, đổi role, reset mật khẩu). `keepCurrent` giữ lại phiên đang dùng. */
export async function revokeUserSessions(userId: string, keepCurrent = false): Promise<void> {
  const token = keepCurrent ? cookies().get(SESSION_COOKIE)?.value : undefined;
  await db
    .delete(sessions)
    .where(token ? and(eq(sessions.userId, userId), ne(sessions.id, hashToken(token))) : eq(sessions.userId, userId));
}

/** User của request hiện tại, hoặc null. Cache theo request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = hashToken(token);
  const [row] = await db
    .select({
      id: users.id, username: users.username, email: users.email, name: users.name, role: users.role,
      isActive: users.isActive, expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.isActive) return null;

  // Gia hạn trượt. Chỉ ghi cookie được trong server action / route handler, nên bỏ qua lỗi khi đang render.
  if (row.expiresAt.getTime() - Date.now() < RENEW_BEFORE) {
    const expiresAt = new Date(Date.now() + SESSION_TTL);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    try { setCookie(token, expiresAt); } catch { /* đang render server component */ }
  }
  return { id: row.id, username: row.username, email: row.email, name: row.name, role: row.role };
});

/** Dùng trong page/layout/server action: chưa đăng nhập → /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Dùng trong page/layout/server action: không phải admin → 404. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
