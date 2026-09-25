import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiCalls, users } from "@/db/schema";
import type { SessionUser } from "./auth/session";
import { getAiLimits } from "./settings";
import type { AiPurpose } from "./worksheet/ai-purposes";

export const TZ = "Asia/Ho_Chi_Minh";
/** 0h hôm nay theo giờ Việt Nam (timestamptz) — hạn mức làm mới mỗi ngày tại đây. */
export const dayStart = sql`(date_trunc('day', now() AT TIME ZONE ${sql.raw(`'${TZ}'`)}) AT TIME ZONE ${sql.raw(`'${TZ}'`)})`;

const REGEN_PURPOSES: AiPurpose[] = ["regen_exercise", "regen_learn"];

/** Số lượt (run) đã dùng hôm nay của user cho nhóm purpose, và run hiện tại đã được tính chưa. */
async function runsToday(userId: string, purposes: AiPurpose[], runId?: string) {
  const [row] = await db
    .select({
      used: sql<number>`count(distinct ${aiCalls.runId})::int`,
      sameRun: runId ? sql<boolean>`coalesce(bool_or(${aiCalls.runId} = ${runId}), false)` : sql<boolean>`false`,
    })
    .from(aiCalls)
    .where(and(eq(aiCalls.userId, userId), inArray(aiCalls.purpose, purposes), eq(aiCalls.status, "ok"), gte(aiCalls.createdAt, dayStart)));
  return { used: row?.used ?? 0, sameRun: !!row?.sameRun };
}

/**
 * Lượt gen lại hôm nay: các run regen_*, cộng các run learn/exercise "mồ côi"
 * (không thuộc lượt tạo hợp lệ nào — gọi thẳng API để lách hạn mức).
 */
async function regenRunsToday(userId: string, runId?: string) {
  const orphan = sql`(${aiCalls.purpose} in ('learn', 'exercise') and not exists (
    select 1 from ai_calls s where s.run_id = ${aiCalls.runId} and s.purpose = 'structure' and s.status = 'ok'))`;
  const [row] = await db
    .select({
      used: sql<number>`count(distinct ${aiCalls.runId})::int`,
      sameRun: runId ? sql<boolean>`coalesce(bool_or(${aiCalls.runId} = ${runId}), false)` : sql<boolean>`false`,
    })
    .from(aiCalls)
    .where(and(
      eq(aiCalls.userId, userId), eq(aiCalls.status, "ok"), gte(aiCalls.createdAt, dayStart),
      sql`(${inArray(aiCalls.purpose, REGEN_PURPOSES)} or ${orphan})`,
    ));
  return { used: row?.used ?? 0, sameRun: !!row?.sameRun };
}

export async function systemCostToday(): Promise<number> {
  const [row] = await db
    .select({ usd: sql<string>`coalesce(sum(${aiCalls.costUsd}), 0)` })
    .from(aiCalls)
    .where(gte(aiCalls.createdAt, dayStart));
  return Number(row?.usd ?? 0);
}

async function userLimits(userId: string) {
  const [defaults, [u]] = await Promise.all([
    getAiLimits(),
    db.select({ runs: users.aiRunsPerDay, regens: users.aiRegensPerDay }).from(users).where(eq(users.id, userId)).limit(1),
  ]);
  return {
    runsPerDay: u?.runs ?? defaults.runsPerDay,
    regensPerDay: u?.regens ?? defaults.regensPerDay,
    systemUsdPerDay: defaults.systemUsdPerDay,
    custom: { runs: u?.runs ?? null, regens: u?.regens ?? null },
    defaults: { runs: defaults.runsPerDay, regens: defaults.regensPerDay },
  };
}

export type QuotaResult = { ok: true } | { ok: false; message: string };

/**
 * Kiểm tra hạn mức trước một lượt gọi AI. Admin không bị giới hạn.
 * - structure = bắt đầu một lượt tạo worksheet mới; learn/exercise thuộc lượt tạo đó không tính thêm.
 * - learn/exercise mà runId không gắn với lượt tạo hợp lệ hôm nay → tính như một lượt gen lại (chống lách hạn mức).
 * - Trần chi phí toàn hệ thống chặn mọi người (trừ admin).
 */
export async function checkQuota(user: SessionUser, purpose: AiPurpose, runId: string): Promise<QuotaResult> {
  if (user.role === "admin") return { ok: true };
  const limits = await userLimits(user.id);

  if (limits.systemUsdPerDay !== null && (await systemCostToday()) >= limits.systemUsdPerDay) {
    return { ok: false, message: "Hệ thống đã dùng hết ngân sách AI của hôm nay. Vui lòng thử lại vào ngày mai hoặc liên hệ quản trị viên." };
  }

  let kind: "run" | "regen" = REGEN_PURPOSES.includes(purpose) ? "regen" : "run";
  if (purpose === "learn" || purpose === "exercise") {
    const { sameRun } = await runsToday(user.id, ["structure"], runId);
    if (sameRun) return { ok: true };
    kind = "regen";
  }

  if (kind === "run") {
    const { used, sameRun } = await runsToday(user.id, ["structure"], runId);
    if (sameRun || used < limits.runsPerDay) return { ok: true };
    return { ok: false, message: `Bạn đã dùng hết ${limits.runsPerDay} lượt tạo worksheet hôm nay. Hạn mức được làm mới lúc 0h. Cần thêm thì liên hệ quản trị viên.` };
  }
  const { used, sameRun } = await regenRunsToday(user.id, runId);
  if (sameRun || used < limits.regensPerDay) return { ok: true };
  return { ok: false, message: `Bạn đã dùng hết ${limits.regensPerDay} lượt gen lại hôm nay. Hạn mức được làm mới lúc 0h. Cần thêm thì liên hệ quản trị viên.` };
}

/** Mức sử dụng hôm nay của một user (hiển thị ở hồ sơ / chi tiết tài khoản). */
export async function userUsageToday(userId: string) {
  const [limits, runs, regens] = await Promise.all([
    userLimits(userId),
    runsToday(userId, ["structure"]),
    regenRunsToday(userId),
  ]);
  return { runs: runs.used, regens: regens.used, ...limits };
}

/** Tổng lượt gọi + chi phí của user trong N ngày gần nhất. */
export async function userTotals(userId: string, days = 30) {
  const [row] = await db
    .select({
      calls: sql<number>`count(*)::int`,
      runs: sql<number>`count(distinct ${aiCalls.runId}) filter (where ${aiCalls.purpose} = 'structure' and ${aiCalls.status} = 'ok')::int`,
      usd: sql<string>`coalesce(sum(${aiCalls.costUsd}), 0)`,
      lastAt: sql<Date | null>`max(${aiCalls.createdAt})`,
    })
    .from(aiCalls)
    .where(and(eq(aiCalls.userId, userId), gte(aiCalls.createdAt, sql`now() - make_interval(days => ${days})`)));
  return { calls: row?.calls ?? 0, runs: row?.runs ?? 0, usd: Number(row?.usd ?? 0), lastAt: row?.lastAt ? new Date(row.lastAt) : null };
}

export function formatUsd(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "$0";
  return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}
