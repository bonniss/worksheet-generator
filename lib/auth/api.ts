import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "./session";

/** Cho route handler: trả user hoặc response 401 dựng sẵn. */
export async function apiUser(): Promise<{ user: SessionUser; error?: never } | { user?: never; error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError(401, "Chưa đăng nhập") };
  return { user };
}

// Cùng dạng lỗi với Anthropic API để client (callClaudeRaw) đọc được message
export function jsonError(status: number, message: string) {
  return NextResponse.json({ type: "error", error: { message } }, { status });
}
