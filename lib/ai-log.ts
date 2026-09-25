import "server-only";
import { db } from "@/db";
import { aiCalls } from "@/db/schema";

export type AiCallRow = typeof aiCalls.$inferInsert;

/** Ghi nhật ký một lượt gọi AI. Không bao giờ throw — lỗi ghi log không được làm hỏng lượt gọi. */
export async function logAiCall(row: AiCallRow): Promise<void> {
  try {
    await db.insert(aiCalls).values(row);
  } catch (e) {
    console.error("[ai-log] ghi nhật ký thất bại:", e instanceof Error ? e.message : e);
  }
}
