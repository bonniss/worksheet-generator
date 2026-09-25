import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Badge, Card, CardTitle, EmptyRow, Page, PageHeader, Select, Td, Th, buttonClass, cx } from "@/components/ui";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdmin } from "@/lib/auth/session";
import { getAiLimits } from "@/lib/settings";
import { formatUsd } from "@/lib/usage";
import { dailyCost, kpis, perUser, RANGES, recentCalls, type Range } from "@/lib/usage-stats";
import { isUuid } from "@/lib/validators";
import { AI_PURPOSES } from "@/lib/worksheet/ai-purposes";
import { CostChart } from "./CostChart";

export const metadata = { title: "Thống kê AI" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
type Search = { range?: string; user?: string; model?: string; status?: string; purpose?: string; page?: string };

const PURPOSE_LABEL: Record<string, string> = {
  structure: "Khung", learn: "Learn", exercise: "Bài tập", regen_exercise: "Gen lại bài", regen_learn: "Gen lại Learn",
};
const STATUS_TONE = { ok: "success", error: "danger", blocked: "warning" } as const;
const STATUS_LABEL: Record<string, string> = { ok: "OK", error: "Lỗi", blocked: "Bị chặn" };

const compact = (n: number) => new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const pct = (v: number) => `${(v * 100).toFixed(v > 0 && v < 0.1 ? 1 : 0)}%`;
const secs = (ms: number | null) => (ms === null ? "—" : ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "danger" | "warning" }) {
  return (
    <div className="rounded-lg border border-solid border-zinc-100 bg-white px-4 py-3.5 shadow-subtle">
      <div className="text-caption text-zinc-500">{label}</div>
      <div className={cx("mt-1 font-display text-2xl font-bold", tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-zinc-900")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export default async function UsagePage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const range: Range = RANGES.some((r) => r.key === searchParams.range) ? (searchParams.range as Range) : "today";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const filters = {
    user: searchParams.user && isUuid(searchParams.user) ? searchParams.user : undefined,
    model: searchParams.model?.slice(0, 100) || undefined,
    status: ["ok", "error", "blocked"].includes(searchParams.status ?? "") ? searchParams.status : undefined,
    purpose: (AI_PURPOSES as readonly string[]).includes(searchParams.purpose ?? "") ? searchParams.purpose : undefined,
  };
  const [k, daily, people, calls, limits] = await Promise.all([
    kpis(range), dailyCost(30), perUser(), recentCalls(filters, page, PAGE_SIZE), getAiLimits(),
  ]);
  const filtered = Object.values(filters).some(Boolean);
  const rangeHref = (r: Range) => {
    const sp = new URLSearchParams(Object.entries(searchParams).filter(([key, v]) => v && key !== "range" && key !== "page") as [string, string][]);
    if (r !== "today") sp.set("range", r);
    const s = sp.toString();
    return s ? `?${s}` : "?";
  };

  return (
    <Page>
      <PageHeader
        title="Thống kê AI"
        sub="Lượt dùng, token và chi phí ước tính của mọi lượt gọi AI."
        actions={<Link href="/admin/settings" className={buttonClass("secondary")}><Settings2 size={16} /> Hạn mức & cấu hình</Link>}
      />

      <nav className="mb-4 inline-flex rounded-lg bg-zinc-100 p-1" aria-label="Khoảng thời gian">
        {RANGES.map((r) => (
          <Link
            key={r.key} href={rangeHref(r.key)} scroll={false} aria-current={range === r.key ? "page" : undefined}
            className={cx("rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors", range === r.key ? "bg-white text-zinc-900 shadow-subtle" : "text-zinc-500 hover:text-zinc-800")}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile label="Lượt tạo worksheet" value={compact(k.runs)} sub={`${compact(k.regens)} lượt gen lại · ${k.users} người`} />
        <Tile label="Lượt gọi AI" value={compact(k.calls)} sub={k.blocked ? `${k.blocked} bị chặn do hạn mức` : "Không có lượt bị chặn"} />
        <Tile label="Token vào / ra" value={`${compact(k.inTok)} / ${compact(k.outTok)}`} sub="không tính phần cache" />
        <Tile label="Chi phí ước tính" value={formatUsd(k.usd)} sub={limits.systemUsdPerDay ? `Trần/ngày ${formatUsd(limits.systemUsdPerDay)}` : "Không đặt trần/ngày"} />
        <Tile label="Tỉ lệ lỗi" value={pct(k.errorRate)} sub={`${k.errors} lượt lỗi`} tone={k.errorRate > 0.1 ? "danger" : k.errorRate > 0.03 ? "warning" : undefined} />
        <Tile label="Dùng lại cache" value={pct(k.cacheHit)} sub={`Thời gian TB ${secs(k.avgMs)}`} />
      </div>

      <Card className="mb-6">
        <CardTitle title="Chi phí theo ngày" sub={`30 ngày gần nhất · tổng ${formatUsd(daily.reduce((s, d) => s + d.usd, 0))}`} />
        <CostChart data={daily} />
      </Card>

      <Card flush className="mb-6 overflow-hidden">
        <div className="px-6 pt-6"><CardTitle title="Theo người dùng" sub={`Hạn mức mặc định: ${limits.runsPerDay} lượt tạo, ${limits.regensPerDay} lượt gen lại mỗi ngày.`} /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><Th>Người dùng</Th><Th className="text-right">Tạo hôm nay</Th><Th className="text-right">Gen lại hôm nay</Th><Th className="text-right">Tạo 30 ngày</Th><Th className="text-right">Lỗi 30 ngày</Th><Th className="text-right">Chi phí 30 ngày</Th><Th>Dùng gần nhất</Th></tr></thead>
            <tbody className="tabular-nums">
              {people.map((p) => {
                const admin = p.role === "admin";
                const runLimit = p.runsLimit ?? limits.runsPerDay;
                const regenLimit = p.regensLimit ?? limits.regensPerDay;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <Td>
                      <Link href={`/admin/users/${p.id}`} className="font-medium text-zinc-900 hover:text-primary">{p.name}</Link>
                      <div className="text-xs text-zinc-500">
                        <span className="font-mono">@{p.username}</span>
                        {admin && <span className="whitespace-nowrap"> · không giới hạn</span>}
                        {!admin && (p.runsLimit !== null || p.regensLimit !== null) && <span className="whitespace-nowrap"> · hạn mức riêng</span>}
                      </div>
                    </Td>
                    <Td className={cx("text-right", !admin && p.runsToday >= runLimit && "font-semibold text-danger")}>{p.runsToday}{!admin && <span className="text-zinc-400"> / {runLimit}</span>}</Td>
                    <Td className={cx("text-right", !admin && p.regensToday >= regenLimit && "font-semibold text-danger")}>{p.regensToday}{!admin && <span className="text-zinc-400"> / {regenLimit}</span>}</Td>
                    <Td className="text-right">{p.runs30}</Td>
                    <Td className="text-right">{p.errors30 || <span className="text-zinc-300">0</span>}</Td>
                    <Td className="text-right font-medium">{formatUsd(p.usd30)}</Td>
                    <Td className="whitespace-nowrap text-zinc-500">
                      {p.lastAt ? p.lastAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      {" "}<Link href={`?user=${p.id}#calls`} scroll={false} className="text-xs text-primary hover:underline">xem lượt gọi</Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <section id="calls" className="scroll-mt-6">
        <h2 className="mb-3 font-display text-base font-semibold text-zinc-900">Lượt gọi chi tiết <span className="font-sans text-sm font-normal text-zinc-500">· {calls.total.toLocaleString("vi-VN")} lượt</span></h2>
        <FilterBar filtered={filtered}>
          <Select name="user" defaultValue={filters.user ?? ""} className="w-52">
            <option value="">Mọi người dùng</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} (@{p.username})</option>)}
          </Select>
          <Select name="purpose" defaultValue={filters.purpose ?? ""} className="w-40">
            <option value="">Mọi loại</option>
            {AI_PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>)}
          </Select>
          <Select name="status" defaultValue={filters.status ?? ""} className="w-36">
            <option value="">Mọi trạng thái</option>
            <option value="ok">OK</option><option value="error">Lỗi</option><option value="blocked">Bị chặn</option>
          </Select>
          <Select name="model" defaultValue={filters.model ?? ""} className="w-48">
            <option value="">Mọi model</option>
            {calls.models.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </FilterBar>
        <Card flush className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <Th>Thời điểm</Th><Th>Người</Th><Th>Loại</Th><Th>Model</Th><Th>Trạng thái</Th>
                  <Th className="text-right">Token vào</Th><Th className="text-right">Token ra</Th><Th className="text-right">Cache đọc/ghi</Th>
                  <Th className="text-right">Đầu tiên / Tổng</Th><Th className="text-right">Chi phí</Th><Th>Request ID</Th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {calls.rows.length === 0 && <EmptyRow colSpan={11}>{filtered ? "Không có lượt gọi khớp bộ lọc." : "Chưa có lượt gọi nào."}</EmptyRow>}
                {calls.rows.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <Td className="h-12 whitespace-nowrap text-zinc-600">{c.createdAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium" })}</Td>
                    <Td className="h-12 whitespace-nowrap">{c.userName ?? <span className="text-zinc-400">—</span>}</Td>
                    <Td className="h-12 whitespace-nowrap">{PURPOSE_LABEL[c.purpose] ?? c.purpose}{c.level && <span className="text-zinc-400"> · {c.level}</span>}</Td>
                    <Td className="h-12 whitespace-nowrap font-mono text-xs">{c.model}</Td>
                    <Td className="h-12 whitespace-nowrap">
                      <Badge tone={STATUS_TONE[c.status as keyof typeof STATUS_TONE] ?? "neutral"} dot>{STATUS_LABEL[c.status] ?? c.status}</Badge>
                      {c.status === "ok" && c.stopReason && c.stopReason !== "end_turn" && <div className="mt-0.5 text-xs text-warning">stop: {c.stopReason}</div>}
                      {c.errorType && <div className="mt-0.5 font-mono text-xs text-zinc-500">{c.errorType}{c.httpStatus ? ` · ${c.httpStatus}` : ""}</div>}
                    </Td>
                    <Td className="h-12 text-right">{c.inputTokens?.toLocaleString("vi-VN") ?? "—"}</Td>
                    <Td className="h-12 text-right">{c.outputTokens?.toLocaleString("vi-VN") ?? "—"}<div className="text-xs text-zinc-400">/ {c.maxTokens.toLocaleString("vi-VN")}</div></Td>
                    <Td className="h-12 text-right text-zinc-600">{c.cacheReadTokens ?? 0} / {c.cacheWriteTokens ?? 0}</Td>
                    <Td className="h-12 whitespace-nowrap text-right text-zinc-600">{secs(c.ttftMs)} / {secs(c.durationMs)}</Td>
                    <Td className="h-12 text-right font-medium">{formatUsd(c.costUsd === null ? null : Number(c.costUsd))}</Td>
                    <Td className="h-12 max-w-[160px] truncate font-mono text-xs text-zinc-500" title={c.requestId ?? undefined}>{c.requestId ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={calls.total} pageSize={PAGE_SIZE} searchParams={searchParams} />
        </Card>
      </section>
    </Page>
  );
}
