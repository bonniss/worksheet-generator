import "server-only";
import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { aiCalls, users } from "@/db/schema";
import { dayStart, TZ } from "./usage";

export type Range = "today" | "7d" | "30d";
export const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
];

const since = (r: Range): SQL =>
  r === "today" ? dayStart : sql`${dayStart} - make_interval(days => ${r === "7d" ? 6 : 29})`;

/** Chỉ số tổng trong khoảng thời gian. */
export async function kpis(range: Range) {
  const [row] = await db
    .select({
      calls: sql<number>`count(*)::int`,
      runs: sql<number>`count(distinct ${aiCalls.runId}) filter (where ${aiCalls.purpose} = 'structure' and ${aiCalls.status} = 'ok')::int`,
      regens: sql<number>`count(distinct ${aiCalls.runId}) filter (where ${aiCalls.purpose} like 'regen%' and ${aiCalls.status} = 'ok')::int`,
      errors: sql<number>`count(*) filter (where ${aiCalls.status} = 'error')::int`,
      blocked: sql<number>`count(*) filter (where ${aiCalls.status} = 'blocked')::int`,
      inTok: sql<number>`coalesce(sum(${aiCalls.inputTokens}), 0)::bigint`,
      outTok: sql<number>`coalesce(sum(${aiCalls.outputTokens}), 0)::bigint`,
      cacheRead: sql<number>`coalesce(sum(${aiCalls.cacheReadTokens}), 0)::bigint`,
      cacheWrite: sql<number>`coalesce(sum(${aiCalls.cacheWriteTokens}), 0)::bigint`,
      usd: sql<string>`coalesce(sum(${aiCalls.costUsd}), 0)`,
      avgMs: sql<number | null>`avg(${aiCalls.durationMs}) filter (where ${aiCalls.status} = 'ok')`,
      users: sql<number>`count(distinct ${aiCalls.userId})::int`,
    })
    .from(aiCalls)
    .where(gte(aiCalls.createdAt, since(range)));
  const n = (v: unknown) => Number(v ?? 0);
  const promptTok = n(row.inTok) + n(row.cacheRead) + n(row.cacheWrite);
  const attempted = n(row.calls) - n(row.blocked);
  return {
    calls: n(row.calls), runs: n(row.runs), regens: n(row.regens), users: n(row.users),
    errors: n(row.errors), blocked: n(row.blocked),
    errorRate: attempted ? n(row.errors) / attempted : 0,
    inTok: n(row.inTok), outTok: n(row.outTok),
    cacheHit: promptTok ? n(row.cacheRead) / promptTok : 0,
    usd: n(row.usd), avgMs: row.avgMs === null ? null : n(row.avgMs),
  };
}

/** Chi phí + số lượt gọi theo ngày (giờ VN), đủ 30 ngày kể cả ngày trống. */
export async function dailyCost(days = 30) {
  const tz = sql.raw(`'${TZ}'`);
  const rows = await db.execute<{ day: string; usd: string; calls: number }>(sql`
    with d as (
      select generate_series(
        (now() at time zone ${tz})::date - (${days - 1})::int,
        (now() at time zone ${tz})::date,
        interval '1 day'
      )::date as day
    )
    select to_char(d.day, 'YYYY-MM-DD') as day,
           coalesce(sum(c.cost_usd), 0) as usd,
           count(c.id)::int as calls
    from d
    left join ai_calls c on (c.created_at at time zone ${tz})::date = d.day
    group by d.day
    order by d.day`);
  return rows.rows.map((r) => ({ day: r.day, usd: Number(r.usd), calls: Number(r.calls) }));
}

/** Thống kê theo người dùng (30 ngày) + lượt hôm nay. */
export async function perUser() {
  const rows = await db
    .select({
      id: users.id, name: users.name, username: users.username, role: users.role,
      runsLimit: users.aiRunsPerDay, regensLimit: users.aiRegensPerDay,
      runsToday: sql<number>`count(distinct ${aiCalls.runId}) filter (where ${aiCalls.purpose} = 'structure' and ${aiCalls.status} = 'ok' and ${aiCalls.createdAt} >= ${dayStart})::int`,
      regensToday: sql<number>`count(distinct ${aiCalls.runId}) filter (where ${aiCalls.purpose} like 'regen%' and ${aiCalls.status} = 'ok' and ${aiCalls.createdAt} >= ${dayStart})::int`,
      runs30: sql<number>`count(distinct ${aiCalls.runId}) filter (where ${aiCalls.purpose} = 'structure' and ${aiCalls.status} = 'ok')::int`,
      calls30: sql<number>`count(${aiCalls.id})::int`,
      errors30: sql<number>`count(${aiCalls.id}) filter (where ${aiCalls.status} = 'error')::int`,
      usd30: sql<string>`coalesce(sum(${aiCalls.costUsd}), 0)`,
      lastAt: sql<string | null>`max(${aiCalls.createdAt})`,
    })
    .from(users)
    .leftJoin(aiCalls, and(eq(aiCalls.userId, users.id), gte(aiCalls.createdAt, sql`now() - interval '30 days'`)))
    .groupBy(users.id)
    .orderBy(sql`coalesce(sum(${aiCalls.costUsd}), 0) desc`, users.name);
  return rows.map((r) => ({ ...r, usd30: Number(r.usd30), lastAt: r.lastAt ? new Date(r.lastAt) : null }));
}

export type CallFilters = { user?: string; model?: string; status?: string; purpose?: string };

/** Danh sách lượt gọi chi tiết (thông số kỹ thuật), mới nhất trước. */
export async function recentCalls(f: CallFilters, page: number, pageSize: number) {
  const conds: (SQL | undefined)[] = [
    f.user ? eq(aiCalls.userId, f.user) : undefined,
    f.model ? eq(aiCalls.model, f.model) : undefined,
    f.status ? eq(aiCalls.status, f.status) : undefined,
    f.purpose ? eq(aiCalls.purpose, f.purpose) : undefined,
  ];
  const where = and(...conds);
  const [rows, [{ total }], models] = await Promise.all([
    db
      .select({
        id: aiCalls.id, createdAt: aiCalls.createdAt, purpose: aiCalls.purpose, model: aiCalls.model, status: aiCalls.status,
        errorType: aiCalls.errorType, httpStatus: aiCalls.httpStatus, stopReason: aiCalls.stopReason,
        inputTokens: aiCalls.inputTokens, outputTokens: aiCalls.outputTokens,
        cacheReadTokens: aiCalls.cacheReadTokens, cacheWriteTokens: aiCalls.cacheWriteTokens,
        maxTokens: aiCalls.maxTokens, promptChars: aiCalls.promptChars,
        durationMs: aiCalls.durationMs, ttftMs: aiCalls.ttftMs, costUsd: aiCalls.costUsd, requestId: aiCalls.requestId,
        level: aiCalls.level, runId: aiCalls.runId, worksheetId: aiCalls.worksheetId,
        userName: users.name, username: users.username,
      })
      .from(aiCalls)
      .leftJoin(users, eq(aiCalls.userId, users.id))
      .where(where)
      .orderBy(desc(aiCalls.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(aiCalls).where(where),
    db.selectDistinct({ model: aiCalls.model }).from(aiCalls).orderBy(aiCalls.model),
  ]);
  return { rows, total, models: models.map((m) => m.model) };
}
